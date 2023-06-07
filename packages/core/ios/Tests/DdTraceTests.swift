/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2020 Datadog, Inc.
 */

import XCTest
@testable import DatadogSDKReactNative
@testable import Datadog


internal class DdTraceTests: XCTestCase {
    private let mockNativeTracer = MockTracer()
    private var tracer: DdTraceImplementation! // swiftlint:disable:this implicitly_unwrapped_optional
    private var lastResolveValue: Any?
    
    private func mockResolve(args: Any?) { lastResolveValue = args }
    private func mockReject(args: String?, arg: String?, err: Error?) {}

    override func setUpWithError() throws {
        try super.setUpWithError()
        tracer = DdTraceImplementation { self.mockNativeTracer }
        GlobalState.addAttribute(forKey: "global-string", value: "foo")
        GlobalState.addAttribute(forKey: "global-int", value: 42)
    }

    override func tearDown() {
        GlobalState.globalAttributes.removeAll()
        super.tearDown()
    }

    private let testTags = NSDictionary(
        dictionary: [
            "key_string": NSString("value"),
            "key_number": (123 as NSNumber),
            "key_bool": true
        ]
    )

    func testItInitializesNativeTracerOnlyOnce() {
        // Given
        let expectation = self.expectation(description: "Initialize Tracer once")

        let tracer = DdTraceImplementation { [unowned self] in
            expectation.fulfill()
            return self.mockNativeTracer
        }

        // When
        (0..<10).forEach { _ in _ = tracer.startSpan(operation: "foo", context: [:], timestampMs: 1_337, resolve: mockResolve, reject: mockReject) }

        // Then
        waitForExpectations(timeout: 0.5, handler: nil)
    }

    func testStartingASpan() throws {
        let timestampInMilliseconds = Date.timeIntervalBetween1970AndReferenceDate * 1_000
        tracer.startSpan(
            operation: "test_span",
            context: testTags,
            timestampMs: NSNumber(value: timestampInMilliseconds),
            resolve: mockResolve,
            reject: mockReject
        )
        let spanID = lastResolveValue

        XCTAssertNotNil(spanID)
        XCTAssertEqual(mockNativeTracer.startedSpans.count, 1)
        let startedSpan = try XCTUnwrap(mockNativeTracer.startedSpans.first)
        XCTAssertEqual(startedSpan.name, "test_span")
        XCTAssertNil(startedSpan.parent)
        let startDate = Date(timeIntervalSince1970: Date.timeIntervalBetween1970AndReferenceDate)
        XCTAssertEqual(startedSpan.startTime, startDate)
        let tags = try XCTUnwrap(startedSpan.tags)
        XCTAssertEqual(tags["key_string"] as? String, "value")
        XCTAssertEqual(tags["key_number"] as? Int64, 123)
        XCTAssertEqual(tags["key_bool"] as? Bool, true)
        XCTAssertEqual(tags["global-string"] as? String, "foo")
        XCTAssertEqual(tags["global-int"] as? Int, 42)
    }

