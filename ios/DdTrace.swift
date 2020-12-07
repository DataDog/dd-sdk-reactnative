/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import Datadog

@objc(DdTrace)
class RNDdTrace: NSObject {

    let nativeInstance: DdTrace = Bridge.getDdTrace()

    @objc(startSpan:withTimestamp:withContext:withResolver:withRejecter:)
    func startSpan(operation: NSString, timestamp: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        let result = nativeInstance.startSpan(operation: operation, timestamp: timestamp, context: context)
        resolve(result)
    }

    @objc(finishSpan:withTimestamp:withContext:withResolver:withRejecter:)
    func finishSpan(spanId: NSString, timestamp: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.finishSpan(spanId: spanId, timestamp: timestamp, context: context)
        resolve(nil)
    }

}
