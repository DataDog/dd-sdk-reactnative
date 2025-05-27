/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-Present Datadog, Inc.
 */

import XCTest
@testable import DatadogSDKReactNative
@testable import React

class DdSdkSessionStartedListenerTests: XCTestCase {
    var consoleMessage = ""

    override func setUp() {
        super.setUp()
    }

    override func tearDown() {
        super.tearDown()
    }

    func testInstanceImplementsSingletonCorrectly() {
        // GIVEN
        let instance1 = DdSdkSessionStartedListener.instance

        // WHEN
        let instance2 = DdSdkSessionStartedListener.instance

        // THEN
        XCTAssertEqual(instance1, instance2)
    }

    func testInvalidateMakesListenerNil() {
        // GIVEN
        let instance = DdSdkSessionStartedListener.instance
        let listener: ((String) -> Void) = {_ in }
        instance.setListenerCallback(listener)

        // WHEN
        instance.invalidate()

        // THEN
        XCTAssertNil(instance.listener)
    }

    func testRumSessionListenerIsRegisteredOnInit() {
        // GIVEN
        let instance = DdSdkSessionStartedListener.instance

        // WHEN
        let rumSessionListener = instance.rumSessionListener

        // THEN
        XCTAssertNotNil(rumSessionListener)
    }
}
