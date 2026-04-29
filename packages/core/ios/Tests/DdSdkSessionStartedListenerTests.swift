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
        DdSdkSessionStartedListener.invalidate()
        DdSdkSessionStartedListener.resetIsRnSdkInitializedForTests()
    }

    override func tearDown() {
        DdSdkSessionStartedListener.invalidate()
        DdSdkSessionStartedListener.resetIsRnSdkInitializedForTests()
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

    func testIsRnSdkInitializedDefaultsToFalse() {
        // THEN
        XCTAssertFalse(DdSdkSessionStartedListener.isRnSdkInitializedForTests())
    }

    func testOnRnSdkInitializedFlipsFlag() {
        // GIVEN
        let instance = DdSdkSessionStartedListener.instance
        XCTAssertFalse(DdSdkSessionStartedListener.isRnSdkInitializedForTests())

        // WHEN
        instance.onRnSdkInitialized()

        // THEN
        XCTAssertTrue(DdSdkSessionStartedListener.isRnSdkInitializedForTests())
    }

    func testInvalidateDoesNotResetIsRnSdkInitialized() {
        // GIVEN
        let instance = DdSdkSessionStartedListener.instance
        instance.onRnSdkInitialized()
        XCTAssertTrue(DdSdkSessionStartedListener.isRnSdkInitializedForTests())

        // WHEN
        DdSdkSessionStartedListener.invalidate()

        // THEN
        XCTAssertTrue(DdSdkSessionStartedListener.isRnSdkInitializedForTests())
    }

    func testBridgelessListenerPathIsUnaffectedByIsRnSdkInitialized() {
        // GIVEN — bridgeless mode (rctBridge == nil), flag still false
        let instance = DdSdkSessionStartedListener.instance
        var deliveredSessionIds: [String] = []
        instance.setListenerCallback { sessionId in
            deliveredSessionIds.append(sessionId)
        }
        instance.setHasListeners(true)

        // WHEN — native session starts before any JS init
        instance.rumSessionListener?("TEST-SESSION-ID", false)

        // THEN — bridgeless path delivers regardless of the flag
        XCTAssertEqual(deliveredSessionIds, ["TEST-SESSION-ID"])
    }

    func testResetIsRnSdkInitializedForTestsResetsFlag() {
        // GIVEN
        DdSdkSessionStartedListener.instance.onRnSdkInitialized()
        XCTAssertTrue(DdSdkSessionStartedListener.isRnSdkInitializedForTests())

        // WHEN
        DdSdkSessionStartedListener.resetIsRnSdkInitializedForTests()

        // THEN
        XCTAssertFalse(DdSdkSessionStartedListener.isRnSdkInitializedForTests())
    }
}
