/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2020 Datadog, Inc.
 */

import XCTest
@testable import DatadogCore
@testable import DatadogRUM
@testable import DatadogSDKReactNative
@testable import DatadogInternal

internal class DdRumTests: XCTestCase {
    private let mockNativeRUM = MockRUMMonitor()
    private var rum: DdRumImplementation! // swiftlint:disable:this implicitly_unwrapped_optional
    
    private func mockResolve(args: Any?) {}
    private func mockReject(args: String?, arg: String?, err: Error?) {}

    private let randomTimestamp = Double.random(in: 0...Double(Int64.max))

    override func setUpWithError() throws {
        try super.setUpWithError()
        rum = DdRumImplementation({ self.mockNativeRUM }, { self.mockNativeRUM._internalMock })
    }

    func testItInitializesNativeRumOnlyOnce() {
        // Given
        let expectation = self.expectation(description: "Initialize RUM once")

        let rum = DdRumImplementation({ [unowned self] in
            expectation.fulfill()
            return self.mockNativeRUM
        }, { nil })

        // When
        (0..<10).forEach { _ in rum.addTiming(name: "foo", resolve: mockResolve, reject: mockReject) }

        // Then
        waitForExpectations(timeout: 0.5, handler: nil)
    }

    func testInternalTimestampKeyValue() {
        let key = "_dd.timestamp"
        
        XCTAssertEqual(DdRumImplementation.timestampKey, DatadogInternal.CrossPlatformAttributes.timestampInMilliseconds)
        XCTAssertEqual(DdRumImplementation.timestampKey, DatadogSDKReactNative.CrossPlatformAttributes.timestampInMilliseconds)
    }

