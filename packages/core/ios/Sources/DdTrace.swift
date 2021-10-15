/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import DatadogSDKBridge

@objc(DdTrace)
class RNDdTrace: NSObject {

    @objc(requiresMainQueueSetup)
    static func requiresMainQueueSetup() -> Bool {
        return false
    }

    let nativeInstance: DdTrace = Bridge.getDdTrace()

    @objc(methodQueue)
    let methodQueue: DispatchQueue = sharedQueue

    @objc(startSpan:withContext:withTimestampms:withResolver:withRejecter:)
    func startSpan(operation: NSString, context: NSDictionary, timestampMs: Int64, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        let result = nativeInstance.startSpan(operation: operation, context: context, timestampMs: timestampMs)
        resolve(result)
    }

    @objc(finishSpan:withContext:withTimestampms:withResolver:withRejecter:)
    func finishSpan(spanId: NSString, context: NSDictionary, timestampMs: Int64, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.finishSpan(spanId: spanId, context: context, timestampMs: timestampMs)
        resolve(nil)
    }

}
