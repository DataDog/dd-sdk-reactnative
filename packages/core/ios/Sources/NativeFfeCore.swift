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
            precomputedResponse: precomputedResponse
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
            let flags = flagsObject(configuration.serverResponse),
            let flag = dictionaryValue(flags[flagKey])
        else {
            return defaultResult(
                flagKey: flagKey,
                defaultValue: defaultValue,
                reason: "ERROR",
                errorCode: activeConfiguration == nil ? "PROVIDER_NOT_READY" : "FLAG_NOT_FOUND"
            )
        }

        if boolValue(flag["enabled"]) != true {
            return defaultResult(
                flagKey: flagKey,
                defaultValue: defaultValue,
                reason: "DISABLED",
                errorCode: nil
            )
        }
        if !typeMatches(expectedType: expectedType, variationType: stringValue(flag["variationType"])) {
            return defaultResult(
                flagKey: flagKey,
                defaultValue: defaultValue,
                reason: "ERROR",
                errorCode: "TYPE_MISMATCH"
            )
        }

        let subjectAttributes = subjectAttributes()
        let targetingKey = stringValue(currentContext["targetingKey"])
        let allocations = arrayValue(flag["allocations"])
        let variations = dictionaryValue(flag["variations"]) ?? [:]

        for allocationValue in allocations {
            guard let allocation = dictionaryValue(allocationValue),
                allocationIsActive(allocation),
                rulesMatch(arrayValue(allocation["rules"]), subjectAttributes: subjectAttributes)
            else {
                continue
            }

            let split: [String: Any]
            do {
                guard let selectedSplit = try firstMatchingSplit(
                    arrayValue(allocation["splits"]),
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

            guard
                let variationKey = stringValue(split["variationKey"]),
                let variation = dictionaryValue(variations[variationKey])
            else {
                continue
            }

            let reason = evaluationReason(rules: arrayValue(allocation["rules"]), split: split)
            let extraLogging =
                dictionaryValue(split["extraLogging"])
                ?? dictionaryValue(allocation["extraLogging"])
                ?? [:]
            return buildMap([
                ("flagKey", flagKey),
                ("value", bridgeValue(variation["value"])),
                ("variant", stringValue(variation["key"]) ?? variationKey),
                ("reason", reason),
                (
                    "flagMetadata",
                    buildMap([
                        ("__dd_allocation_key", stringValue(allocation["key"])),
                        ("__dd_do_log", boolValue(allocation["doLog"]) ?? false),
                        ("__dd_split_serial_id", intValue(split["serialId"])),
                        ("allocationKey", stringValue(allocation["key"])),
                        ("doLog", boolValue(allocation["doLog"]) ?? false),
                        ("extraLogging", extraLogging),
                        ("configurationKind", configuration.kind),
                        ("configurationEtag", configuration.etag),
                        ("splitSerialId", intValue(split["serialId"])),
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

    private func allocationIsActive(_ allocation: [String: Any]) -> Bool {
        let now = Date()
        let startAt = nonEmptyString(allocation["startAt"])
        let endAt = nonEmptyString(allocation["endAt"])
        let start = startAt.flatMap(parseDate)
        let end = endAt.flatMap(parseDate)

        if startAt != nil && start == nil {
            return false
        }
        if endAt != nil && end == nil {
            return false
        }

        return (start == nil || now >= start!) && (end == nil || now < end!)
    }

    private func rulesMatch(
        _ rules: [Any],
        subjectAttributes: [String: Any]
    ) -> Bool {
        if rules.isEmpty {
            return true
        }
        for ruleValue in rules {
            let conditions = dictionaryValue(ruleValue).flatMap { arrayValue($0["conditions"]) } ?? []
            let allMatch = conditions.allSatisfy { conditionValue in
                guard let condition = dictionaryValue(conditionValue) else {
                    return true
                }
                return conditionMatches(condition, subjectAttributes: subjectAttributes)
            }
            if allMatch {
                return true
            }
        }
        return false
    }

    private func conditionMatches(
        _ condition: [String: Any],
        subjectAttributes: [String: Any]
    ) -> Bool {
        guard let attribute = stringValue(condition["attribute"]) else {
            return false
        }
        let value = subjectAttributes[attribute]

        switch stringValue(condition["operator"]) {
        case "IS_NULL":
            let expectsNull = boolValue(condition["value"]) ?? false
            return expectsNull ? value == nil : value != nil
        case "MATCHES":
            return regexMatches(pattern: stringValue(condition["value"]), value: stringValue(value))
        case "NOT_MATCHES":
            return !regexMatches(pattern: stringValue(condition["value"]), value: stringValue(value))
        case "ONE_OF":
            return stringValue(value).map { containsString(arrayValue(condition["value"]), expected: $0) }
                ?? false
        case "NOT_ONE_OF":
            return stringValue(value).map { !containsString(arrayValue(condition["value"]), expected: $0) }
                ?? false
        case "GTE":
            return doubleValue(value).map { $0 >= (doubleValue(condition["value"]) ?? 0) } ?? false
        case "GT":
            return doubleValue(value).map { $0 > (doubleValue(condition["value"]) ?? 0) } ?? false
        case "LTE":
            return doubleValue(value).map { $0 <= (doubleValue(condition["value"]) ?? 0) } ?? false
        case "LT":
            return doubleValue(value).map { $0 < (doubleValue(condition["value"]) ?? 0) } ?? false
        default:
            return false
        }
    }

    private func firstMatchingSplit(_ splits: [Any], targetingKey: String?) throws -> [String: Any]? {
        for splitValue in splits {
            guard let split = dictionaryValue(splitValue) else {
                continue
            }
            let shards = arrayValue(split["shards"])
            if shards.isEmpty {
                return split
            }
            guard let targetingKey else {
                throw NativeFfeCoreError.targetingKeyMissing
            }
            if shardsMatch(shards, targetingKey: targetingKey) {
                return split
            }
        }
        return nil
    }

    private func evaluationReason(rules: [Any], split: [String: Any]) -> String {
        if !rules.isEmpty {
            return "TARGETING_MATCH"
        }
        if !arrayValue(split["shards"]).isEmpty {
            return "SPLIT"
        }
        return "STATIC"
    }

    private func shardsMatch(_ shards: [Any], targetingKey: String) -> Bool {
        for shardValue in shards {
            guard let shard = dictionaryValue(shardValue),
                let salt = stringValue(shard["salt"]),
                let totalShards = intValue(shard["totalShards"])
            else {
                return false
            }
            let assigned = assignedShard(salt: salt, targetingKey: targetingKey, totalShards: totalShards)
            let ranges = arrayValue(shard["ranges"])
            let inAnyRange = ranges.contains { rangeValue in
                guard let range = dictionaryValue(rangeValue),
                    let start = intValue(range["start"]),
                    let end = intValue(range["end"])
                else {
                    return false
                }
                return assigned >= start && assigned < end
            }
            if !inAnyRange {
                return false
            }
        }
        return true
    }

    private func assignedShard(salt: String, targetingKey: String, totalShards: Int) -> Int {
        guard totalShards > 0 else {
            return -1
        }
        let firstFourBytes = md5FirstFourBytes("\(salt)-\(targetingKey)")
        return Int(firstFourBytes % UInt32(totalShards))
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

    private func containsString(_ values: [Any], expected: String) -> Bool {
        values.contains { stringValue($0) == expected }
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
        if let array = value as? [Any] {
            return array
        }
        if let array = value as? NSArray {
            return array as? [Any] ?? []
        }
        return []
    }

    private func stringValue(_ value: Any?) -> String? {
        guard let value, !(value is NSNull) else {
            return nil
        }
        if let string = value as? String {
            return string
        }
        return String(describing: value)
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
