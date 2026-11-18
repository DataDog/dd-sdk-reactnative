/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import XCTest
import DatadogCore
@_spi(Internal)
import DatadogFlags
import DatadogInternal
@_spi(Internal)
@testable
import DatadogSDKReactNative

class DdFlagsTests: XCTestCase {

    private var core: FlagsTestCore!
    private var implementation: DdFlagsImplementation!

    override func setUp() {
        super.setUp()
        // MockDatadogCore doesn't work here because it returns `nil` in `feature` method.
        core = FlagsTestCore()
        CoreRegistry.register(default: core)
        Flags.enable(in: core)
        implementation = DdFlagsImplementation(core: core)
    }

    override func tearDown() {
        CoreRegistry.unregisterDefault()
        super.tearDown()
    }

    // MARK: - Bridge Tests

    func testEnable() {
        let expectation = self.expectation(description: "Enable resolves")
        implementation.enable(["enabled": true], resolve: { _ in
            expectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Should not reject")
        })
        waitForExpectations(timeout: 1, handler: nil)
    }

    func testSetEvaluationContextSuccess() {
        let expectation = self.expectation(description: "SetEvaluationContext resolves with flags")

        let mockClient = MockFlagsClient()
        mockClient.assignments = [
            "flag1": FlagAssignment(
                allocationKey: "a",
                variationKey: "v",
                variation: .boolean(true),
                reason: "r",
                doLog: true
            )
        ]

        implementation.clientProviders["test_client"] = { mockClient }

        implementation.setEvaluationContext("test_client", targetingKey: "user_1", attributes: ["tier": "pro"], resolve: { result in
            guard let flags = result as? [String: Any] else {
                XCTFail("Expected dictionary result")
                expectation.fulfill()
                return
            }

            XCTAssertNotNil(flags["flag1"])
            if let flag = flags["flag1"] as? [String: Any] {
                XCTAssertEqual(flag["value"] as? Bool, true)
            } else {
                XCTFail("Expected flag1 dictionary")
            }

            expectation.fulfill()
        }, reject: { code, message, error in
            XCTFail("Should not reject: \(String(describing: code))")
            expectation.fulfill()
        })

        waitForExpectations(timeout: 1.0, handler: nil)

        XCTAssertEqual(mockClient.lastEvaluationContext?.targetingKey, "user_1")
        XCTAssertEqual(mockClient.lastEvaluationContext?.attributes["tier"], .string("pro"))
    }

    func testSetEvaluationContextClientNotInitialized() {
        let expectation = self.expectation(description: "SetEvaluationContext rejects when client returns nil assignments")

        let mockClient = MockFlagsClient()
        mockClient.assignments = nil // Simulates uninitialized state

        implementation.clientProviders["test_client"] = { mockClient }

        implementation.setEvaluationContext("test_client", targetingKey: "user_1", attributes: [:], resolve: { result in
            XCTFail("Should not resolve")
            expectation.fulfill()
        }, reject: { code, message, error in
            XCTAssertEqual(code, "CLIENT_NOT_INITIALIZED")
            XCTAssertNotNil(message)
            expectation.fulfill()
        })

        waitForExpectations(timeout: 1.0, handler: nil)
    }

    func testSetEvaluationContextFailure() {
        let expectation = self.expectation(description: "SetEvaluationContext rejects with error")

        let mockClient = MockFlagsClient()
        mockClient.errorToReturn = .networkError(NSError(domain: "test_domain", code: 400, userInfo: nil))

        implementation.clientProviders["test_client"] = { mockClient }

        implementation.setEvaluationContext("test_client", targetingKey: "user_1", attributes: [:], resolve: { result in
            XCTFail("Should not resolve")
            expectation.fulfill()
        }, reject: { code, message, error in
            XCTAssertEqual(code, "NETWORK_ERROR")
            XCTAssertNotNil(message)
            expectation.fulfill()
        })

        waitForExpectations(timeout: 1.0, handler: nil)
    }

    func testSetEvaluationContextInitializationTimedOut() {
        let expectation = self.expectation(description: "SetEvaluationContext rejects with initialization timeout")

        let mockClient = MockFlagsClient()
        mockClient.errorToReturn = .initializationTimedOut

        implementation.clientProviders["test_client"] = { mockClient }

        implementation.setEvaluationContext("test_client", targetingKey: "user_1", attributes: [:], resolve: { result in
            XCTFail("Should not resolve")
            expectation.fulfill()
        }, reject: { code, message, error in
            XCTAssertEqual(code, "INITIALIZATION_TIMED_OUT")
            XCTAssertNotNil(message)
            expectation.fulfill()
        })

        waitForExpectations(timeout: 1.0, handler: nil)
    }

