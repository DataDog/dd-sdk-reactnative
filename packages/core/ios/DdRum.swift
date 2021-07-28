/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import DatadogSDKBridge

@objc(DdRum)
class RNDdRum: NSObject {

    @objc(requiresMainQueueSetup)
    static func requiresMainQueueSetup() -> Bool {
        return false
    }

    let nativeInstance: DdRum = Bridge.getDdRum()

    @objc(startView:withName:withTimestampms:withContext:withResolver:withRejecter:)
    func startView(key: NSString, name: NSString, timestampMs: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.startView(key: key, name: name, timestampMs: timestampMs, context: context)
        resolve(nil)
    }

    @objc(stopView:withTimestampms:withContext:withResolver:withRejecter:)
    func stopView(key: NSString, timestampMs: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.stopView(key: key, timestampMs: timestampMs, context: context)
        resolve(nil)
    }

    @objc(startAction:withName:withTimestampms:withContext:withResolver:withRejecter:)
    func startAction(type: NSString, name: NSString, timestampMs: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.startAction(type: type, name: name, timestampMs: timestampMs, context: context)
        resolve(nil)
    }

    @objc(stopAction:withContext:withResolver:withRejecter:)
    func stopAction(timestampMs: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.stopAction(timestampMs: timestampMs, context: context)
        resolve(nil)
    }

    @objc(addAction:withName:withTimestampms:withContext:withResolver:withRejecter:)
    func addAction(type: NSString, name: NSString, timestampMs: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.addAction(type: type, name: name, timestampMs: timestampMs, context: context)
        resolve(nil)
    }

    @objc(startResource:withMethod:withUrl:withTimestampms:withContext:withResolver:withRejecter:)
    func startResource(key: NSString, method: NSString, url: NSString, timestampMs: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.startResource(key: key, method: method, url: url, timestampMs: timestampMs, context: context)
        resolve(nil)
    }

    @objc(stopResource:withStatuscode:withKind:withTimestampms:withContext:withResolver:withRejecter:)
    func stopResource(key: NSString, statusCode: Int64, kind: NSString, timestampMs: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.stopResource(key: key, statusCode: statusCode, kind: kind, timestampMs: timestampMs, context: context)
        resolve(nil)
    }

    @objc(addError:withSource:withStacktrace:withTimestampms:withContext:withResolver:withRejecter:)
    func addError(message: NSString, source: NSString, stacktrace: NSString, timestampMs: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.addError(message: message, source: source, stacktrace: stacktrace, timestampMs: timestampMs, context: context)
        resolve(nil)
    }

    @objc(addTiming:withResolver:withRejecter:)
    func addTiming(name: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.addTiming(name: name)
        resolve(nil)
    }

}
