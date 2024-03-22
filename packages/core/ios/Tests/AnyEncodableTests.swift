/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2020 Datadog, Inc.
 */

import XCTest
@testable import DatadogSDKReactNative

internal class AnyEncodableTests: XCTestCase {
    // MARK: - Casting attributes

    func testWhenCastingAttributes_thenItPreservesTypeInformationForKnownTypes() throws {
        // Given
        let attributes = NSDictionary(
            dictionary: [
                "array": [1, 2, 3],
                "boolean-true": true,
                "boolean-false": false,
                "date": Date(timeIntervalSince1970: 123),
                "double": 3.141_592_653_589_793,
                "integer": 42,
                "nested": [
                    "a": "alpha",
                    "b": "bravo",
                    "c": "charlie"
                ],
                "null": NSNull(),
                "string": "string",
                "url": NSURL(string: "https://datadoghq.com")!, // swiftlint:disable:this force_unwrapping
            ]
        )

        // When
        let castedAttributes = castAttributesToSwift(attributes)

        // Then
        XCTAssertEqual(castedAttributes.count, attributes.count)
        XCTAssertEqual(castedAttributes["boolean-true"] as? Bool, true, "It preserves Bool type information")
        XCTAssertEqual(castedAttributes["boolean-false"] as? Bool, false, "It preserves Bool type information")
        XCTAssertEqual(castedAttributes["double"] as? Double, 3.141_592_653_589_793, "It preserves Double type information")
        XCTAssertEqual(castedAttributes["integer"] as? Int64, 42, "It preserves Int64 type information")
        XCTAssertEqual(castedAttributes["string"] as? String, "string", "It preserves String type information")

        XCTAssertEqual(
            (castedAttributes["array"] as? AnyEncodable)?.value as? [Int],
            [1, 2, 3],
            "It ereases [Int] type information, but preserves value"
        )
        XCTAssertEqual(
            (castedAttributes["date"] as? AnyEncodable)?.value as? Date,
            Date(timeIntervalSince1970: 123),
            "It ereases Date type information, but preserves value"
        )
        XCTAssertEqual(
            (castedAttributes["nested"] as? AnyEncodable)?.value as? [String: String],
            ["a": "alpha", "b": "bravo", "c": "charlie"],
            "It ereases [String: String] type information, but preserves value"
        )
        XCTAssertEqual(
            (castedAttributes["null"] as? AnyEncodable)?.value as? NSNull,
            NSNull(),
            "It ereases NSNull type information, but preserves value"
        )
        XCTAssertEqual(
            (castedAttributes["url"] as? AnyEncodable)?.value as? URL,
            URL(string: "https://datadoghq.com"),
            "It ereases NSURL type information, but preserves value"
        )
    }

    // MARK: - Encoding

    func testWhenEreasingTypeInformation_thenItPreservesDataRepresentationWhenEncoding() throws {
        // Given
        let dictionary: [String: Any] = [
            "array": [1, 2, 3],
            "boolean": true,
            "date": Date(timeIntervalSince1970: 0),
            "double": 3.141,
            "integer": 42,
            "nested": [
                "a": "alpha",
                "b": "bravo",
                "c": "charlie"
            ],
            "null": NSNull(),
            "string": "string",
            "url": NSURL(string: "https://datadoghq.com") as Any
        ]

        // When
        let anyEncodableDictionary = dictionary.mapValues { anyValue in AnyEncodable(anyValue) }
        let receivedJSONString = try encodeToJSONString(anyEncodableDictionary)

        // Then
        let expectedJSONString = """
        {
          "array" : [
            1,
            2,
            3
          ],
          "boolean" : true,
          "date" : "1970-01-01T00:00:00Z",
          "double" : 3.141,
          "integer" : 42,
          "nested" : {
            "a" : "alpha",
            "b" : "bravo",
            "c" : "charlie"
          },
          "null" : null,
          "string" : "string",
          "url" : "https:\\/\\/datadoghq.com"
        }
        """

        XCTAssertEqual(receivedJSONString, expectedJSONString)
    }

    private func encodeToJSONString(_ dictionary: [String: AnyEncodable]) throws -> String {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.sortedKeys, .prettyPrinted]
        let jsonData = try encoder.encode(dictionary)
        return String(data: jsonData, encoding: .utf8) ?? ""
    }
}
