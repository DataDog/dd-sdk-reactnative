/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import XCTest
@testable import DatadogSDKReactNative
@testable import React

class ModulesTest: XCTestCase {

    func testAllModulesUseSameQueue() {
        XCTAssertTrue(sharedQueue === DdSdk().methodQueue)
        XCTAssertTrue(sharedQueue === DdRum().methodQueue)
        XCTAssertTrue(sharedQueue === DdLogs().methodQueue)
        XCTAssertTrue(sharedQueue === DdTrace().methodQueue)
    }

    func testAllModulesExposeMethodQueueProperly() {
        // RN does the check by calling BOOL implementsMethodQueue = [_instance respondsToSelector:@selector(methodQueue)];
        // So if methodQueue is static, check above returns false
        // This test makes sure that 'methodQueue' is implemented as instance member
        // Given
        let methodQueueSelector = #selector(getter: RCTModuleData.methodQueue)

        // Then
        XCTAssertTrue(DdSdk().responds(to: methodQueueSelector))
        XCTAssertTrue(DdRum().responds(to: methodQueueSelector))
        XCTAssertTrue(DdLogs().responds(to: methodQueueSelector))
        XCTAssertTrue(DdTrace().responds(to: methodQueueSelector))
    }
}
