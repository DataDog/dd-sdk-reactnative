/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import DatadogInternal
import Foundation
import XCTest

@testable import DatadogSDKReactNative

final class NativeFfeCoreTests: XCTestCase {
    private let numericTolerance = 0.0000001
    private let storedAtMs: Int64 = 1_780_000_000_000

    func testParseAndSerializeConfigurationWithCanonicalUfcConfigurationWireRoundTrip() throws {
        let testedCore = NativeFfeCore()

        let configuration = try testedCore.configurationFromString(Self.flagsConfigurationWire)
        let serialized = try testedCore.configurationToString(configuration.toMap())
        let wireJson = try Self.jsonObject(Self.flagsConfigurationWire)
        let server = try XCTUnwrap(wireJson["server"] as? [String: Any])
        let embeddedUfcConfig = try XCTUnwrap(server["response"] as? String)

        XCTAssertEqual(configuration.kind, "rules")
        XCTAssertEqual(configuration.etag, "ffe-system-test-data")
        XCTAssertEqual(embeddedUfcConfig, Self.canonicalUfcConfig)
        XCTAssertEqual(serialized, Self.flagsConfigurationWire)
    }

    func testSaveAndLoadConfigurationWithNativeDiskStore() throws {
        let testedCore = NativeFfeCore()
        let tempDirectory = FileManager.default.temporaryDirectory
            .appendingPathComponent("native-ffe-\(UUID().uuidString)")
        defer { try? FileManager.default.removeItem(at: tempDirectory) }
        let store = FileNativeFfeConfigurationStore(rootDirectory: tempDirectory) {
            self.storedAtMs
        }
        let configuration = try testedCore.configurationFromString(Self.flagsConfigurationWire)

        let saveState = try testedCore.saveConfiguration(
            configuration.toMap(),
            options: ["slot": "default"],
            store: store
        )
        let loadedConfiguration = try testedCore.loadConfiguration(
            options: ["slot": "default"],
            store: store
        )
        let activatedState = testedCore.setConfiguration(loadedConfiguration.toMap())

        XCTAssertEqual(try testedCore.configurationToString(loadedConfiguration.toMap()), Self.flagsConfigurationWire)
        XCTAssertEqual(saveState["configurationSaveCount"] as? Int, 1)
        XCTAssertEqual(saveState["configurationLoadCount"] as? Int, 0)
        XCTAssertNil(saveState["activeConfigurationKind"])
        let lastSave = try XCTUnwrap(saveState["lastStorage"] as? [String: Any])
        XCTAssertEqual(lastSave["operation"] as? String, "save")
        XCTAssertEqual(lastSave["status"] as? String, "stored")
        XCTAssertEqual(lastSave["key"] as? String, "flags-configuration-default")
        XCTAssertEqual(lastSave["updatedAtMs"] as? Int64, storedAtMs)
        XCTAssertEqual(activatedState["activeConfigurationKind"] as? String, "rules")
        XCTAssertEqual(activatedState["configurationLoadCount"] as? Int, 1)
    }

    func testSaveAndLoadConfigurationWithDatadogFlagsDataStore() throws {
        let testedCore = NativeFfeCore()
        let dataStore = NativeFfeFakeDataStore()
        let store = DatadogDataStoreNativeFfeConfigurationStore(
            dataStoreProvider: { dataStore },
            clockMs: { self.storedAtMs }
        )
        let configuration = try testedCore.configurationFromString(Self.flagsConfigurationWire)

        let saveState = try testedCore.saveConfiguration(
            configuration.toMap(),
            options: ["slot": "default"],
            store: store
        )
        let loadedConfiguration = try testedCore.loadConfiguration(
            options: ["slot": "default"],
            store: store
        )

        XCTAssertEqual(try testedCore.configurationToString(loadedConfiguration.toMap()), Self.flagsConfigurationWire)
        let lastSave = try XCTUnwrap(saveState["lastStorage"] as? [String: Any])
        XCTAssertEqual(lastSave["operation"] as? String, "save")
        XCTAssertEqual(lastSave["status"] as? String, "stored")
        XCTAssertEqual(lastSave["key"] as? String, "flags-configuration-default")
        XCTAssertEqual(lastSave["updatedAtMs"] as? Int64, storedAtMs)
        XCTAssertNotNil(dataStore.values["flags-configuration-default"])
    }

