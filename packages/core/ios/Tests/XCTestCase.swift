/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-Present Datadog, Inc.
 */

import Foundation
import XCTest

extension XCTestCase {
    func AssertEncodedRepresentationsEqual<RHS, LHS>(
        _ rhs: RHS,
        _ lhs: LHS,
        file: StaticString = #filePath,
        line: UInt = #line
    ) throws where RHS: Encodable, LHS: Encodable {
        let prettyEncoder = JSONEncoder()
        prettyEncoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        do {
            let encodedValue1: Data
            let encodedValue2: Data
            if #available(iOS 13.0, *) {
                encodedValue1 = try prettyEncoder.encode(rhs)
                encodedValue2 = try prettyEncoder.encode(lhs)
            } else {
                encodedValue1 = try prettyEncoder.encode(EncodingContainer(rhs))
                encodedValue2 = try prettyEncoder.encode(EncodingContainer(lhs))
            }
            let value1JSONString = String(data: encodedValue1, encoding: .utf8)
            let value2JSONString = String(data: encodedValue2, encoding: .utf8)
            XCTAssertEqual(value1JSONString, value2JSONString, file: file, line: line)
        } catch let exception {
            XCTFail("Failed to encode one of the values in `AssertEncodedRepresentationsEqual`", file: file, line: line)
            throw exception
        }
    }

    /// Prior to `iOS13.0`, the `JSONEncoder` supports only object or array as the root type.
    /// Hence we can't test encoding `Encodable` values directly and we need to wrap it inside this `EncodingContainer` container.
    ///
    /// Reference: https://bugs.swift.org/browse/SR-6163
    struct EncodingContainer<Value: Encodable>: Encodable {
        let value: Value

        init(_ value: Value) {
            self.value = value
        }
    }
}
