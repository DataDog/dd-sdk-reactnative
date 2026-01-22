/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2020 Datadog, Inc.
 */

import XCTest
@testable import DatadogSDKReactNative
import DatadogTrace
import DatadogInternal
import DatadogRUM
import DatadogLogs

internal class DatadogSdkWrapperTests: XCTestCase {
    override func setUp() {
        super.setUp()
        DatadogSDKWrapper.shared.onSdkInitializedListeners = []
    }

    func testOverrideCoreRegistryDefault() {
        let coreMock = MockDatadogCore()
        CoreRegistry.register(default: coreMock)
        defer { CoreRegistry.unregisterDefault() }

        Trace.enable(with: .init())
        RUM.enable(with: .init(applicationID: "app-id"))
        Logs.enable(with: .init())

        XCTAssertNotNil(coreMock.features["tracing"])
        XCTAssertNotNil(coreMock.features["rum"])
        XCTAssertNotNil(coreMock.features["logging"])
    }
}
