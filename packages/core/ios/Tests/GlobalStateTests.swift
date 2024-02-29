/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-Present Datadog, Inc.
 */

import XCTest
@testable import DatadogSDKReactNative

class GlobalStateTests: XCTestCase {
    override func setUp() {
        super.setUp()
        GlobalState.globalAttributes.removeAll()
    }

    override func tearDown() {
        GlobalState.globalAttributes.removeAll()
        super.tearDown()
    }

    func testAttributeAdded() throws {
        GlobalState.addAttribute(forKey: "foo", value: "bar")
        GlobalState.addAttribute(forKey: "int", value: 42)

        XCTAssertEqual(GlobalState.globalAttributes["foo"] as? String, "bar")
        XCTAssertEqual(GlobalState.globalAttributes["int"] as? Int, 42)
    }

    func testAttributeRemoved() throws {
        GlobalState.addAttribute(forKey: "foo", value: "bar")
        GlobalState.removeAttribute(key: "foo")

        XCTAssertTrue(GlobalState.globalAttributes.isEmpty)

        GlobalState.addAttribute(forKey: "int", value: 42)
        GlobalState.removeAttribute(key: "int")

        XCTAssertTrue(GlobalState.globalAttributes.isEmpty)
    }

    func testAttributeRemovedViaNilValue() throws {
        GlobalState.addAttribute(forKey: "foo", value: "bar")
        GlobalState.addAttribute(forKey: "foo", value: nil)

        XCTAssertTrue(GlobalState.globalAttributes.isEmpty)

        GlobalState.addAttribute(forKey: "int", value: 42)
        GlobalState.addAttribute(forKey: "int", value: nil)

        XCTAssertTrue(GlobalState.globalAttributes.isEmpty)
    }

    func testMergeWithGlobalAttributes() throws {
        let attributes: [String: Encodable] = [
            "foo": "foobar",
            "another_int": 1_337
        ]

        GlobalState.addAttribute(forKey: "foo", value: "bar")
        GlobalState.addAttribute(forKey: "int", value: 42)

        let merged = attributes.mergeWithGlobalAttributes()

        XCTAssertEqual(merged["foo"] as? String, "foobar")
        XCTAssertEqual(merged["int"] as? Int, 42)
        XCTAssertEqual(merged["another_int"] as? Int, 1_337)
    }
}
