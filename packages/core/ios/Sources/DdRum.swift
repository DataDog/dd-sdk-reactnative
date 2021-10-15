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

    @objc(methodQueue)
    let methodQueue: DispatchQueue = sharedQueue

    @objc(startView:withName:withContext:withTimestampms:withResolver:withRejecter:)
    func startView(key: NSString, name: NSString, context: NSDictionary, timestampMs: Int64, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.startView(key: key, name: name, context: context, timestampMs: timestampMs)
        resolve(nil)
    }

    @objc(stopView:withContext:withTimestampms:withResolver:withRejecter:)
    func stopView(key: NSString, context: NSDictionary, timestampMs: Int64, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.stopView(key: key, context: context, timestampMs: timestampMs)
        resolve(nil)
    }

    @objc(startAction:withName:withContext:withTimestampms:withResolver:withRejecter:)
    func startAction(type: NSString, name: NSString, context: NSDictionary, timestampMs: Int64, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.startAction(type: type, name: name, context: context, timestampMs: timestampMs)
        resolve(nil)
    }

    @objc(stopAction:withTimestampms:withResolver:withRejecter:)
    func stopAction(context: NSDictionary, timestampMs: Int64, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.stopAction(context: context, timestampMs: timestampMs)
        resolve(nil)
    }

    @objc(addAction:withName:withContext:withTimestampms:withResolver:withRejecter:)
    func addAction(type: NSString, name: NSString, context: NSDictionary, timestampMs: Int64, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.addAction(type: type, name: name, context: context, timestampMs: timestampMs)
        resolve(nil)
    }

    @objc(startResource:withMethod:withUrl:withContext:withTimestampms:withResolver:withRejecter:)
    func startResource(key: NSString, method: NSString, url: NSString, context: NSDictionary, timestampMs: Int64, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.startResource(key: key, method: method, url: url, context: context, timestampMs: timestampMs)
        resolve(nil)
    }

    @objc(stopResource:withStatuscode:withKind:withSize:withContext:withTimestampms:withResolver:withRejecter:)
    func stopResource(key: NSString, statusCode: Int64, kind: NSString, size: Int64, context: NSDictionary, timestampMs: Int64, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.stopResource(key: key, statusCode: statusCode, kind: kind, size: size, context: context, timestampMs: timestampMs)
        resolve(nil)
    }

    @objc(addError:withSource:withStacktrace:withContext:withTimestampms:withResolver:withRejecter:)
    func addError(message: NSString, source: NSString, stacktrace: NSString, context: NSDictionary, timestampMs: Int64, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.addError(message: message, source: source, stacktrace: stacktrace, context: context, timestampMs: timestampMs)
        resolve(nil)
    }

    @objc(addTiming:withResolver:withRejecter:)
    func addTiming(name: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.addTiming(name: name)
        resolve(nil)
    }

}
