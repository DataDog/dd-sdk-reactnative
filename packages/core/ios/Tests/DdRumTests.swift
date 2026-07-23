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
import React

internal class DdRumTests: XCTestCase {
    private let mockNativeRUM = MockRUMMonitor()
    private let mockUIManager = MockUIManager()
    private let mockRootView = MockRootView()
    private let mockHeatmapIdentifierRegistry = MockHeatmapIdentifierRegistry()
    private var rum: DdRumImplementation! // swiftlint:disable:this implicitly_unwrapped_optional

    private func mockResolve(args: Any?) {}
    private func mockReject(args: String?, arg: String?, err: Error?) {}

    private let randomTimestamp = Double.random(in: 0...Double(Int64.max))

    override func setUpWithError() throws {
        try super.setUpWithError()
        rum = DdRumImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            uiManager: self.mockUIManager,
            rootViewProvider: { self.mockRootView },
            heatmapIdentifierRegistryProvider: { self.mockHeatmapIdentifierRegistry },
            rumProvider: { self.mockNativeRUM },
            rumInternalProvider: { self.mockNativeRUM._internalMock }
        )
    }

    func testItInitializesNativeRumOnlyOnce() {
        // Given
        let expectation = self.expectation(description: "Initialize RUM once")

        let rum = DdRumImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            uiManager: MockUIManager(),
            rootViewProvider: { nil },
            heatmapIdentifierRegistryProvider: { nil },
            rumProvider: { [unowned self] in
                expectation.fulfill()
                return self.mockNativeRUM
            },
            rumInternalProvider: { nil }
        )

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
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Int64, Int64(randomTimestamp))
    }

    func testStopView() throws {
        rum.stopView(key: "view key", context: ["foo": 123], timestampMs: randomTimestamp, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .stopView(key: "view key"))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 1)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 2)
        XCTAssertEqual(lastAttributes["foo"] as? Int64, 123)
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Int64, Int64(randomTimestamp))
    }

    func testStartAction() throws {
        rum.startAction(type: "custom", name: "action name", context: ["foo": 123], timestampMs: randomTimestamp, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .startUserAction(type: .custom, name: "action name"))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 1)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 2)
        XCTAssertEqual(lastAttributes["foo"] as? Int64, 123)
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Int64, Int64(randomTimestamp))
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
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Int64, Int64(randomTimestamp))
    }

    func testAddAction() throws {
        rum.addAction(type: "scroll", name: "action name", touch: nil, context: ["foo": 123], timestampMs: randomTimestamp, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .addUserAction(type: .scroll, name: "action name"))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 1)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 2)
        XCTAssertEqual(lastAttributes["foo"] as? Int64, 123)
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Int64, Int64(randomTimestamp))
    }

    func testAddActionWithTouch() throws {
        // Given
        let view = UIView(frame: CGRect(x: 0, y: 0, width: 200, height: 50))
        let reactTag = NSNumber(value: 42)
        let identifier = HeatmapIdentifier(rawValue: "abc123")

        mockUIManager.views[reactTag] = view
        mockHeatmapIdentifierRegistry.identifiers[ObjectIdentifier(view)] = identifier

        let touch: NSDictionary = [
            "reactTag": 42,
            "x": 10.0,
            "y": 20.0,
            "pageX": 100.0,
            "pageY": 200.0
        ]

        // When
        rum.addAction(
            type: "tap",
            name: "tap action",
            touch: touch,
            context: [:],
            timestampMs: randomTimestamp,
            resolve: mockResolve,
            reject: mockReject
        )

        // Then
        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(
            mockNativeRUM.calledMethods.last,
            .addAction(
                time: Date(timeIntervalSince1970: randomTimestamp / 1_000),
                type: .tap,
                name: "tap action",
                heatmapAttributes: HeatmapAttributes(
                    identifier: identifier,
                    size: CGSize(width: 200, height: 50),
                    location: CGPoint(x: 10, y: 20)
                )
            )
        )
    }

    func testAddActionFallsBackToHitTestWhenReactTagNotFound() throws {
        // Given
        let hitView = UIView(frame: CGRect(x: 50, y: 100, width: 200, height: 50))
        mockRootView.addSubview(hitView)
        mockRootView.hitTestResult = hitView

        let identifier = HeatmapIdentifier(rawValue: "abc123")
        mockHeatmapIdentifierRegistry.identifiers[ObjectIdentifier(hitView)] = identifier

        let touch: NSDictionary = [
            "reactTag": 999,
            "x": 10.0,
            "y": 20.0,
            "pageX": 130.0,
            "pageY": 220.0
        ]

        // When
        rum.addAction(
            type: "tap",
            name: "tap action",
            touch: touch,
            context: [:],
            timestampMs: randomTimestamp,
            resolve: mockResolve,
            reject: mockReject
        )

        // Then
        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockRootView.receivedHitTestPoints, [CGPoint(x: 130, y: 220)])
        XCTAssertEqual(
            mockNativeRUM.calledMethods.last,
            .addAction(
                time: Date(timeIntervalSince1970: randomTimestamp / 1_000),
                type: .tap,
                name: "tap action",
                heatmapAttributes: HeatmapAttributes(
                    identifier: identifier,
                    size: CGSize(width: 200, height: 50),
                    location: CGPoint(x: 80, y: 120)
                )
            )
        )
    }

    func testAddActionWithTouchWhenFallbackHitTestMisses() throws {
        // Given
        mockRootView.hitTestResult = nil

        let touch: NSDictionary = [
            "reactTag": 999,
            "x": 10.0,
            "y": 20.0,
            "pageX": 100.0,
            "pageY": 200.0
        ]

        // When
        rum.addAction(
            type: "tap",
            name: "tap action",
            touch: touch,
            context: [:],
            timestampMs: randomTimestamp,
            resolve: mockResolve,
            reject: mockReject
        )

        // Then
        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(
            mockNativeRUM.calledMethods.last,
            .addAction(
                time: Date(timeIntervalSince1970: randomTimestamp / 1_000),
                type: .tap,
                name: "tap action",
                heatmapAttributes: nil
            )
        )
    }

    func testStartResource() throws {
        rum.startResource(key: "resource key", method: "put", url: "some/url/string", context: ["foo": 123], timestampMs: randomTimestamp, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .startResourceLoading(resourceKey: "resource key", httpMethod: .put, urlString: "some/url/string"))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 1)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 2)
        XCTAssertEqual(lastAttributes["foo"] as? Int64, 123)
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Int64, Int64(randomTimestamp))
    }

    func testStopResource() throws {
        rum.stopResource(key: "resource key", statusCode: 999, kind: "xhr", size: 1_337, context: ["foo": 123], timestampMs: randomTimestamp, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .stopResourceLoading(resourceKey: "resource key", statusCode: 999, kind: .xhr, size: 1_337))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 1)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 2)
        XCTAssertEqual(lastAttributes["foo"] as? Int64, 123)
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Int64, Int64(randomTimestamp))
    }

    func testStopResourceWithMissingSize() throws {
        rum.stopResource(key: "resource key", statusCode: 999, kind: "xhr", size: -1, context: ["foo": 123], timestampMs: randomTimestamp, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .stopResourceLoading(resourceKey: "resource key", statusCode: 999, kind: .xhr, size: nil))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 1)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 2)
        XCTAssertEqual(lastAttributes["foo"] as? Int64, 123)
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Int64, Int64(randomTimestamp))
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
                responseBodySize: nil,
                requestBodySize: nil
            )
        )

        XCTAssertEqual(mockNativeRUM.calledMethods.last, .stopResourceLoading(resourceKey: "resource key", statusCode: 999, kind: .xhr, size: 1_337))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 2)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 2)
        XCTAssertEqual(lastAttributes["foo"] as? Int64, 123)
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Int64, Int64(randomTimestamp))
    }

    func testAddError() throws {
        rum.addError(message: "error message", source: "webview", stacktrace: "error trace", context: ["foo": 123], timestampMs: randomTimestamp, fingerprint: "", resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .addError(message: "error message", source: .webview, stack: "error trace"))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 1)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 2)
        XCTAssertEqual(lastAttributes["foo"] as? Int64, 123)
        XCTAssertEqual(lastAttributes[DdRumImplementation.timestampKey] as? Int64, Int64(randomTimestamp))
    }

    func testAddTiming() throws {
        rum.addTiming(name: "timing", resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .addTiming(name: "timing"))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 0)
    }
    
    func testAddViewAttribute() throws {
        let viewAttributeKey = "attributeKey"
        let viewAttributes = NSDictionary(
            dictionary: [
                "value": 123,
            ]
        )
        
        rum.addViewAttribute(key: viewAttributeKey, value: viewAttributes, resolve: mockResolve, reject: mockReject)
        
        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .addViewAttribute(key: viewAttributeKey))
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 1)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 1)
        XCTAssertEqual(lastAttributes["attributeKey"] as? Int64, 123)
    }
    
    func testRemoveViewAttribute() throws {
        let viewAttributeKey = "attributeKey"
        
        rum.removeViewAttribute(key: viewAttributeKey, resolve: mockResolve, reject: mockReject)
        
        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .removeViewAttribute(key: viewAttributeKey))
    }
    
    func testAddViewAttributes() throws {
        let viewAttributes = NSDictionary(
            dictionary: [
                "attribute-1": 123,
                "attribute-2": "abc",
                "attribute-3": true,
            ]
        )
        
        rum.addViewAttributes(attributes: viewAttributes, resolve: mockResolve, reject: mockReject)
        
        
        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .addViewAttributes())
        XCTAssertEqual(mockNativeRUM.receivedAttributes.count, 1)
        let lastAttributes = try XCTUnwrap(mockNativeRUM.receivedAttributes.last)
        XCTAssertEqual(lastAttributes.count, 3)
        XCTAssertEqual(lastAttributes["attribute-1"] as? Int64, 123)
        XCTAssertEqual(lastAttributes["attribute-2"] as? String, "abc")
        XCTAssertEqual(lastAttributes["attribute-3"] as? Bool, true)
    }

    
    func testRemoveViewAttributes() throws {
        let viewAttributeKeys = ["attributeKey1", "attributeKey2", "attributeKey3"]
        
        rum.removeViewAttributes(keys: viewAttributeKeys, resolve: mockResolve, reject: mockReject)
        
        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .removeViewAttributes(keys: viewAttributeKeys))
    }
    
    func testAddViewLoadingTime() throws {
        rum.addViewLoadingTime(overwrite: true, resolve: mockResolve, reject: mockReject)
        
        XCTAssertEqual(mockNativeRUM.calledMethods.count, 1)
        XCTAssertEqual(mockNativeRUM.calledMethods.last, .addViewLoadingTime(overwrite: true))
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

    func testStartProfilingResolves() throws {
        let ddRum = DdRum()
        let expectation = self.expectation(description: "startProfiling resolves")

        ddRum.startProfiling({ _ in
            expectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Expected startProfiling to resolve")
        })

        waitForExpectations(timeout: 5)
    }

    func testStopProfilingResolvesWithTraceFilePath() throws {
        let ddRum = DdRum()
        let startExpectation = self.expectation(description: "startProfiling resolves")
        ddRum.startProfiling({ _ in
            startExpectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Expected startProfiling to resolve")
        })
        waitForExpectations(timeout: 5)

        let stopExpectation = self.expectation(description: "stopProfiling resolves")
        var tracePath: String?
        ddRum.stopProfiling({ path in
            tracePath = path as? String
            stopExpectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Expected stopProfiling to resolve")
        })
        waitForExpectations(timeout: 5)

        let resolvedPath = try XCTUnwrap(tracePath)
        XCTAssertTrue(FileManager.default.fileExists(atPath: resolvedPath))
    }
}

private class MockUIManager: RCTUIManager {
    var views: [NSNumber: UIView] = [:]

    override func view(forReactTag reactTag: NSNumber!) -> UIView? {
        views[reactTag]
    }
}

private class MockRootView: UIView {
    var hitTestResult: UIView?
    var receivedHitTestPoints: [CGPoint] = []

    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        receivedHitTestPoints.append(point)
        return hitTestResult
    }
}

private final class MockHeatmapIdentifierRegistry: @unchecked Sendable, HeatmapIdentifierRegistry {
    @ReadWriteLock
    var identifiers: [ObjectIdentifier: HeatmapIdentifier] = [:]

    func setHeatmapIdentifiers(_ heatmapIdentifiers: [ObjectIdentifier: HeatmapIdentifier]) {
        identifiers = heatmapIdentifiers
    }

    func heatmapIdentifier(for objectIdentifier: ObjectIdentifier) -> HeatmapIdentifier? {
        identifiers[objectIdentifier]
    }
}
