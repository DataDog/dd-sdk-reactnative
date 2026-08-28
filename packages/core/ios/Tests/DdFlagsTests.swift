/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

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
            "assignmentRequestTimeoutMs": 2_500,
            "assignmentRequestRetryCount": 3
        ]

        let config = configDict.asFlagsConfiguration()

        XCTAssertNotNil(config)
        XCTAssertEqual(config?.trackExposures, false)
        XCTAssertEqual(config?.rumIntegrationEnabled, false)
        XCTAssertEqual(config?.customFlagsEndpoint?.absoluteString, "https://flags.example.com/precompute-assignments")
        XCTAssertEqual(config?.customExposureEndpoint?.absoluteString, "https://exposure.example.com/api/v2/exposures")
        XCTAssertEqual(config?.assignmentRequestTimeout, 2.5)
        XCTAssertEqual(config?.assignmentRequestRetryCount, 3)
    }

    func testConfigurationParsingDefaults() {
        let configDict: NSDictionary = ["enabled": true]
        let config = configDict.asFlagsConfiguration()

        XCTAssertNotNil(config)
        XCTAssertEqual(config?.trackExposures, true)
        XCTAssertEqual(config?.rumIntegrationEnabled, true)
        XCTAssertNil(config?.customFlagsEndpoint)
        XCTAssertNil(config?.customExposureEndpoint)
        XCTAssertEqual(config?.assignmentRequestTimeout, 1)
        XCTAssertEqual(config?.assignmentRequestRetryCount, 1)
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
}
