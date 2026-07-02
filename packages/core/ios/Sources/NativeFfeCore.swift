/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#if canImport(CommonCrypto)
    import CommonCrypto
#endif
import Foundation

internal final class NativeFfeCore {
    private var activeConfiguration: NativeFlagsConfiguration?
    private var currentContext: [String: Any] = [:]
    private var status = Status.notReady
    private var configurationSetCount = 0
    private var configurationSaveCount = 0
    private var configurationLoadCount = 0
    private var fetchCount = 0
    private var evaluationCount = 0
    private var lastEvent: String?
    private var lastFetchRequest: [String: Any]?
    private var lastStorage: [String: Any]?
    private var lastError: String?
    private var evaluationDateOverride: Date?

    func configurationFromString(_ wire: String) throws -> NativeFlagsConfiguration {
        let wireJson = try parseJSONObject(wire)
        let version = intValue(wireJson["version"]) ?? 0
        guard version == Constants.supportedWireVersion else {
            throw NativeFfeCoreError.invalidConfigurationWire(
                "Unsupported ConfigurationWire version: \(version)"
            )
        }

        let server = dictionaryValue(wireJson["server"])
        let precomputed = dictionaryValue(wireJson["precomputed"])
        guard server != nil || precomputed != nil else {
            throw NativeFfeCoreError.invalidConfigurationWire(
                "ConfigurationWire must include server or precomputed config"
            )
        }

        let serverResponse = try server.flatMap { try parseOptionalResponse($0["response"]) }
        let precomputedResponse = try precomputed.flatMap {
            try parseOptionalResponse($0["response"])
        }
        let kind: String
        if server != nil, precomputed != nil {
            kind = ConfigurationKind.mixed
        } else if server != nil {
            kind = ConfigurationKind.rules
        } else {
            kind = ConfigurationKind.precomputed
        }
        let etag = nonEmptyString(server?["etag"]) ?? nonEmptyString(precomputed?["etag"])

        return NativeFlagsConfiguration(
            wire: wire,
            version: version,
            kind: kind,
            etag: etag,
            serverResponse: serverResponse,
            precomputedResponse: precomputedResponse,
            serverFlags: flagsObject(serverResponse).map(nativeFlags)
        )
    }

    func configurationToString(_ configuration: [String: Any]) throws -> String {
        guard let wire = configuration[Constants.wireKey] as? String else {
            throw NativeFfeCoreError.invalidConfigurationWire("FlagsConfiguration is missing wire")
        }
        return wire
    }

    func fetchConfiguration(
        kind: String,
        options: [String: Any],
        fetcher: NativeFfeConfigurationFetcher
    ) throws -> NativeFlagsConfiguration {
        fetchCount += 1
        do {
            let fetched = try fetcher.fetch(kind: kind, options: options)
            lastFetchRequest = fetched.request.toDebugMap(statusCode: fetched.statusCode)
            lastError = nil
            return try configurationFromString(fetched.wire)
        } catch let error as NativeFfeConfigurationFetchError {
            lastFetchRequest = error.request.toDebugMap()
            markProviderError(error)
            throw error
        } catch {
            markProviderError(error)
            throw error
        }
    }

    func saveConfiguration(
        _ configuration: [String: Any],
        options: [String: Any],
        store: NativeFfeConfigurationStoring
    ) throws -> [String: Any] {
        configurationSaveCount += 1
        do {
            let wire = try configurationToString(configuration)
            let stored = try store.save(slot: storageSlot(options), wire: wire)
            lastStorage = stored.toDebugMap(operation: Operation.save)
            lastError = nil
            return debugState()
        } catch {
            lastStorage = [
                "operation": Operation.save,
                "status": StorageStatus.failed,
            ]
            markProviderError(error)
            throw error
        }
    }

    func loadConfiguration(
        options: [String: Any],
        store: NativeFfeConfigurationStoring
    ) throws -> NativeFlagsConfiguration {
        configurationLoadCount += 1
        do {
            let slot = storageSlot(options)
            guard let stored = try store.load(slot: slot) else {
                throw NativeFfeCoreError.invalidConfigurationWire(
                    "No stored flags configuration for slot '\(slot)'"
                )
            }
            lastStorage = stored.toDebugMap(operation: Operation.load)
            lastError = nil
            return try configurationFromString(stored.wire)
        } catch {
            lastStorage = [
                "operation": Operation.load,
                "status": StorageStatus.failed,
            ]
            markProviderError(error)
            throw error
        }
    }

    func setConfiguration(_ configuration: [String: Any]) -> [String: Any] {
        do {
            let parsed = try configurationFromString(configurationToString(configuration))
            let firstConfiguration = activeConfiguration == nil
            activeConfiguration = parsed
            configurationSetCount += 1
            status = Status.ready
            lastError = nil
            lastEvent = firstConfiguration ? Event.providerReady : Event.configurationChanged
            return debugState()
        } catch {
            status = activeConfiguration == nil ? Status.error : Status.stale
            lastError = error.localizedDescription
            lastEvent = Event.providerError
            return debugState()
        }
    }