    func testStartView() throws {
        rum.startView(key: "view key", name: "view name", context: ["foo": 123], timestampMs: randomTimestamp, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .startView(key: "view key", name: "view name"))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 1)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 2)
        XCTAssertEqual(lastAttributes["foo"] as? Int64, 123)
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Double, randomTimestamp)
    }

    func testStopView() throws {
        rum.stopView(key: "view key", context: ["foo": 123], timestampMs: randomTimestamp, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .stopView(key: "view key"))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 1)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 2)
        XCTAssertEqual(lastAttributes["foo"] as? Int64, 123)
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Double, randomTimestamp)
    }

    func testStartAction() throws {
        rum.startAction(type: "custom", name: "action name", context: ["foo": 123], timestampMs: randomTimestamp, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .startUserAction(type: .custom, name: "action name"))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 1)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 2)
        XCTAssertEqual(lastAttributes["foo"] as? Int64, 123)
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Double, randomTimestamp)
    }

    func testStopActionWithoutStarting() {
        rum.stopAction(type: "custom", name: "action name", context: ["foo": 123], timestampMs: randomTimestamp, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
    }

    func testStopAction() throws {
        rum.startAction(type: "custom", name: "action name", context: [:], timestampMs: 0, resolve: mockResolve, reject: mockReject)
        rum.stopAction(type: "custom", name: "action name", context: ["foo": 123], timestampMs: randomTimestamp, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 2)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .stopUserAction(type: .custom, name: "action name"))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 2)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 2)
        XCTAssertEqual(lastAttributes["foo"] as? Int64, 123)
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Double, randomTimestamp)
    }

    func testAddAction() throws {
        rum.addAction(type: "scroll", name: "action name", context: ["foo": 123], timestampMs: randomTimestamp, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .addUserAction(type: .scroll, name: "action name"))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 1)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 2)
        XCTAssertEqual(lastAttributes["foo"] as? Int64, 123)
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Double, randomTimestamp)
    }

    func testStartResource() throws {
        rum.startResource(key: "resource key", method: "put", url: "some/url/string", context: ["foo": 123], timestampMs: randomTimestamp, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .startResourceLoading(resourceKey: "resource key", httpMethod: .put, urlString: "some/url/string"))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 1)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 2)
        XCTAssertEqual(lastAttributes["foo"] as? Int64, 123)
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Double, randomTimestamp)
    }

    func testStopResource() throws {
        rum.stopResource(key: "resource key", statusCode: 999, kind: "xhr", size: 1_337, context: ["foo": 123], timestampMs: randomTimestamp, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .stopResourceLoading(resourceKey: "resource key", statusCode: 999, kind: .xhr, size: 1_337))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 1)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 2)
        XCTAssertEqual(lastAttributes["foo"] as? Int64, 123)
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Double, randomTimestamp)
    }

    func testStopResourceWithMissingSize() throws {
        rum.stopResource(key: "resource key", statusCode: 999, kind: "xhr", size: -1, context: ["foo": 123], timestampMs: randomTimestamp, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .stopResourceLoading(resourceKey: "resource key", statusCode: 999, kind: .xhr, size: nil))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 1)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 2)
        XCTAssertEqual(lastAttributes["foo"] as? Int64, 123)
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Double, randomTimestamp)
    }

    func testStopResourceWithExternalTimings() throws {
        let context: NSDictionary = [
            "foo": 123,
            "_dd.resource_timings": [
                "fetch": [
                    "startTime": 0,
                    "duration": 13
                ],
                "redirect": [
                    "startTime": 1,
                    "duration": 1
                ],
                "dns": [
                    "startTime": 3,
                    "duration": 1
                ],
                "connect": [
                    "startTime": 5,
                    "duration": 1
                ],
                "ssl": [
                    "startTime": 7,
                    "duration": 1
                ],
                "firstByte": [
                    "startTime": 9,
                    "duration": 1
                ],
                "download": [
                    "startTime": 11,
                    "duration": 1
                ]
            ]
        ]

        rum.stopResource(key: "resource key", statusCode: 999, kind: "xhr", size: 1_337, context: context, timestampMs: randomTimestamp, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 2)

        XCTAssertEqual(
            mockNativeRUM.calledMethods.first,
            .addResourceMetrics(
                resourceKey: "resource key",
                fetch: MockRUMMonitor.Interval(
                    start: nanoTimeToDate(timestampNs: 0),
                    end: nanoTimeToDate(timestampNs: 13)
                ),
                redirection: MockRUMMonitor.Interval(
                    start: nanoTimeToDate(timestampNs: 1),
                    end: nanoTimeToDate(timestampNs: 2)
                ),
                dns: MockRUMMonitor.Interval(
                    start: nanoTimeToDate(timestampNs: 3),
                    end: nanoTimeToDate(timestampNs: 4)
                ),
                connect: MockRUMMonitor.Interval(
                    start: nanoTimeToDate(timestampNs: 5),
                    end: nanoTimeToDate(timestampNs: 6)
                ),
                ssl: MockRUMMonitor.Interval(
                    start: nanoTimeToDate(timestampNs: 7),
                    end: nanoTimeToDate(timestampNs: 8)
                ),
                firstByte: MockRUMMonitor.Interval(
                    start: nanoTimeToDate(timestampNs: 9),
                    end: nanoTimeToDate(timestampNs: 10)
                ),
                download: MockRUMMonitor.Interval(
                    start: nanoTimeToDate(timestampNs: 11),
                    end: nanoTimeToDate(timestampNs: 12)
                ),
                responseSize: nil
            )
        )

        XCTAssertEqual(mockNativeRUM.calledMethods.last, .stopResourceLoading(resourceKey: "resource key", statusCode: 999, kind: .xhr, size: 1_337))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 2)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 2)
        XCTAssertEqual(lastAttributes["foo"] as? Int64, 123)
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Double, randomTimestamp)
    }

    func testAddError() throws {
        rum.addError(message: "error message", source: "webview", stacktrace: "error trace", context: ["foo": 123], timestampMs: randomTimestamp, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .addError(message: "error message", source: .webview, stack: "error trace"))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 1)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 2)
        XCTAssertEqual(lastAttributes["foo"] as? Int64, 123)
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Double, randomTimestamp)
    }

    func testAddTiming() throws {
        rum.addTiming(name: "timing", resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .addTiming(name: "timing"))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 0)
    }

    func testStopSession() throws {
        rum.stopSession(resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .stopSession())
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 0)
    }

    func testAddFeatureFlagEvaluationWithBoolValue() throws {
        rum.addFeatureFlagEvaluation(name: "flag", value: ["value": true], resolve: mockResolve, reject: mockReject)

        let featureFlags = try XCTUnwrap(mockNativeRUM.receivedFeatureFlags)
        XCTAssertEqual(featureFlags["flag"] as? Bool, true)
    }

    func testRumErrorSourceMapping() throws {
        XCTAssertEqual(RUMErrorSource(from: "source"), RUMErrorSource.source)
        XCTAssertEqual(RUMErrorSource(from: "network"), RUMErrorSource.network)
        XCTAssertEqual(RUMErrorSource(from: "webview"), RUMErrorSource.webview)
        XCTAssertEqual(RUMErrorSource(from: "console"), RUMErrorSource.console)
        XCTAssertEqual(RUMErrorSource(from: "foobar"), RUMErrorSource.custom)
    }

    private func nanoTimeToDate(timestampNs: Int64) -> Date {
        return Date(timeIntervalSince1970: TimeInterval(fromNs: timestampNs))
    }
}
