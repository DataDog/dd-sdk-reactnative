/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import DatadogSDKBridge

@objc(DdLogs)
class RNDdLogs: NSObject {
    
    @objc(requiresMainQueueSetup)
    static func requiresMainQueueSetup() -> Bool {
        return false
    }

    let nativeInstance: DdLogs = Bridge.getDdLogs()

    @objc(debug:withContext:withResolver:withRejecter:)
    func debug(message: NSString, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.debug(message: message, context: context)
        resolve(nil)
    }

    @objc(info:withContext:withResolver:withRejecter:)
    func info(message: NSString, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.info(message: message, context: context)
        resolve(nil)
    }

    @objc(warn:withContext:withResolver:withRejecter:)
    func warn(message: NSString, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.warn(message: message, context: context)
        resolve(nil)
    }

    @objc(error:withContext:withResolver:withRejecter:)
    func error(message: NSString, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.error(message: message, context: context)
        resolve(nil)
    }

}