    func setEvaluationContext(_ context: [String: Any]) -> [String: Any] {
        currentContext = context
        return debugState()
    }

    func resolveBooleanEvaluation(flagKey: String, defaultValue: Bool) -> [String: Any] {
        resolveEvaluation(flagKey: flagKey, defaultValue: defaultValue, expectedType: ExpectedType.boolean)
    }

    func resolveStringEvaluation(flagKey: String, defaultValue: String) -> [String: Any] {
        resolveEvaluation(flagKey: flagKey, defaultValue: defaultValue, expectedType: ExpectedType.string)
    }

    func resolveNumberEvaluation(flagKey: String, defaultValue: Double) -> [String: Any] {
        resolveEvaluation(flagKey: flagKey, defaultValue: defaultValue, expectedType: ExpectedType.number)
    }

    func resolveObjectEvaluation(flagKey: String, defaultValue: [String: Any]) -> [String: Any] {
        resolveEvaluation(flagKey: flagKey, defaultValue: defaultValue, expectedType: ExpectedType.object)
    }

    func runBenchmark(options: [String: Any]) -> [String: Any] {
        let contexts = options["contexts"] as? [[String: Any]] ?? []
        let flags = options["flags"] as? [[String: Any]] ?? []
        var batchDurationsUs: [Double] = []
        var iterations: Int64 = 0
        var checksum = BenchmarkChecksum.offsetBasis
        let previousContext = currentContext
        let previousEvaluationDateOverride = evaluationDateOverride
        evaluationDateOverride = doubleValue(options["evaluationTimeMs"]).map {
            Date(timeIntervalSince1970: $0 / 1_000)
        }
        let totalStartNs = DispatchTime.now().uptimeNanoseconds
        defer {
            currentContext = previousContext
            evaluationDateOverride = previousEvaluationDateOverride
        }

        for context in contexts {
            currentContext = context
            let batchStartNs = DispatchTime.now().uptimeNanoseconds
            for flag in flags {
                guard let flagKey = stringValue(flag["key"]),
                    let variationType = stringValue(flag["variationType"])
                else {
                    continue
                }
                let result = resolveEvaluation(
                    flagKey: flagKey,
                    defaultValue: benchmarkDefaultValue(flag["defaultValue"], variationType: variationType),
                    expectedType: benchmarkExpectedType(variationType)
                )
                checksum = checksumResult(checksum, flagKey: flagKey, result: result)
                iterations += 1
            }
            let batchDurationUs = Double(DispatchTime.now().uptimeNanoseconds - batchStartNs)
                / BenchmarkTime.nanosecondsPerMicrosecond
                / Double(max(flags.count, 1))
            batchDurationsUs.append(batchDurationUs)
        }

        let evalTotalMs = Double(DispatchTime.now().uptimeNanoseconds - totalStartNs)
            / BenchmarkTime.nanosecondsPerMillisecond
        return [
            "iterations": iterations,
            "checksum": String(format: "%08x", checksum),
            "evalTotalMs": evalTotalMs,
            "perEvalUs": iterations > 0
                ? evalTotalMs * BenchmarkTime.microsecondsPerMillisecond / Double(iterations)
                : 0.0,
            "p50Us": percentile(batchDurationsUs, quantile: 0.50),
            "p95Us": percentile(batchDurationsUs, quantile: 0.95),
            "p99Us": percentile(batchDurationsUs, quantile: 0.99),
        ]
    }

    func debugState() -> [String: Any] {
        buildMap([
            ("status", status),
            ("activeConfigurationKind", activeConfiguration?.kind),
            ("activeEtag", activeConfiguration?.etag),
            ("currentContext", currentContext),
            ("configurationSetCount", configurationSetCount),
            ("configurationSaveCount", configurationSaveCount),
            ("configurationLoadCount", configurationLoadCount),
            ("fetchCount", fetchCount),
            ("evaluationCount", evaluationCount),
            ("lastEvent", lastEvent),
            ("lastFetchRequest", lastFetchRequest),
            ("lastStorage", lastStorage),
            ("lastError", lastError),
        ])
    }

    func evaluationContext() -> [String: Any] {
        currentContext
    }