    func testFinishingASpan() throws {
        let startDate = Date(timeIntervalSinceReferenceDate: 42.042)
        let timestampMs = Int64(startDate.timeIntervalSince1970 * 1_000)
        tracer.startSpan(
            operation: "test_span",
            context: testTags,
            timestampMs: NSNumber(value: timestampMs),
            resolve: mockResolve,
            reject: mockReject
        )
        let spanID = lastResolveValue as! NSString

        XCTAssertNotNil(spanID)
        XCTAssertEqual(Array(tracer.spanDictionary.keys), [spanID])
        let startedSpan = try XCTUnwrap(mockNativeTracer.startedSpans.last)
        XCTAssertEqual(startedSpan.finishTime, MockSpan.unfinished)

        let spanDuration: TimeInterval = 10.042
        let spanDurationMs = Int64(spanDuration * 1_000)
        let finishTimestampMs = Int64(timestampMs) + spanDurationMs
        let finishingContext = NSDictionary(dictionary: ["last_key": "last_value"])
        tracer.finishSpan(spanId: spanID, context: finishingContext, timestampMs: NSNumber(value: finishTimestampMs), resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(Array(tracer.spanDictionary.keys), [])
        XCTAssertEqual(
            startedSpan.finishTime!.timeIntervalSince1970, // swiftlint:disable:this force_unwrapping
            (startDate + spanDuration).timeIntervalSince1970,
            accuracy: 0.001
        )
        let tags = try XCTUnwrap(startedSpan.tags)
        XCTAssertEqual(tags["last_key"] as? String, "last_value")
        XCTAssertEqual(tags["global-string"] as? String, "foo")
        XCTAssertEqual(tags["global-int"] as? Int, 42)
    }

    func testFinishingInexistentSpan() {
        _ = tracer.startSpan(
            operation: "test_span",
            context: NSDictionary(),
            timestampMs: 100,
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertEqual(tracer.spanDictionary.count, 1)

        XCTAssertNoThrow(
            tracer.finishSpan(
                spanId: "inexistent_test_span_id",
                context: NSDictionary(),
                timestampMs: 0,
                resolve: mockResolve,
                reject: mockReject
            )
        )

        XCTAssertEqual(tracer.spanDictionary.count, 1)
    }

    func testTracingConcurrently() {
        let iterationCount = 30
        DispatchQueue.concurrentPerform(iterations: iterationCount) { iteration in
            tracer.startSpan(
                operation: ("concurrent_test_span_\(iteration)" as NSString) as String,
                context: testTags,
                timestampMs: 0,
                resolve: mockResolve,
                reject: mockReject
            )
            let spanID = lastResolveValue as! NSString
            tracer.finishSpan(spanId: spanID, context: testTags, timestampMs: 100, resolve: mockResolve, reject: mockReject)
        }

        XCTAssertEqual(mockNativeTracer.startedSpans.count, iterationCount, "\(mockNativeTracer.startedSpans)")
        XCTAssertEqual(tracer.spanDictionary.count, 0)
    }
}

private class MockTracer: OTTracer {
    var activeSpan: OTSpan?

    private(set) var startedSpans = [MockSpan]()
    func startSpan(operationName: String, references: [OTReference]?, tags: [String: Encodable]?, startTime: Date?) -> OTSpan {
        let mockSpan = MockSpan(name: operationName, parent: nil, tags: tags, startTime: startTime)
        startedSpans.append(mockSpan)
        return mockSpan
    }

    // swiftlint:disable unavailable_function
    func inject(spanContext: OTSpanContext, writer: OTFormatWriter) {
        fatalError("Should not be called")
    }
    func extract(reader: OTFormatReader) -> OTSpanContext? {
        fatalError("Should not be called")
    }
    // swiftlint:enable unavailable_function
}

private class MockSpan: OTSpan {
    static let unfinished: Date = .distantFuture

    let name: String
    let parent: OTSpanContext?
    private(set) var tags: [String: Encodable]
    let startTime: Date?
    init(name: String, parent: OTSpanContext?, tags: [String: Encodable]?, startTime: Date?) {
        self.name = name
        self.parent = parent
        self.tags = tags ?? [:]
        self.startTime = startTime
    }

    func setTag(key: String, value: Encodable) {
        tags[key] = value
    }

    private(set) var finishTime: Date? = MockSpan.unfinished
    func finish(at time: Date) {
        self.finishTime = time
    }

    // swiftlint:disable unavailable_function
    var context: OTSpanContext { fatalError("Should not be called") }
    func tracer() -> OTTracer {
        fatalError("Should not be called")
    }
    func setOperationName(_ operationName: String) {
        fatalError("Should not be called")
    }
    func log(fields: [String: Encodable], timestamp: Date) {
        fatalError("Should not be called")
    }
    func setBaggageItem(key: String, value: String) {
        fatalError("Should not be called")
    }
    func baggageItem(withKey key: String) -> String? {
        fatalError("Should not be called")
    }
    func setActive() -> OTSpan {
        fatalError("Should not be called")
    }
    // swiftlint:enable unavailable_function
}