    func testTrackEvaluation() {
        let expectation = self.expectation(description: "TrackEvaluation resolves")

        let mockClient = MockFlagsClient()
        implementation.clientProviders["test_client"] = { mockClient }

        let rawFlag: NSDictionary = [
            "allocationKey": "alloc",
            "variationKey": "var",
            "reason": "reason",
            "doLog": true,
            "value": true
        ]

        implementation.trackEvaluation("test_client", key: "feature_flag", rawFlag: rawFlag, targetingKey: "user_1", attributes: [:], resolve: { result in
            XCTAssertNil(result)
            expectation.fulfill()
        }, reject: { code, message, error in
            XCTFail("Should not reject: \(String(describing: code))")
            expectation.fulfill()
        })

        waitForExpectations(timeout: 1.0, handler: nil)

        XCTAssertEqual(mockClient.trackedEvaluation?.key, "feature_flag")
        XCTAssertEqual(mockClient.trackedEvaluation?.assignment.variationKey, "var")
    }

    func testTrackEvaluationWithInvalidFlag() {
        let expectation = self.expectation(description: "TrackEvaluation rejects invalid flag")

        let invalidFlag: NSDictionary = [
            "allocationKey": "alloc"
            // Missing required fields
        ]

        implementation.trackEvaluation("test_client", key: "feature_flag", rawFlag: invalidFlag, targetingKey: "user_1", attributes: [:], resolve: { result in
            XCTFail("Should not resolve")
            expectation.fulfill()
        }, reject: { code, message, error in
            XCTAssertEqual(code, "INVALID_FLAG_ASSIGNMENT")
            XCTAssertNotNil(message)
            expectation.fulfill()
        })

        waitForExpectations(timeout: 1.0, handler: nil)
    }

    func testTrackExposureIsIndependentAndPreservesSerialID() {
        let client = MockFlagsClient()
        implementation.clientProviders["tracking"] = { client }
        let flag: NSDictionary = [
            "allocationKey": "allocation", "variationKey": "on",
            "doLog": true, "serialId": "9007199254740993"
        ]
        var resolved = false
        implementation.trackExposure("tracking", key: "flag", rawFlag: flag, targetingKey: "user", attributes: ["country": "US"], resolve: { result in
            XCTAssertNil(result)
            resolved = true
        }, reject: { _, _, _ in XCTFail("Should resolve") })

        XCTAssertTrue(resolved)
        XCTAssertEqual(client.trackedExposure?.key, "flag")
        XCTAssertEqual(client.trackedExposure?.assignment.allocationKey, "allocation")
        XCTAssertEqual(client.trackedExposure?.assignment.variationKey, "on")
        XCTAssertEqual(client.trackedExposure?.assignment.serialID, 9_007_199_254_740_993)
        XCTAssertEqual(client.trackedExposure?.context.targetingKey, "user")
        XCTAssertEqual(client.trackedExposure?.context.attributes["country"], .string("US"))
        XCTAssertNil(client.trackedEvaluation)
        XCTAssertNil(client.trackedEvaluationEvent)
        XCTAssertNil(client.trackedRUMEvaluation)
        XCTAssertNil(client.lastEvaluationContext)
    }

