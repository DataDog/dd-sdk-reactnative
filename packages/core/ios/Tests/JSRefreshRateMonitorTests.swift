/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import UIKit
import XCTest

@testable import DatadogSDKReactNative

final class JSRefreshRateMonitorTests: XCTestCase {
    func testListenerIsStoppedWhenAppResignsActiveAndRestartedWhenItBecomesActive() {
        let notificationCenter = NotificationCenter()
        let listener = MockRefreshRateListener()
        let monitor = JSRefreshRateMonitor(
            notificationCenter: notificationCenter,
            queue: DispatchQueueMock(),
            listenerFactory: { _, _ in listener }
        )

        monitor.startMonitoring(jsQueue: DispatchQueueMock(), frameTimeCallback: { _, _ in })
        XCTAssertEqual(listener.startCount, 1)
        XCTAssertEqual(listener.stopCount, 0)

        notificationCenter.post(name: UIApplication.willResignActiveNotification, object: nil)
        XCTAssertEqual(listener.startCount, 1)
        XCTAssertEqual(listener.stopCount, 1)

        notificationCenter.post(name: UIApplication.didBecomeActiveNotification, object: nil)
        XCTAssertEqual(listener.startCount, 2)
        XCTAssertEqual(listener.stopCount, 1)
    }

    func testAppActivityNotificationsAreIgnoredBeforeMonitoringStarts() {
        let notificationCenter = NotificationCenter()
        let listener = MockRefreshRateListener()
        let monitor = JSRefreshRateMonitor(
            notificationCenter: notificationCenter,
            queue: DispatchQueueMock(),
            listenerFactory: { _, _ in listener }
        )

        withExtendedLifetime(monitor) {
            notificationCenter.post(name: UIApplication.willResignActiveNotification, object: nil)
            notificationCenter.post(name: UIApplication.didBecomeActiveNotification, object: nil)
        }

        XCTAssertEqual(listener.startCount, 0)
        XCTAssertEqual(listener.stopCount, 0)
    }

    func testFirstFrameAfterRestartIsNotMeasuredAgainstLastFrameBeforePause() {
        var frameTimes: [Double] = []
        let listener = JSRefreshRateListener(
            jsQueue: DispatchQueueMock(),
            frameTimeCallback: { frameTime, _ in frameTimes.append(frameTime) }
        )
        defer { listener.stop() }

        listener.start()
        listener.onFrame(timestamp: 10.0, targetTimestamp: 10.016)
        listener.onFrame(timestamp: 10.016, targetTimestamp: 10.032)

        // App goes to the background for a minute
        listener.stop()
        listener.start()
        listener.onFrame(timestamp: 70.0, targetTimestamp: 70.016)
        listener.onFrame(timestamp: 70.016, targetTimestamp: 70.032)

        XCTAssertEqual(frameTimes.count, 2)
        XCTAssertEqual(frameTimes[0], 0.016, accuracy: 0.0001)
        XCTAssertEqual(frameTimes[1], 0.016, accuracy: 0.0001)
    }
}

private final class MockRefreshRateListener: RefreshRateListener {
    private(set) var startCount = 0
    private(set) var stopCount = 0

    func start() {
        startCount += 1
    }

    func stop() {
        stopCount += 1
    }
}