    private func resolveEvaluation(
        flagKey: String,
        defaultValue: Any,
        expectedType: String
    ) -> [String: Any] {
        evaluationCount += 1

        guard let configuration = activeConfiguration,
            let flags = configuration.serverFlags,
            let flag = flags[flagKey]
        else {
            return defaultResult(
                flagKey: flagKey,
                defaultValue: defaultValue,
                reason: "ERROR",
                errorCode: activeConfiguration == nil ? "PROVIDER_NOT_READY" : "FLAG_NOT_FOUND"
            )
        }

        if !flag.enabled {
            return defaultResult(
                flagKey: flagKey,
                defaultValue: defaultValue,
                reason: "DISABLED",
                errorCode: nil
            )
        }
        if !typeMatches(expectedType: expectedType, variationType: flag.variationType) {
            return defaultResult(
                flagKey: flagKey,
                defaultValue: defaultValue,
                reason: "ERROR",
                errorCode: "TYPE_MISMATCH"
            )
        }
        if flag.unsupported {
            return defaultResult(
                flagKey: flagKey,
                defaultValue: defaultValue,
                reason: "DEFAULT",
                errorCode: nil
            )
        }

        let subjectAttributes = subjectAttributes()
        let targetingKey = stringValue(currentContext["targetingKey"])

        for allocation in flag.allocations {
            guard allocationIsActive(allocation),
                rulesMatch(allocation.rules, subjectAttributes: subjectAttributes)
            else {
                continue
            }

            let split: NativeSplit
            do {
                guard let selectedSplit = try firstMatchingSplit(
                    allocation.splits,
                    targetingKey: targetingKey
                ) else {
                    continue
                }
                split = selectedSplit
            } catch NativeFfeCoreError.targetingKeyMissing {
                return defaultResult(
                    flagKey: flagKey,
                    defaultValue: defaultValue,
                    reason: "ERROR",
                    errorCode: "TARGETING_KEY_MISSING"
                )
            } catch {
                return defaultResult(
                    flagKey: flagKey,
                    defaultValue: defaultValue,
                    reason: "ERROR",
                    errorCode: "GENERAL"
                )
            }

            guard let variation = flag.variations[split.variationKey] else {
                continue
            }

            let reason = evaluationReason(allocation: allocation, split: split)
            let extraLogging = split.extraLogging ?? allocation.extraLogging ?? [:]
            return buildMap([
                ("flagKey", flagKey),
                ("value", bridgeValue(variation.value)),
                ("variant", variation.key),
                ("reason", reason),
                (
                    "flagMetadata",
                    buildMap([
                        ("__dd_allocation_key", allocation.key),
                        ("__dd_do_log", allocation.doLog),
                        ("__dd_split_serial_id", split.serialId),
                        ("allocationKey", allocation.key),
                        ("doLog", allocation.doLog),
                        ("extraLogging", extraLogging),
                        ("configurationKind", configuration.kind),
                        ("configurationEtag", configuration.etag),
                        ("splitSerialId", split.serialId),
                        ("variationType", expectedType),
                    ])
                ),
            ])
        }

        return defaultResult(
            flagKey: flagKey,
            defaultValue: defaultValue,
            reason: "DEFAULT",
            errorCode: nil
        )
    }

    private func defaultResult(
        flagKey: String,
        defaultValue: Any,
        reason: String,
        errorCode: String?
    ) -> [String: Any] {
        buildMap([
            ("flagKey", flagKey),
            ("value", bridgeValue(defaultValue)),
            ("reason", reason),
            ("errorCode", errorCode),
        ])
    }

    private func flagsObject(_ response: [String: Any]?) -> [String: Any]? {
        guard let response else {
            return nil
        }
        if let flags = dictionaryValue(response["flags"]) {
            return flags
        }
        return dictionaryValue(response["data"])
            .flatMap { dictionaryValue($0["attributes"]) }
            .flatMap { dictionaryValue($0["flags"]) }
    }

    private func typeMatches(expectedType: String, variationType: String?) -> Bool {
        switch expectedType {
        case ExpectedType.boolean:
            return variationType == "BOOLEAN"
        case ExpectedType.string:
            return variationType == "STRING"
        case ExpectedType.number:
            return variationType == "INTEGER" || variationType == "NUMERIC"
        case ExpectedType.object:
            return variationType == "JSON"
        default:
            return false
        }
    }

    private func subjectAttributes() -> [String: Any] {
        var attributes: [String: Any] = [:]
        if let targetingKey = stringValue(currentContext["targetingKey"]) {
            attributes["id"] = targetingKey
        }
        if let contextAttributes = dictionaryValue(currentContext["attributes"]) {
            attributes.merge(contextAttributes) { _, newValue in newValue }
        }
        return attributes
    }

    private func allocationIsActive(_ allocation: NativeAllocation) -> Bool {
        let now = evaluationDateOverride ?? Date()
        if allocation.hasInvalidDate {
            return false
        }
        return (allocation.startAt == nil || now >= allocation.startAt!)
            && (allocation.endAt == nil || now < allocation.endAt!)
    }

    private func rulesMatch(
        _ rules: [NativeRule],
        subjectAttributes: [String: Any]
    ) -> Bool {
        if rules.isEmpty {
            return true
        }
        for rule in rules {
            if rule.conditions.allSatisfy({ conditionMatches($0, subjectAttributes: subjectAttributes) }) {
                return true
            }
        }
        return false
    }