    func testTrackEvaluationEventIsIndependent() {
        let client = MockFlagsClient()
        let other = MockFlagsClient()
        implementation.clientProviders["tracking"] = { client }
        implementation.clientProviders["other"] = { other }
        let flag: NSDictionary = ["allocationKey": "allocation", "variationKey": "off", "doLog": false]
        var resolved = false
        implementation.trackProtectedEvaluation("tracking", key: "flag", rawFlag: flag, targetingKey: "user", attributes: ["dd_evaluation_telemetry_opt_out": true], errorCode: nil, observeFullEvaluationData: false, telemetryTargetingKey: "user", resolve: { _ in
            resolved = true
        }, reject: { _, _, _ in XCTFail("Should resolve") })

        XCTAssertTrue(resolved)
        XCTAssertEqual(client.trackedEvaluationEvent?.key, "flag")
        XCTAssertEqual(client.trackedEvaluationEvent?.assignment?.variationKey, "off")
        XCTAssertEqual(client.trackedEvaluationEvent?.assignment?.doLog, false)
        XCTAssertEqual(client.trackedEvaluationEvent?.context.targetingKey, "user")
        XCTAssertEqual(client.trackedEvaluationEvent?.context.attributes["dd_evaluation_telemetry_opt_out"], .bool(true))
        XCTAssertNil(client.trackedEvaluationEvent?.errorCode)
        XCTAssertEqual(client.trackedEvaluationEvent?.observeFullEvaluationData, false)
        XCTAssertEqual(client.trackedEvaluationEvent?.telemetryTargetingKey, "user")
        XCTAssertEqual(client.legacyEvaluationEventCount, 0)
        XCTAssertNil(client.trackedExposure)
        XCTAssertNil(client.trackedEvaluation)
        XCTAssertNil(client.trackedRUMEvaluation)
        XCTAssertNil(client.lastEvaluationContext)
        XCTAssertNil(other.trackedEvaluationEvent)
    }

    func testTrackRumEvaluationIsIndependentAndPreservesOptOutContext() {
        let client = MockFlagsClient()
        implementation.clientProviders["tracking"] = { client }
        var resolved = false
        implementation.trackRumEvaluation("tracking", key: "flag", variant: "on", targetingKey: "user", attributes: ["dd_evaluation_telemetry_opt_out": true], resolve: { _ in
            resolved = true
        }, reject: { _, _, _ in XCTFail("Should resolve") })

        XCTAssertTrue(resolved)
        XCTAssertEqual(client.trackedRUMEvaluation?.key, "flag")
        XCTAssertEqual(client.trackedRUMEvaluation?.variant, "on")
        XCTAssertEqual(client.trackedRUMEvaluation?.context.targetingKey, "user")
        XCTAssertEqual(client.trackedRUMEvaluation?.context.attributes["dd_evaluation_telemetry_opt_out"], .bool(true))
        XCTAssertNil(client.trackedExposure)
        XCTAssertNil(client.trackedEvaluation)
        XCTAssertNil(client.trackedEvaluationEvent)
        XCTAssertNil(client.lastEvaluationContext)
    }

    func testTrackingPreservesPrivacyPolicyAndOriginalOptOutContext() {
        let client = MockFlagsClient()
        implementation.clientProviders["tracking"] = { client }
        for observeFullEvaluationData in [false, true] {
            for telemetryTargetingKey in [nil, "", "telemetry-user"] as [String?] {
                var resolved = false
                implementation.trackProtectedEvaluation(
                    "tracking", key: "flag", rawFlag: nil,
                    targetingKey: "original-subject", attributes: ["dd_evaluation_telemetry_opt_out": true],
                    errorCode: "FLAG_NOT_FOUND", observeFullEvaluationData: observeFullEvaluationData,
                    telemetryTargetingKey: telemetryTargetingKey,
                    resolve: { _ in resolved = true }, reject: { _, _, _ in XCTFail("Should resolve") }
                )
                XCTAssertTrue(resolved)
                XCTAssertEqual(client.trackedEvaluationEvent?.context.targetingKey, "original-subject")
                XCTAssertEqual(client.trackedEvaluationEvent?.context.attributes["dd_evaluation_telemetry_opt_out"], .bool(true))
                XCTAssertEqual(client.trackedEvaluationEvent?.observeFullEvaluationData, observeFullEvaluationData)
                XCTAssertEqual(client.trackedEvaluationEvent?.telemetryTargetingKey, telemetryTargetingKey)
                XCTAssertEqual(client.trackedEvaluationEvent?.errorCode, "FLAG_NOT_FOUND")
                XCTAssertEqual(client.legacyEvaluationEventCount, 0)
            }
        }
    }

