/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import DatadogSDKBridge

@objc(DdTrace)
class RNDdTrace: NSObject {

    let nativeInstance: DdTrace = Bridge.getDdTrace()

    @objc(startSpan:withTimestampms:withContext:withResolver:withRejecter:)
    func startSpan(operation: NSString, timestampMs: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        let result = nativeInstance.startSpan(operation: operation, timestampMs: timestampMs, context: context)
        resolve(result)
    }

    @objc(finishSpan:withTimestampms:withContext:withResolver:withRejecter:)
    func finishSpan(spanId: NSString, timestampMs: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.finishSpan(spanId: spanId, timestampMs: timestampMs, context: context)
        resolve(nil)
    }

}