    private func conditionMatches(
        _ condition: NativeCondition,
        subjectAttributes: [String: Any]
    ) -> Bool {
        let value = subjectAttributes[condition.attribute]

        switch condition.operator {
        case "IS_NULL":
            let expectsNull = boolValue(condition.value) ?? false
            return expectsNull ? isNull(value) : !isNull(value)
        case "MATCHES":
            return regexMatches(pattern: stringValue(condition.value), value: stringValue(value))
        case "NOT_MATCHES":
            guard let subjectValue = stringValue(value) else {
                return false
            }
            return !regexMatches(pattern: stringValue(condition.value), value: subjectValue)
        case "ONE_OF":
            return containsComparableValue(arrayValue(condition.value), actual: value)
        case "NOT_ONE_OF":
            guard !isNull(value) else {
                return false
            }
            return !containsComparableValue(arrayValue(condition.value), actual: value)
        case "GTE":
            return doubleValue(value).map { $0 >= (doubleValue(condition.value) ?? 0) } ?? false
        case "GT":
            return doubleValue(value).map { $0 > (doubleValue(condition.value) ?? 0) } ?? false
        case "LTE":
            return doubleValue(value).map { $0 <= (doubleValue(condition.value) ?? 0) } ?? false
        case "LT":
            return doubleValue(value).map { $0 < (doubleValue(condition.value) ?? 0) } ?? false
        case "SEMVER_EQ", "SEMVER_NEQ", "SEMVER_GT", "SEMVER_GTE", "SEMVER_LT", "SEMVER_LTE":
            return semverMatches(
                operator: condition.operator,
                actual: value,
                expected: condition.value
            )
        default:
            return false
        }
    }

    private func firstMatchingSplit(_ splits: [NativeSplit], targetingKey: String?) throws -> NativeSplit? {
        for split in splits {
            if split.shards.isEmpty {
                return split
            }
            guard let targetingKey else {
                throw NativeFfeCoreError.targetingKeyMissing
            }
            if shardsMatch(split.shards, targetingKey: targetingKey) {
                return split
            }
        }
        return nil
    }

    private func evaluationReason(allocation: NativeAllocation, split: NativeSplit) -> String {
        if !allocation.rules.isEmpty {
            return "TARGETING_MATCH"
        }
        if allocation.startAt != nil || allocation.endAt != nil {
            return "DEFAULT"
        }
        if !split.shards.isEmpty {
            return "SPLIT"
        }
        return "STATIC"
    }

    private func shardsMatch(_ shards: [NativeShard], targetingKey: String) -> Bool {
        for shard in shards {
            let assigned = assignedShard(
                salt: shard.salt,
                targetingKey: targetingKey,
                totalShards: shard.totalShards
            )
            let inAnyRange = shard.ranges.contains { range in
                assigned >= range.start && assigned < range.end
            }
            if !inAnyRange {
                return false
            }
        }
        return true
    }

    private func assignedShard(salt: String, targetingKey: String, totalShards: UInt32) -> UInt32 {
        let firstFourBytes = md5FirstFourBytes("\(salt)-\(targetingKey)")
        return firstFourBytes % totalShards
    }

    private func markProviderError(_ error: Error) {
        status = activeConfiguration == nil ? Status.error : Status.stale
        lastError = error.localizedDescription
        lastEvent = Event.providerError
    }

    private func storageSlot(_ options: [String: Any]) -> String {
        stringValue(options["slot"])
            ?? stringValue(options["clientName"])
            ?? Constants.defaultStorageSlot
    }

    private func nativeFlags(_ flags: [String: Any]) -> [String: NativeFlag] {
        flags.compactMapValues { value in
            dictionaryValue(value).map(nativeFlag)
        }
    }

    private func nativeFlag(_ flag: [String: Any]) -> NativeFlag {
        let allocations = arrayValue(flag["allocations"]).compactMap(nativeAllocation)
        let malformedAllocations = flag["allocations"] != nil && arrayValueOrNil(flag["allocations"]) == nil
        let unsupportedOperator = allocations.contains { allocation in
            allocation.rules.contains { rule in
                rule.conditions.contains { !KnownConditionOperators.values.contains($0.operator) }
            }
        }
        return NativeFlag(
            key: stringValue(flag["key"]) ?? "",
            enabled: boolValue(flag["enabled"]) ?? false,
            variationType: stringValue(flag["variationType"]) ?? "",
            variations: dictionaryValue(flag["variations"]).map(nativeVariations) ?? [:],
            allocations: allocations,
            unsupported: malformedAllocations || unsupportedOperator
        )
    }

    private func nativeVariations(_ variations: [String: Any]) -> [String: NativeVariation] {
        variations.compactMapValues { value in
            guard let variation = dictionaryValue(value) else {
                return nil
            }
            return NativeVariation(
                key: stringValue(variation["key"]) ?? "",
                value: bridgeValue(variation["value"])
            )
        }
    }

