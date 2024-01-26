/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2020 Datadog, Inc.
 */

import XCTest
@testable import DatadogSDKReactNative
import DatadogTrace
import DatadogInternal


internal class DatadogSdkWrapperTests: XCTestCase {
    override func setUp() {
        super.setUp()
        DatadogSDKWrapper.shared.setCoreInstance(core: nil)
        DatadogSDKWrapper.shared.onCoreInitializedListeners = []
    }

    func testItSetsCoreUsedForFeatures() {
        let coreMock = MockDatadogCore()
        DatadogSDKWrapper.shared.setCoreInstance(core: coreMock)

        DatadogSDKWrapper.shared.enableTrace(with: .init())
        DatadogSDKWrapper.shared.enableRUM(with: .init(applicationID: "app-id"))
        DatadogSDKWrapper.shared.enableLogs(with: .init())

        XCTAssertNotNil(coreMock.features["tracing"])
        XCTAssertNotNil(coreMock.features["rum"])
        XCTAssertNotNil(coreMock.features["logging"])
    }
}
