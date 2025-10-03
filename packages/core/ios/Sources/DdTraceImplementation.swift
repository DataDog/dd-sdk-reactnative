/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import DatadogTrace
import Foundation

@objc
public class DdTraceImplementation: NSObject {
    private lazy var tracer: OTTracer = tracerProvider()
    private let tracerProvider: () -> OTTracer

    private(set) var spansById: [String: OTSpan] = [:]
    private(set) var spanStack: [String] = []

    private var activeSpan: OTSpan? {
        spanStack.last.flatMap { spansById[$0] }
    }

    internal init(_ tracerProvider: @escaping () -> OTTracer) {
        self.tracerProvider = tracerProvider
    }

    @objc
    public override convenience init() {
        self.init { Tracer.shared() }
    }

    @objc
    public func startSpan(
        operation: String, context: NSDictionary, timestampMs: Double,
        resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock
    ) {
        objc_sync_enter(self)
        defer { objc_sync_exit(self) }

        let id = UUID().uuidString
        let timeIntervalSince1970: TimeInterval = timestampMs / 1_000
        let startDate = Date(timeIntervalSince1970: timeIntervalSince1970)

        let span = tracer.startSpan(
            operationName: operation,
            childOf: activeSpan?.context,
            tags: castAttributesToSwift(context).mergeWithGlobalAttributes(),
            startTime: startDate
        )

        span.setActive()
        spansById[id] = span
        spanStack.append(id)

        resolve(id)
    }

    @objc
    public func finishSpan(
        spanId: NSString, context: NSDictionary, timestampMs: Double,
        resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock
    ) {
        objc_sync_enter(self)
        defer { objc_sync_exit(self) }

        guard let span = spansById.removeValue(forKey: spanId as String) else {
            resolve(nil)
            return
        }

        set(tags: castAttributesToSwift(context).mergeWithGlobalAttributes(), to: span)
        let timeIntervalSince1970: TimeInterval = timestampMs / 1_000
        span.finish(at: Date(timeIntervalSince1970: timeIntervalSince1970))

        if let idx = spanStack.lastIndex(of: spanId as String) {
            let wasTop = (idx == spanStack.count - 1)
            spanStack.remove(at: idx)

            if wasTop, let prev = activeSpan {
                prev.setActive()
            }
        }

        resolve(nil)
    }

    private func set(tags: [String: Encodable], to span: OTSpan) {
        for (key, value) in tags {
            span.setTag(key: key, value: value)
        }
    }
}