    private func nativeAllocation(_ value: Any) -> NativeAllocation? {
        guard let allocation = dictionaryValue(value) else {
            return nil
        }
        let startAt = nonEmptyString(allocation["startAt"])
        let endAt = nonEmptyString(allocation["endAt"])
        let parsedStartAt = startAt.flatMap(parseDate)
        let parsedEndAt = endAt.flatMap(parseDate)
        return NativeAllocation(
            key: stringValue(allocation["key"]),
            rules: arrayValue(allocation["rules"]).compactMap(nativeRule),
            splits: arrayValue(allocation["splits"]).compactMap(nativeSplit),
            doLog: boolValue(allocation["doLog"]) ?? false,
            extraLogging: dictionaryValue(allocation["extraLogging"]),
            startAt: parsedStartAt,
            endAt: parsedEndAt,
            hasInvalidDate: (startAt != nil && parsedStartAt == nil) || (endAt != nil && parsedEndAt == nil)
        )
    }

    private func nativeRule(_ value: Any) -> NativeRule? {
        guard let rule = dictionaryValue(value) else {
            return nil
        }
        return NativeRule(
            conditions: arrayValue(rule["conditions"]).compactMap(nativeCondition)
        )
    }

    private func nativeCondition(_ value: Any) -> NativeCondition? {
        guard let condition = dictionaryValue(value),
            let attribute = stringValue(condition["attribute"]),
            let conditionOperator = stringValue(condition["operator"])
        else {
            return nil
        }
        return NativeCondition(
            attribute: attribute,
            operator: conditionOperator,
            value: bridgeValue(condition["value"])
        )
    }

    private func nativeSplit(_ value: Any) -> NativeSplit? {
        guard let split = dictionaryValue(value),
            let shardsValue = split["shards"],
            let shardsArray = arrayValueOrNil(shardsValue)
        else {
            return nil
        }
        guard let shards = nativeShards(shardsArray) else {
            return nil
        }
        return NativeSplit(
            variationKey: stringValue(split["variationKey"]) ?? "",
            shards: shards,
            serialId: intValue(split["serialId"]),
            extraLogging: dictionaryValue(split["extraLogging"])
        )
    }

    private func nativeShards(_ shards: [Any]) -> [NativeShard]? {
        var nativeShards: [NativeShard] = []
        for value in shards {
            guard let nativeShard = nativeShard(value) else {
                return nil
            }
            nativeShards.append(nativeShard)
        }
        return nativeShards
    }

    private func nativeShard(_ value: Any) -> NativeShard? {
        guard let shard = dictionaryValue(value),
            let salt = stringValue(shard["salt"]),
            let totalShards = uint32Value(shard["totalShards"]),
            totalShards > 0,
            let ranges = nativeShardRanges(arrayValue(shard["ranges"]), totalShards: totalShards)
        else {
            return nil
        }
        return NativeShard(salt: salt, totalShards: totalShards, ranges: ranges)
    }

    private func nativeShardRanges(
        _ ranges: [Any],
        totalShards: UInt32
    ) -> [NativeShardRange]? {
        var nativeRanges: [NativeShardRange] = []
        for value in ranges {
            guard let range = dictionaryValue(value),
                let start = uint32Value(range["start"]),
                let end = uint32Value(range["end"]),
                start < end,
                end <= totalShards
            else {
                return nil
            }
            nativeRanges.append(NativeShardRange(start: start, end: end))
        }
        return nativeRanges
    }

    private func parseOptionalResponse(_ value: Any?) throws -> [String: Any]? {
        guard let response = value as? String else {
            return nil
        }
        return try parseJSONObject(response)
    }

    private func parseJSONObject(_ json: String) throws -> [String: Any] {
        guard let data = json.data(using: .utf8) else {
            throw NativeFfeCoreError.invalidConfigurationWire("ConfigurationWire is not UTF-8")
        }
        let object = try JSONSerialization.jsonObject(with: data)
        guard let dictionary = object as? [String: Any] else {
            throw NativeFfeCoreError.invalidConfigurationWire("ConfigurationWire must be an object")
        }
        return dictionary
    }

    private func parseDate(_ value: String) -> Date? {
        if let date = Self.isoDateFormatterWithFraction.date(from: value) {
            return date
        }
        return Self.isoDateFormatter.date(from: value)
    }

    private func regexMatches(pattern: String?, value: String?) -> Bool {
        guard let pattern, let value else {
            return false
        }
        do {
            let regex = try NSRegularExpression(pattern: pattern)
            let range = NSRange(value.startIndex..<value.endIndex, in: value)
            return regex.firstMatch(in: value, range: range) != nil
        } catch {
            return false
        }
    }

    private func semverMatches(operator: String, actual: Any?, expected: Any?) -> Bool {
        guard let comparison = compareSemver(
            stringValue(actual),
            stringValue(expected)
        ) else {
            return false
        }
        switch `operator` {
        case "SEMVER_EQ":
            return comparison == 0
        case "SEMVER_NEQ":
            return comparison != 0
        case "SEMVER_GT":
            return comparison > 0
        case "SEMVER_GTE":
            return comparison >= 0
        case "SEMVER_LT":
            return comparison < 0
        case "SEMVER_LTE":
            return comparison <= 0
        default:
            return false
        }
    }