    func testReturnStaticReasonWithCanonicalNumericFlagCase() throws {
        let testedCore = try configuredCore()
        let evaluationCase = try Self.evaluationCase("test-case-numeric-flag.json")
        _ = testedCore.setEvaluationContext(evaluationCase.context)

        let result = try resolveEvaluation(evaluationCase, with: testedCore)

        assertEvaluationResult(result, evaluationCase)
        XCTAssertEqual(result["variant"] as? String, "pi")
        let metadata = try XCTUnwrap(result["flagMetadata"] as? [String: Any])
        XCTAssertEqual(metadata["__dd_allocation_key"] as? String, "rollout")
        XCTAssertEqual(metadata["__dd_do_log"] as? Bool, true)
    }

    func testReturnSplitReasonWithCanonicalShardedFlagCase() throws {
        let testedCore = try configuredCore()
        let evaluationCase = try Self.evaluationCase(
            "test-case-flag-with-empty-string.json",
            caseIndex: 1
        )
        _ = testedCore.setEvaluationContext(evaluationCase.context)

        let result = try resolveEvaluation(evaluationCase, with: testedCore)

        assertEvaluationResult(result, evaluationCase)
    }

    func testReturnTargetingMatchReasonWithCanonicalTargetedFlagCase() throws {
        let testedCore = try configuredCore()
        let evaluationCase = try Self.evaluationCase("test-case-flag-with-empty-string.json")
        _ = testedCore.setEvaluationContext(evaluationCase.context)

        let result = try resolveEvaluation(evaluationCase, with: testedCore)

        assertEvaluationResult(result, evaluationCase)
    }

    func testReturnTargetingKeyMissingWithCanonicalNullTargetingKeyCase() throws {
        let testedCore = try configuredCore()
        let evaluationCase = try Self.evaluationCase(
            "test-case-null-targeting-key.json",
            caseIndex: 1
        )
        _ = testedCore.setEvaluationContext(evaluationCase.context)

        let result = try resolveEvaluation(evaluationCase, with: testedCore)

        assertEvaluationResult(result, evaluationCase)
        XCTAssertEqual(result["errorCode"] as? String, "TARGETING_KEY_MISSING")
    }

    func testMatchSharedEvaluationCorpusWithCanonicalUfcRulesConfiguration() throws {
        let testedCore = try configuredCore()
        var failures: [String] = []

        for evaluationCase in try Self.allEvaluationCases() {
            do {
                _ = testedCore.setEvaluationContext(evaluationCase.context)
                let result = try resolveEvaluation(evaluationCase, with: testedCore)
                if let mismatch = evaluationMismatch(result, evaluationCase) {
                    failures.append(mismatch)
                }
            } catch {
                failures.append("\(evaluationCase.source): \(error.localizedDescription)")
            }
        }

        XCTAssertTrue(failures.isEmpty, failures.joined(separator: "\n"))
    }

    private func configuredCore() throws -> NativeFfeCore {
        let testedCore = NativeFfeCore()
        let configuration = try testedCore.configurationFromString(Self.flagsConfigurationWire)
        _ = testedCore.setConfiguration(configuration.toMap())
        return testedCore
    }