    func testTrackEvaluationEventWithoutAssignment() {
        let client = MockFlagsClient()
        implementation.clientProviders["tracking"] = { client }
        for errorCode in [nil, "FLAG_NOT_FOUND"] as [String?] {
            var resolved = false
            implementation.trackProtectedEvaluation("tracking", key: "flag", rawFlag: nil, targetingKey: "user", attributes: [:], errorCode: errorCode, observeFullEvaluationData: false, telemetryTargetingKey: "user", resolve: { _ in
                resolved = true
            }, reject: { _, _, _ in XCTFail("Should resolve") })
            XCTAssertTrue(resolved)
            XCTAssertEqual(client.trackedEvaluationEvent?.key, "flag")
            XCTAssertNil(client.trackedEvaluationEvent?.assignment)
            XCTAssertEqual(client.trackedEvaluationEvent?.errorCode, errorCode)
        }
        XCTAssertNil(client.trackedExposure)
        XCTAssertNil(client.trackedEvaluation)
        XCTAssertNil(client.trackedRUMEvaluation)
    }

    func testIndependentTrackingRejectsMalformedAssignments() {
        let client = MockFlagsClient()
        implementation.clientProviders["tracking"] = { client }
        var rejectionCount = 0
        let reject: RCTPromiseReject = { code, _, _ in
            XCTAssertEqual(code, "INVALID_FLAG_ASSIGNMENT")
            rejectionCount += 1
        }
        let malformed: [NSDictionary] = [[:], ["allocationKey": "a", "variationKey": "v"], ["allocationKey": 1, "variationKey": "v", "doLog": true]]
        for flag in malformed {
            implementation.trackExposure("tracking", key: "flag", rawFlag: flag, targetingKey: "user", attributes: [:], resolve: { _ in XCTFail("Should reject") }, reject: reject)
            implementation.trackProtectedEvaluation("tracking", key: "flag", rawFlag: flag, targetingKey: "user", attributes: [:], errorCode: nil, observeFullEvaluationData: false, telemetryTargetingKey: "user", resolve: { _ in XCTFail("Should reject") }, reject: reject)
        }
        XCTAssertEqual(rejectionCount, 6)
        XCTAssertNil(client.trackedExposure)
        XCTAssertNil(client.trackedEvaluationEvent)
    }

    // MARK: - AnyValue Tests

    func testAnyValueWrapUnwrapNull() {
        let original: Any = NSNull()
        let wrapped = AnyValue.wrap(original)

        if case .null = wrapped {
            XCTAssertTrue(true)
        } else {
            XCTFail("Expected .null, got \(wrapped)")
        }

        let unwrapped = wrapped.unwrap()
        XCTAssertTrue(unwrapped is NSNull)
    }

    func testAnyValueWrapUnwrapString() {
        let original = "test string"
        let wrapped = AnyValue.wrap(original)

        if case .string(let value) = wrapped {
            XCTAssertEqual(value, original)
        } else {
            XCTFail("Expected .string, got \(wrapped)")
        }

        let unwrapped = wrapped.unwrap() as? String
        XCTAssertEqual(unwrapped, original)
    }

    func testAnyValueWrapUnwrapBool() {
        let original = true
        let wrapped = AnyValue.wrap(original)

        if case .bool(let value) = wrapped {
            XCTAssertEqual(value, original)
        } else {
            XCTFail("Expected .bool, got \(wrapped)")
        }

        let unwrapped = wrapped.unwrap() as? Bool
        XCTAssertEqual(unwrapped, original)
    }

    func testAnyValueWrapUnwrapInt() {
        let original = 42
        let wrapped = AnyValue.wrap(original)

        if case .int(let value) = wrapped {
            XCTAssertEqual(value, original)
        } else {
            XCTFail("Expected .int, got \(wrapped)")
        }

        let unwrapped = wrapped.unwrap() as? Int
        XCTAssertEqual(unwrapped, original)
    }

    func testAnyValueWrapUnwrapDouble() {
        let original = 3.14
        let wrapped = AnyValue.wrap(original)

        if case .double(let value) = wrapped {
            XCTAssertEqual(value, original)
        } else {
            XCTFail("Expected .double, got \(wrapped)")
        }

        let unwrapped = wrapped.unwrap() as? Double
        XCTAssertEqual(unwrapped, original)
    }

    func testAnyValueWrapUnwrapDictionary() {
        let original: [String: Any] = ["key": "value", "number": 1]
        let wrapped = AnyValue.wrap(original)

        if case .dictionary(let dict) = wrapped {
            XCTAssertEqual(dict.count, 2)
            if let val = dict["key"], case .string(let s) = val {
                XCTAssertEqual(s, "value")
            } else {
                XCTFail("Expected string for key")
            }
            if let val = dict["number"], case .int(let i) = val {
                XCTAssertEqual(i, 1)
            } else {
                XCTFail("Expected int for number")
            }
        } else {
            XCTFail("Expected .dictionary, got \(wrapped)")
        }

        let unwrapped = wrapped.unwrap() as? [String: Any]
        XCTAssertEqual(unwrapped?["key"] as? String, "value")
        XCTAssertEqual(unwrapped?["number"] as? Int, 1)
    }