    private func compareSemver(_ actual: String?, _ expected: String?) -> Int? {
        guard let left = nativeSemver(actual), let right = nativeSemver(expected) else {
            return nil
        }
        let coreComparison = compareInts(left.major, right.major)
            ?? compareInts(left.minor, right.minor)
            ?? compareInts(left.patch, right.patch)
        if let coreComparison {
            return coreComparison
        }
        return comparePrerelease(left.prerelease, right.prerelease)
    }

    private func nativeSemver(_ value: String?) -> NativeSemver? {
        guard let value else {
            return nil
        }
        let normalized = value
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: #"^[vV]"#, with: "", options: .regularExpression)
            .split(separator: "+", maxSplits: 1, omittingEmptySubsequences: false)[0]
        let parts = normalized.split(separator: "-", maxSplits: 1, omittingEmptySubsequences: false)
        let core = parts[0].split(separator: ".", omittingEmptySubsequences: false)
        guard !core.isEmpty, core.count <= 3 else {
            return nil
        }
        let numbers = core.map { Int($0) }
        guard numbers.allSatisfy({ $0 != nil }) else {
            return nil
        }
        return NativeSemver(
            major: numbers[0]!,
            minor: core.indices.contains(1) ? numbers[1]! : 0,
            patch: core.indices.contains(2) ? numbers[2]! : 0,
            prerelease: parts.indices.contains(1)
                ? parts[1].split(separator: ".").map(String.init)
                : []
        )
    }

    private func comparePrerelease(_ left: [String], _ right: [String]) -> Int {
        if left.isEmpty, right.isEmpty {
            return 0
        }
        if left.isEmpty {
            return 1
        }
        if right.isEmpty {
            return -1
        }
        for index in 0..<max(left.count, right.count) {
            guard left.indices.contains(index) else {
                return -1
            }
            guard right.indices.contains(index) else {
                return 1
            }
            let comparison = comparePrereleaseIdentifier(left[index], right[index])
            if comparison != 0 {
                return comparison
            }
        }
        return 0
    }

    private func comparePrereleaseIdentifier(_ left: String, _ right: String) -> Int {
        let leftNumber = Int(left)
        let rightNumber = Int(right)
        if let leftNumber, let rightNumber {
            return compareInts(leftNumber, rightNumber) ?? 0
        }
        if leftNumber != nil {
            return -1
        }
        if rightNumber != nil {
            return 1
        }
        return compareInts(left.compare(right).rawValue, 0) ?? 0
    }

    private func compareInts(_ left: Int, _ right: Int) -> Int? {
        if left < right {
            return -1
        }
        if left > right {
            return 1
        }
        return nil
    }

    private func benchmarkDefaultValue(_ value: Any?, variationType: String) -> Any {
        switch variationType {
        case "BOOLEAN":
            return boolValue(value) ?? false
        case "STRING":
            return stringValue(value) ?? ""
        case "INTEGER", "NUMERIC":
            return doubleValue(value) ?? 0.0
        case "JSON":
            return dictionaryValue(value) ?? [:]
        default:
            return value ?? NSNull()
        }
    }

    private func benchmarkExpectedType(_ variationType: String) -> String {
        switch variationType {
        case "BOOLEAN":
            return ExpectedType.boolean
        case "STRING":
            return ExpectedType.string
        case "INTEGER", "NUMERIC":
            return ExpectedType.number
        case "JSON":
            return ExpectedType.object
        default:
            return ""
        }
    }

    private func percentile(_ values: [Double], quantile: Double) -> Double {
        guard !values.isEmpty else {
            return 0
        }
        let sorted = values.sorted()
        let index = max(0, min(sorted.count - 1, Int(Double(sorted.count - 1) * quantile)))
        return sorted[index]
    }

    private func checksumResult(
        _ checksum: UInt32,
        flagKey: String,
        result: [String: Any]
    ) -> UInt32 {
        updateChecksum(
            checksum,
            [
                flagKey,
                canonicalBenchmarkValue(result["value"]),
                stringValue(result["variant"]) ?? "",
                stringValue(result["reason"]) ?? "",
                stringValue(result["errorCode"]) ?? "",
            ].joined(separator: "|")
        )
    }

    private func updateChecksum(_ checksum: UInt32, _ value: String) -> UInt32 {
        var hash = checksum
        for byte in value.utf8 {
            hash ^= UInt32(byte)
            hash = hash &* BenchmarkChecksum.prime
        }
        return hash
    }

    private func canonicalBenchmarkValue(_ value: Any?) -> String {
        guard let value, !(value is NSNull) else {
            return "null"
        }
        if let dictionary = dictionaryValue(value) {
            return "{"
                + dictionary.keys.sorted().map {
                    "\(jsonString($0)):\(canonicalBenchmarkValue(dictionary[$0]))"
                }.joined(separator: ",")
                + "}"
        }
        if let array = arrayValueOrNil(value) {
            return "[" + array.map { canonicalBenchmarkValue($0) }.joined(separator: ",") + "]"
        }
        if let string = value as? String {
            return jsonString(string)
        }
        if let number = value as? NSNumber {
            if CFGetTypeID(number) == CFBooleanGetTypeID() {
                return number.boolValue ? "true" : "false"
            }
            return canonicalNumber(number.doubleValue)
        }
        return jsonString(String(describing: value))
    }