    private func resolveEvaluation(
        _ evaluationCase: EvaluationCase,
        with testedCore: NativeFfeCore
    ) throws -> [String: Any] {
        switch evaluationCase.variationType {
        case "BOOLEAN":
            return testedCore.resolveBooleanEvaluation(
                flagKey: evaluationCase.flag,
                defaultValue: try XCTUnwrap(evaluationCase.defaultValue as? Bool)
            )
        case "STRING":
            return testedCore.resolveStringEvaluation(
                flagKey: evaluationCase.flag,
                defaultValue: try XCTUnwrap(evaluationCase.defaultValue as? String)
            )
        case "INTEGER", "NUMERIC":
            return testedCore.resolveNumberEvaluation(
                flagKey: evaluationCase.flag,
                defaultValue: try XCTUnwrap(doubleValue(evaluationCase.defaultValue))
            )
        case "JSON":
            return testedCore.resolveObjectEvaluation(
                flagKey: evaluationCase.flag,
                defaultValue: try XCTUnwrap(evaluationCase.defaultValue as? [String: Any])
            )
        default:
            XCTFail("Unsupported fixture variation type: \(evaluationCase.variationType)")
            return [:]
        }
    }

    private func assertEvaluationResult(
        _ result: [String: Any],
        _ evaluationCase: EvaluationCase,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        XCTAssertEqual(result["flagKey"] as? String, evaluationCase.flag, file: file, line: line)
        XCTAssertEqual(result["reason"] as? String, evaluationCase.expectedReason, file: file, line: line)
        assertJsonValue(result["value"], evaluationCase.expectedValue, file: file, line: line)
        if let expectedErrorCode = evaluationCase.expectedErrorCode {
            XCTAssertEqual(result["errorCode"] as? String, expectedErrorCode, file: file, line: line)
        }
    }

    private func evaluationMismatch(_ result: [String: Any], _ evaluationCase: EvaluationCase) -> String? {
        if result["flagKey"] as? String != evaluationCase.flag {
            return "\(evaluationCase.source): flagKey expected \(evaluationCase.flag), got \(String(describing: result["flagKey"]))"
        }
        if result["reason"] as? String != evaluationCase.expectedReason {
            return "\(evaluationCase.source): reason expected \(evaluationCase.expectedReason), got \(String(describing: result["reason"]))"
        }
        if !jsonValuesEqual(result["value"], evaluationCase.expectedValue) {
            return "\(evaluationCase.source): value expected \(String(describing: evaluationCase.expectedValue)), got \(String(describing: result["value"]))"
        }
        if let expectedErrorCode = evaluationCase.expectedErrorCode,
            result["errorCode"] as? String != expectedErrorCode {
            return "\(evaluationCase.source): errorCode expected \(String(describing: evaluationCase.expectedErrorCode)), got \(String(describing: result["errorCode"]))"
        }
        return nil
    }

    private func assertJsonValue(
        _ actual: Any?,
        _ expected: Any?,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        if let actualNumber = doubleValue(actual), let expectedNumber = doubleValue(expected) {
            XCTAssertEqual(actualNumber, expectedNumber, accuracy: numericTolerance, file: file, line: line)
            return
        }
        XCTAssertTrue(
            jsonValuesEqual(actual, expected),
            "Expected \(String(describing: expected)), got \(String(describing: actual))",
            file: file,
            line: line
        )
    }

    private func jsonValuesEqual(_ actual: Any?, _ expected: Any?) -> Bool {
        if isNull(actual), isNull(expected) {
            return true
        }
        if let actualBool = actual as? Bool, let expectedBool = expected as? Bool {
            return actualBool == expectedBool
        }
        if let actualNumber = doubleValue(actual), let expectedNumber = doubleValue(expected) {
            return abs(actualNumber - expectedNumber) <= numericTolerance
        }
        if let actualString = actual as? String, let expectedString = expected as? String {
            return actualString == expectedString
        }
        if let actualArray = actual as? [Any], let expectedArray = expected as? [Any] {
            guard actualArray.count == expectedArray.count else {
                return false
            }
            return zip(actualArray, expectedArray).allSatisfy(jsonValuesEqual)
        }
        if let actualDictionary = actual as? [String: Any],
            let expectedDictionary = expected as? [String: Any] {
            guard Set(actualDictionary.keys) == Set(expectedDictionary.keys) else {
                return false
            }
            return actualDictionary.keys.allSatisfy {
                jsonValuesEqual(actualDictionary[$0], expectedDictionary[$0])
            }
        }
        return false
    }

