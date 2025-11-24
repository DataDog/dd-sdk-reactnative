/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import XCTest
import DatadogCore
import DatadogFlags
import DatadogInternal
@testable import DatadogSDKReactNative

class DdFlagsTests: XCTestCase {

    private var core: FlagsTestCore!

    override func setUp() {
        super.setUp()
        // MockDatadogCore doesn't work here because it returns `nil` in `feature` method.
        core = FlagsTestCore()
        CoreRegistry.register(default: core)
        Flags.enable(in: core)
    }

    override func tearDown() {
        CoreRegistry.unregisterDefault()
        super.tearDown()
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
    
    // MARK: - FlagDetails Tests
    
    func testFlagDetailsToSerializedDictionarySuccess() {
        let details = FlagDetails(
            key: "test_flag",
            value: "test_value",
            variant: "control",
            reason: "targeting_match",
            error: nil
        )
        
        let serialized = details.toSerializedDictionary()
        
        XCTAssertEqual(serialized["key"] as? String, "test_flag")
        XCTAssertEqual(serialized["value"] as? String, "test_value")
        XCTAssertEqual(serialized["variant"] as? String, "control")
        XCTAssertEqual(serialized["reason"] as? String, "targeting_match")
        XCTAssertNil(serialized["error"] as? String)
    }
    
    func testFlagDetailsToSerializedDictionaryWithError() {
        let details = FlagDetails<Bool>(
            key: "test_flag",
            value: false,
            variant: nil,
            reason: nil,
            error: .flagNotFound
        )
        
        let serialized = details.toSerializedDictionary()
        
        XCTAssertEqual(serialized["key"] as? String, "test_flag")
        XCTAssertTrue(serialized["value"] as? Bool != nil)
        XCTAssertNil(serialized["variant"] as? String)
        XCTAssertNil(serialized["reason"] as? String)
        XCTAssertEqual(serialized["error"] as? String, "FLAG_NOT_FOUND")
    }
    
    func testFlagDetailsToSerializedDictionaryWithOtherErrors() {
        let errorCases: [(FlagEvaluationError, String)] = [
            (.providerNotReady, "PROVIDER_NOT_READY"),
            (.typeMismatch, "TYPE_MISMATCH"),
            (.flagNotFound, "FLAG_NOT_FOUND")
        ]
        
        for (error, expectedString) in errorCases {
            let details = FlagDetails<Bool>(
                key: "key",
                value: false,
                variant: nil,
                reason: nil,
                error: error
            )
            let serialized = details.toSerializedDictionary()
            XCTAssertEqual(serialized["error"] as? String, expectedString)
        }
    }
    
    func testFlagDetailsToSerializedDictionaryWithDifferentValueTypes() {
        let boolDetails = FlagDetails(key: "k", value: true, variant: nil, reason: nil, error: nil)
        XCTAssertEqual(boolDetails.toSerializedDictionary()["value"] as? Bool, true)
        
        let intDetails = FlagDetails(key: "k", value: 123, variant: nil, reason: nil, error: nil)
        XCTAssertEqual(intDetails.toSerializedDictionary()["value"] as? Int, 123)
        
        let doubleDetails = FlagDetails(key: "k", value: 12.34, variant: nil, reason: nil, error: nil)
        XCTAssertEqual(doubleDetails.toSerializedDictionary()["value"] as? Double, 12.34)
        
        let anyValueDetails = FlagDetails(key: "k", value: AnyValue.string("s"), variant: nil, reason: nil, error: nil)
        XCTAssertEqual(anyValueDetails.toSerializedDictionary()["value"] as? String, "s")
        
        struct Unknown: Equatable {}
        let unknownDetails = FlagDetails(key: "k", value: Unknown(), variant: nil, reason: nil, error: nil)
        XCTAssertTrue(unknownDetails.toSerializedDictionary()["value"] as? NSNull != nil)
    }
    
    // MARK: - get*Details Tests

    func testGetBooleanDetails() {        
        let implementation = DdFlagsImplementation()
        
        let expectation = self.expectation(description: "Resolution called")
        implementation.getBooleanDetails("default", key: "test_key", defaultValue: true, resolve: { result in
            guard let dict = result as? [String: Any] else {
                XCTFail("Expected dictionary result")
                expectation.fulfill()
                return
            }
            XCTAssertEqual(dict["value"] as? Bool, true)
            expectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Should not reject")
            expectation.fulfill()
        })
        
        waitForExpectations(timeout: 1, handler: nil)
    }

    func testGetStringDetails() {
        let implementation = DdFlagsImplementation()
        
        let expectation = self.expectation(description: "Resolution called")
        implementation.getStringDetails("default", key: "test_key", defaultValue: "default", resolve: { result in
            guard let dict = result as? [String: Any] else {
                XCTFail("Expected dictionary result")
                expectation.fulfill()
                return
            }
            XCTAssertEqual(dict["value"] as? String, "default")
            expectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Should not reject")
            expectation.fulfill()
        })
        
        waitForExpectations(timeout: 1, handler: nil)
    }

    func testGetNumberDetails() {
        let implementation = DdFlagsImplementation()
        
        let expectation = self.expectation(description: "Resolution called")
        implementation.getNumberDetails("default", key: "test_key", defaultValue: 123.45, resolve: { result in
            guard let dict = result as? [String: Any] else {
                XCTFail("Expected dictionary result")
                expectation.fulfill()
                return
            }
            XCTAssertEqual(dict["value"] as? Double, 123.45)
            expectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Should not reject")
            expectation.fulfill()
        })
        
        waitForExpectations(timeout: 1, handler: nil)
    }

    func testGetObjectDetails() {
        let implementation = DdFlagsImplementation(core: core)
        let defaultValue: [String: Any] = ["foo": "bar"]
        
        let expectation = self.expectation(description: "Resolution called")
        implementation.getObjectDetails("default", key: "test_key", defaultValue: defaultValue, resolve: { result in
            guard let dict = result as? [String: Any] else {
                XCTFail("Expected dictionary result")
                expectation.fulfill()
                return
            }
            guard let value = dict["value"] as? [String: Any] else {
                 XCTFail("Expected dictionary value")
                 expectation.fulfill()
                 return
            }
            XCTAssertEqual(value["foo"] as? String, "bar")
            expectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Should not reject")
            expectation.fulfill()
        })
        
        waitForExpectations(timeout: 1, handler: nil)
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