    private func canonicalNumber(_ value: Double) -> String {
        if value.isFinite,
            value.rounded(.towardZero) == value,
            value >= Double(Int64.min),
            value <= Double(Int64.max) {
            return String(Int64(value))
        }
        return String(describing: value)
    }

    private func jsonString(_ value: String) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: [value]),
            let encodedArray = String(data: data, encoding: .utf8)
        else {
            return "\"\(value)\""
        }
        return String(encodedArray.dropFirst().dropLast())
    }

    private func containsString(_ values: [Any], expected: String) -> Bool {
        values.contains { stringValue($0) == expected }
    }

    private func containsComparableValue(_ values: [Any], actual: Any?) -> Bool {
        comparableStrings(actual).contains { containsString(values, expected: $0) }
    }

    private func comparableStrings(_ value: Any?) -> [String] {
        guard let value, !(value is NSNull) else {
            return []
        }

        var strings = Set<String>()
        if let string = stringValue(value) {
            strings.insert(string)
        }
        if let number = value as? NSNumber,
            CFGetTypeID(number) != CFBooleanGetTypeID() {
            let doubleValue = number.doubleValue
            if doubleValue.isFinite,
                doubleValue.rounded(.towardZero) == doubleValue,
                doubleValue >= Double(Int64.min),
                doubleValue <= Double(Int64.max) {
                strings.insert(String(Int64(doubleValue)))
            }
        }
        return Array(strings)
    }

    private func bridgeValue(_ value: Any?) -> Any? {
        guard let value, !(value is NSNull) else {
            return nil
        }
        if let dictionary = dictionaryValue(value) {
            return buildMap(dictionary.map { ($0.key, bridgeValue($0.value)) })
        }
        if let array = value as? [Any] {
            return array.map { bridgeValue($0) ?? NSNull() }
        }
        return value
    }

    private func buildMap(_ values: [(String, Any?)]) -> [String: Any] {
        var map: [String: Any] = [:]
        values.forEach { key, value in
            guard let bridgeValue = bridgeValue(value) else {
                return
            }
            map[key] = bridgeValue
        }
        return map
    }

    private func dictionaryValue(_ value: Any?) -> [String: Any]? {
        if let dictionary = value as? [String: Any] {
            return dictionary
        }
        if let dictionary = value as? NSDictionary {
            return dictionary as? [String: Any]
        }
        return nil
    }

    private func arrayValue(_ value: Any?) -> [Any] {
        arrayValueOrNil(value) ?? []
    }

    private func arrayValueOrNil(_ value: Any?) -> [Any]? {
        if let array = value as? [Any] {
            return array
        }
        if let array = value as? NSArray {
            return array as? [Any]
        }
        return nil
    }

    private func stringValue(_ value: Any?) -> String? {
        guard let value, !(value is NSNull) else {
            return nil
        }
        if let string = value as? String {
            return string
        }
        if let number = value as? NSNumber,
            CFGetTypeID(number) == CFBooleanGetTypeID() {
            return number.boolValue ? "true" : "false"
        }
        return String(describing: value)
    }

    private func isNull(_ value: Any?) -> Bool {
        value == nil || value is NSNull
    }

    private func nonEmptyString(_ value: Any?) -> String? {
        stringValue(value).flatMap { $0.isEmpty ? nil : $0 }
    }

    private func intValue(_ value: Any?) -> Int? {
        if let int = value as? Int {
            return int
        }
        if let number = value as? NSNumber {
            return number.intValue
        }
        if let string = value as? String {
            return Int(string)
        }
        return nil
    }

    private func uint32Value(_ value: Any?) -> UInt32? {
        if let int = intValue(value), int >= 0 {
            return UInt32(exactly: int)
        }
        if let number = value as? NSNumber {
            return UInt32(exactly: number.uint64Value)
        }
        if let string = value as? String {
            return UInt32(string)
        }
        return nil
    }

    private func doubleValue(_ value: Any?) -> Double? {
        if let double = value as? Double {
            return double
        }
        if let number = value as? NSNumber {
            return number.doubleValue
        }
        if let string = value as? String {
            return Double(string)
        }
        return nil
    }

    private func boolValue(_ value: Any?) -> Bool? {
        if let bool = value as? Bool {
            return bool
        }
        if let number = value as? NSNumber {
            return number.boolValue
        }
        if let string = value as? String {
            return Bool(string)
        }
        return nil
    }

    private static let isoDateFormatterWithFraction: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let isoDateFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()
}

