/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import XCTest
@testable import DatadogSDKReactNativeProfiling
import DatadogProfiling
import DatadogInternal
import React

internal class DdProfilingTests: XCTestCase {
    private func mockResolve(args: Any?) {}
    private func mockReject(args: String?, arg: String?, err: Error?) {}

    override func setUp() {
        super.setUp()
        let mockDatadogCore = MockDatadogCore()
        CoreRegistry.register(default: mockDatadogCore)
    }

    override func tearDown() {
        CoreRegistry.unregisterDefault()
    }

    func testEnablesProfilingWithZeroSampleRates() {
        let profilingMock = MockProfiling()

        DdProfilingImplementation(
            profilingProvider: { profilingMock }
        ).enable(
            applicationLaunchSampleRate: 0,
            continuousSampleRate: 0,
            customEndpoint: "",
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertEqual(profilingMock.calledMethods.first, .enable(
            applicationLaunchSampleRate: 0.0,
            continuousSampleRate: 0.0,
            customEndpoint: nil
        ))
    }

    func testEnablesProfilingWithProvidedSampleRates() {
        let profilingMock = MockProfiling()

        DdProfilingImplementation(
            profilingProvider: { profilingMock }
        ).enable(
            applicationLaunchSampleRate: 100,
            continuousSampleRate: 100,
            customEndpoint: "",
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertEqual(profilingMock.calledMethods.first, .enable(
            applicationLaunchSampleRate: 100.0,
            continuousSampleRate: 100.0,
            customEndpoint: nil
        ))
    }

    func testEnablesProfilingWithCustomEndpoint() {
        let profilingMock = MockProfiling()

        DdProfilingImplementation(
            profilingProvider: { profilingMock }
        ).enable(
            applicationLaunchSampleRate: 100,
            continuousSampleRate: 100,
            customEndpoint: "https://profiling.example.com",
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertEqual(profilingMock.calledMethods.first, .enable(
            applicationLaunchSampleRate: 100.0,
            continuousSampleRate: 100.0,
            customEndpoint: URL(string: "https://profiling.example.com")
        ))
    }
}

private class MockProfiling: ProfilingProtocol {
    enum CalledMethod: Equatable {
        case enable(
            applicationLaunchSampleRate: Float,
            continuousSampleRate: Float,
            customEndpoint: URL?
        )
    }

    public var calledMethods = [CalledMethod]()

    func enable(with configuration: Profiling.Configuration, in core: DatadogCoreProtocol) {
        calledMethods.append(
            .enable(
                applicationLaunchSampleRate: configuration.applicationLaunchSampleRate,
                continuousSampleRate: configuration.continuousSampleRate,
                customEndpoint: configuration.customEndpoint
            )
        )
    }
}

private class MockDatadogCore: DatadogCoreProtocol {
    func mostRecentModifiedFileAt(before: Date) throws -> Date? {
        return nil
    }

    func scope<T>(for featureType: T.Type) -> any DatadogInternal.FeatureScope where T : DatadogInternal.DatadogFeature {
        return NOPFeatureScope()
    }

    func feature<T>(named name: String, type: T.Type) -> T? {
        return nil
    }

    func register<T>(feature: T) throws where T : DatadogInternal.DatadogFeature {}
    func send(message: DatadogInternal.FeatureMessage, else fallback: @escaping () -> Void) {}
    func set<Context>(context: @escaping () -> Context?) where Context : DatadogInternal.AdditionalContext {}
}