    func testAnyValueWrapUnwrapArray() {
        let original: [Any] = ["value", 1]
        let wrapped = AnyValue.wrap(original)

        if case .array(let array) = wrapped {
            XCTAssertEqual(array.count, 2)
            if case .string(let s) = array[0] {
                XCTAssertEqual(s, "value")
            } else {
                XCTFail("Expected string at index 0")
            }
            if case .int(let i) = array[1] {
                XCTAssertEqual(i, 1)
            } else {
                XCTFail("Expected int at index 1")
            }
        } else {
            XCTFail("Expected .array, got \(wrapped)")
        }

        let unwrapped = wrapped.unwrap() as? [Any]
        XCTAssertEqual(unwrapped?[0] as? String, "value")
        XCTAssertEqual(unwrapped?[1] as? Int, 1)
    }

    func testAnyValueWrapUnknown() {
        struct UnknownType {}
        let original = UnknownType()
        let wrapped = AnyValue.wrap(original)

        if case .null = wrapped {
            XCTAssertTrue(true)
        } else {
            XCTFail("Expected .null for unknown type, got \(wrapped)")
        }
    }

    // MARK: - Configuration Tests

    func testConfigurationParsing() {
        let configDict: NSDictionary = [
            "enabled": true,
            "trackExposures": false,
            "rumIntegrationEnabled": false,
            "customFlagsEndpoint": "https://flags.example.com",
            "customExposureEndpoint": "https://exposure.example.com",
            "customEvaluationEndpoint": "https://evaluation.example.com"
        ]

        let config = configDict.asFlagsConfiguration()

        XCTAssertNotNil(config)
        XCTAssertEqual(config?.trackExposures, false)
        XCTAssertEqual(config?.rumIntegrationEnabled, false)
        XCTAssertEqual(config?.customFlagsEndpoint?.absoluteString, "https://flags.example.com/precompute-assignments")
        XCTAssertEqual(config?.customExposureEndpoint?.absoluteString, "https://exposure.example.com/api/v2/exposures")
        XCTAssertEqual(config?.customEvaluationEndpoint?.absoluteString, "https://evaluation.example.com/api/v2/flagevaluation")
    }

    func testConfigurationParsingDefaults() {
        let configDict: NSDictionary = ["enabled": true]
        let config = configDict.asFlagsConfiguration()

        XCTAssertNotNil(config)
        XCTAssertEqual(config?.trackExposures, true)
        XCTAssertEqual(config?.rumIntegrationEnabled, true)
        XCTAssertNil(config?.customFlagsEndpoint)
        XCTAssertNil(config?.customExposureEndpoint)
        XCTAssertNil(config?.customEvaluationEndpoint)
    }

    func testConfigurationParsingEvaluationEndpointOnly() {
        let config = (["enabled": true, "customEvaluationEndpoint": "https://evaluation.example.com/proxy"] as NSDictionary).asFlagsConfiguration()
        XCTAssertEqual(config?.customEvaluationEndpoint?.absoluteString, "https://evaluation.example.com/proxy/api/v2/flagevaluation")
        XCTAssertNil(config?.customFlagsEndpoint)
        XCTAssertNil(config?.customExposureEndpoint)
    }

    func testConfigurationParsingDisabled() {
        let configDict: NSDictionary = ["enabled": false]
        let config = configDict.asFlagsConfiguration()
        XCTAssertNil(config)
    }

    // MARK: - FlagAssignment Tests

    func testFlagAssignmentToDictionary() {
        let assignment = FlagAssignment(
            allocationKey: "alloc",
            variationKey: "var",
            variation: .boolean(true),
            reason: "reason",
            doLog: true
        )

        let dict = assignment.asDictionary(flagKey: "flag1")

        XCTAssertEqual(dict["key"] as? String, "flag1")
        XCTAssertEqual(dict["value"] as? Bool, true)
        XCTAssertEqual(dict["allocationKey"] as? String, "alloc")
        XCTAssertEqual(dict["variationKey"] as? String, "var")
        XCTAssertEqual(dict["reason"] as? String, "reason")
        XCTAssertEqual(dict["doLog"] as? Bool, true)
        // Check Android parity fields
        XCTAssertEqual(dict["variationType"] as? String, "")
        XCTAssertEqual(dict["variationValue"] as? String, "")
        XCTAssertNotNil(dict["extraLogging"] as? [String: Any])
    }