internal struct NativeFlagsConfiguration {
    let wire: String
    let version: Int
    let kind: String
    let etag: String?
    let serverResponse: [String: Any]?
    let precomputedResponse: [String: Any]?
    let serverFlags: [String: NativeFlag]?

    func toMap() -> [String: Any] {
        var map: [String: Any] = [
            "__ddNativeFfeConfiguration": true,
            "wire": wire,
            "version": version,
            "kind": kind,
        ]
        if let etag {
            map["etag"] = etag
        }
        return map
    }
}

internal struct NativeFlag {
    let key: String
    let enabled: Bool
    let variationType: String
    let variations: [String: NativeVariation]
    let allocations: [NativeAllocation]
    let unsupported: Bool
}

internal struct NativeVariation {
    let key: String
    let value: Any?
}

internal struct NativeAllocation {
    let key: String?
    let rules: [NativeRule]
    let splits: [NativeSplit]
    let doLog: Bool
    let extraLogging: [String: Any]?
    let startAt: Date?
    let endAt: Date?
    let hasInvalidDate: Bool
}

internal struct NativeRule {
    let conditions: [NativeCondition]
}

internal struct NativeCondition {
    let attribute: String
    let `operator`: String
    let value: Any?
}

private struct NativeSemver {
    let major: Int
    let minor: Int
    let patch: Int
    let prerelease: [String]
}

internal struct NativeSplit {
    let variationKey: String
    let shards: [NativeShard]
    let serialId: Int?
    let extraLogging: [String: Any]?
}

internal struct NativeShard {
    let salt: String
    let totalShards: UInt32
    let ranges: [NativeShardRange]
}

internal struct NativeShardRange {
    let start: UInt32
    let end: UInt32
}

internal enum NativeFfeCoreError: LocalizedError {
    case invalidConfigurationWire(String)
    case targetingKeyMissing

    var errorDescription: String? {
        switch self {
        case .invalidConfigurationWire(let message):
            return message
        case .targetingKeyMissing:
            return "Targeting key is required for sharded flag evaluation"
        }
    }
}

#if canImport(CommonCrypto)
    private func md5FirstFourBytes(_ value: String) -> UInt32 {
        let data = Data(value.utf8)
        var digest = [UInt8](repeating: 0, count: Int(CC_MD5_DIGEST_LENGTH))
        digest.withUnsafeMutableBufferPointer { digestBuffer in
            data.withUnsafeBytes { dataBuffer in
                _ = CC_MD5(dataBuffer.baseAddress, CC_LONG(data.count), digestBuffer.baseAddress)
            }
        }
        return (UInt32(digest[0]) << 24)
            | (UInt32(digest[1]) << 16)
            | (UInt32(digest[2]) << 8)
            | UInt32(digest[3])
    }
#else
    private func md5FirstFourBytes(_ value: String) -> UInt32 {
        value.utf8.reduce(UInt32(2_166_136_261)) { hash, byte in
            (hash ^ UInt32(byte)) &* 16_777_619
        }
    }
#endif

private enum Constants {
    static let supportedWireVersion = 2
    static let wireKey = "wire"
    static let defaultStorageSlot = "default"
}

private enum ConfigurationKind {
    static let precomputed = "precomputed"
    static let rules = "rules"
    static let mixed = "mixed"
}

private enum Status {
    static let notReady = "not_ready"
    static let ready = "ready"
    static let stale = "stale"
    static let error = "error"
}

private enum Event {
    static let providerReady = "provider_ready"
    static let configurationChanged = "configuration_changed"
    static let providerError = "provider_error"
}

private enum Operation {
    static let save = "save"
    static let load = "load"
}

private enum StorageStatus {
    static let stored = "stored"
    static let failed = "failed"
}

private enum ExpectedType {
    static let boolean = "boolean"
    static let string = "string"
    static let number = "number"
    static let object = "object"
}

private enum BenchmarkChecksum {
    static let offsetBasis: UInt32 = 2_166_136_261
    static let prime: UInt32 = 16_777_619
}

private enum BenchmarkTime {
    static let microsecondsPerMillisecond = 1_000.0
    static let nanosecondsPerMicrosecond = 1_000.0
    static let nanosecondsPerMillisecond = 1_000_000.0
}

private enum KnownConditionOperators {
    static let values: Set<String> = [
        "IS_NULL",
        "MATCHES",
        "NOT_MATCHES",
        "ONE_OF",
        "NOT_ONE_OF",
        "GTE",
        "GT",
        "LTE",
        "LT",
        "SEMVER_EQ",
        "SEMVER_NEQ",
        "SEMVER_GT",
        "SEMVER_GTE",
        "SEMVER_LT",
        "SEMVER_LTE",
    ]
}

private extension NativeFfeStoredConfiguration {
    func toDebugMap(operation: String) -> [String: Any] {
        [
            "operation": operation,
            "status": StorageStatus.stored,
            "key": key,
            "updatedAtMs": updatedAtMs,
            "wireBytes": wire.data(using: .utf8)?.count ?? 0,
        ]
    }
}
