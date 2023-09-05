/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import DatadogTrace

@objc
public class DdTraceImplementation: NSObject {
    private lazy var tracer: OTTracer = tracerProvider()
    private let tracerProvider: () -> OTTracer
    private(set) var spanDictionary = [NSString: OTSpan]()

    internal init(_ tracerProvider: @escaping () -> OTTracer) {
        self.tracerProvider = tracerProvider
    }

    @objc
    public override convenience init() {
        self.init { Tracer.shared() }
    }

    @objc
    public func startSpan(operation: String, context: NSDictionary, timestampMs: Double, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        let id = UUID().uuidString as NSString
        let timeIntervalSince1970: TimeInterval = timestampMs / 1_000
        let startDate = Date(timeIntervalSince1970: timeIntervalSince1970)

        objc_sync_enter(self)
        spanDictionary[id] = tracer.startSpan(
            operationName: operation,
            childOf: nil,
            tags: castAttributesToSwift(context).mergeWithGlobalAttributes(),
            startTime: startDate
        )
        objc_sync_exit(self)

        resolve(id)
    }

    @objc
    public func finishSpan(spanId: NSString, context: NSDictionary, timestampMs: Double, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        objc_sync_enter(self)
        let optionalSpan = spanDictionary.removeValue(forKey: spanId)
        objc_sync_exit(self)

        if let span = optionalSpan {
            set(tags: castAttributesToSwift(context).mergeWithGlobalAttributes(), to: span)
            let timeIntervalSince1970: TimeInterval = timestampMs / 1_000
            span.finish(at: Date(timeIntervalSince1970: timeIntervalSince1970))
        }
        
        resolve(nil)
    }

    private func set(tags: [String: Encodable], to span: OTSpan) {
        for (key, value) in tags {
            span.setTag(key: key, value: value)
        }
    }
}