    private func isNull(_ value: Any?) -> Bool {
        value == nil || value is NSNull
    }

    private func doubleValue(_ value: Any?) -> Double? {
        if let number = value as? NSNumber {
            guard CFGetTypeID(number) != CFBooleanGetTypeID() else {
                return nil
            }
            return number.doubleValue
        }
        if let double = value as? Double {
            return double
        }
        if let int = value as? Int {
            return Double(int)
        }
        return nil
    }

    private struct EvaluationCase {
        let source: String
        let flag: String
        let variationType: String
        let defaultValue: Any
        let targetingKey: String?
        let attributes: [String: Any]
        let expectedValue: Any
        let expectedReason: String
        let expectedErrorCode: String?

        var context: [String: Any] {
            var context: [String: Any] = [
                "attributes": attributes,
            ]
            if let targetingKey {
                context["targetingKey"] = targetingKey
            }
            return context
        }
    }

    private static func evaluationCase(
        _ fileName: String,
        caseIndex: Int = 0
    ) throws -> EvaluationCase {
        try evaluationCases(fileName)[caseIndex]
    }

    private static func evaluationCases(_ fileName: String) throws -> [EvaluationCase] {
        let cases = try NativeFfeTestFixtures.jsonArray(
            "ffe-system-test-data/evaluation-cases/\(fileName)"
        )
        return try cases.enumerated().map { index, value in
            let caseJson = try XCTUnwrap(value as? [String: Any])
            return try evaluationCase(fileName, caseIndex: index, caseJson: caseJson)
        }
    }

    private static func evaluationCase(
        _ fileName: String,
        caseIndex: Int,
        caseJson: [String: Any]
    ) throws -> EvaluationCase {
        let resultJson = try XCTUnwrap(caseJson["result"] as? [String: Any])
        return EvaluationCase(
            source: "\(fileName)[\(caseIndex)]",
            flag: try XCTUnwrap(caseJson["flag"] as? String),
            variationType: try XCTUnwrap(caseJson["variationType"] as? String),
            defaultValue: try XCTUnwrap(caseJson["defaultValue"]),
            targetingKey: optionalString(caseJson["targetingKey"]),
            attributes: (caseJson["attributes"] as? [String: Any]) ?? [:],
            expectedValue: try XCTUnwrap(resultJson["value"]),
            expectedReason: try XCTUnwrap(resultJson["reason"] as? String),
            expectedErrorCode: optionalString(resultJson["errorCode"])
        )
    }

    private static func allEvaluationCases() throws -> [EvaluationCase] {
        try NativeFfeTestFixtures.fileNames(in: "ffe-system-test-data/evaluation-cases")
            .flatMap { try evaluationCases($0) }
    }

    private static func optionalString(_ value: Any?) -> String? {
        guard let value, !(value is NSNull) else {
            return nil
        }
        return String(describing: value)
    }

    private static func jsonObject(_ json: String) throws -> [String: Any] {
        let data = try XCTUnwrap(json.data(using: .utf8))
        return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    private static let flagsConfigurationWire: String = {
        try! NativeFfeTestFixtures.readString("native-ffe/rules-configuration-wire.json")
    }()

    private static let canonicalUfcConfig: String = {
        try! NativeFfeTestFixtures.readString("ffe-system-test-data/ufc-config.json")
    }()
}

private final class NativeFfeFakeDataStore: DataStore {
    var values: [String: (data: Data, version: DataStoreKeyVersion)] = [:]

    func setValue(_ value: Data, forKey key: String, version: DataStoreKeyVersion) {
        values[key] = (value, version)
    }

    func value(forKey key: String, callback: @escaping (DataStoreValueResult) -> Void) {
        guard let value = values[key] else {
            callback(.noValue)
            return
        }
        callback(.value(value.data, value.version))
    }

    func removeValue(forKey key: String) {
        values.removeValue(forKey: key)
    }

    func clearAllData() {
        values.removeAll()
    }

    func flush() {}
}