    func testDictionaryToFlagAssignment() {
        let dict: NSDictionary = [
            "allocationKey": "alloc",
            "variationKey": "var",
            "reason": "reason",
            "doLog": true,
            "value": "string_value"
        ]

        let assignment = dict.asFlagAssignment()

        XCTAssertNotNil(assignment)
        XCTAssertEqual(assignment?.allocationKey, "alloc")
        XCTAssertEqual(assignment?.variationKey, "var")
        if case .string(let v) = assignment?.variation {
            XCTAssertEqual(v, "string_value")
        } else {
            XCTFail("Expected string variation")
        }
    }
}

private class FlagsTestCore: DatadogCoreProtocol {
    var remoteConfiguration: RemoteConfiguration? { nil }

    private var features: [String: DatadogFeature] = [:]

    func register<T>(feature: T) throws where T : DatadogFeature {
        features[T.name] = feature
    }

    func feature<T>(named name: String, type: T.Type) -> T? {
        return features[name] as? T
    }

    func scope<T>(for featureType: T.Type) -> any FeatureScope where T : DatadogFeature {
        return NOPFeatureScope()
    }

    func send(message: FeatureMessage, else fallback: @escaping () -> Void) {}
    func set<Context>(context: @escaping () -> Context?) where Context: AdditionalContext {}
    func mostRecentModifiedFileAt(before: Date) throws -> Date? { return nil }
}

private class MockFlagsClient: FlagsClientProtocol, FlagsClientInternal {
    func getDetails<T>(key: String, defaultValue: T) -> DatadogFlags.FlagDetails<T> where T : DatadogFlags.FlagValue, T : Equatable {
        return FlagDetails(key: key, value: defaultValue, variant: nil, reason: nil, error: nil)
    }

    var assignments: [String: FlagAssignment]? = [:]
    var errorToReturn: FlagsError?

    var lastEvaluationContext: FlagsEvaluationContext?
    var trackedEvaluation: (key: String, assignment: FlagAssignment, context: FlagsEvaluationContext)?
    var trackedExposure: (key: String, assignment: FlagAssignment, context: FlagsEvaluationContext)?
    var trackedEvaluationEvent: (key: String, assignment: FlagAssignment?, context: FlagsEvaluationContext, errorCode: String?, observeFullEvaluationData: Bool, telemetryTargetingKey: String?)?
    var legacyEvaluationEventCount = 0
    var trackedRUMEvaluation: (key: String, variant: String, context: FlagsEvaluationContext)?

    func setEvaluationContext(_ context: DatadogFlags.FlagsEvaluationContext, completion: @escaping (Result<Void, DatadogFlags.FlagsError>) -> Void) {
        lastEvaluationContext = context
        if let error = errorToReturn {
            completion(.failure(error))
        } else {
            completion(.success(()))
        }
    }

    func getFlagAssignments() -> [String: DatadogFlags.FlagAssignment]? {
        return assignments
    }

    func sendFlagEvaluation(key: String, assignment: DatadogFlags.FlagAssignment, context: DatadogFlags.FlagsEvaluationContext) {
        trackedEvaluation = (key, assignment, context)
    }

    func sendFlagExposure(key: String, assignment: FlagAssignment, context: FlagsEvaluationContext) {
        trackedExposure = (key, assignment, context)
    }

    func sendFlagEvaluationEvent(key: String, assignment: FlagAssignment?, context: FlagsEvaluationContext, errorCode: String?) {
        legacyEvaluationEventCount += 1
    }

    func sendFlagEvaluationEvent(key: String, assignment: FlagAssignment?, context: FlagsEvaluationContext, telemetryTargetingKey: String?, observeFullEvaluationData: Bool, errorCode: String?) {
        trackedEvaluationEvent = (key, assignment, context, errorCode, observeFullEvaluationData, telemetryTargetingKey)
    }

    func sendFlagRUMEvaluation(key: String, variant: String, context: FlagsEvaluationContext) {
        trackedRUMEvaluation = (key, variant, context)
    }
}
