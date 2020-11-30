/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import Datadog

@objc(DdRum)
class RNDdRum: NSObject {

    let nativeInstance: DdRum = Bridge.getDdRum()

    @objc(startView:withName:withTimestamp:withContext:withResolver:withRejecter:)
    func startView(key: NSString, name: NSString, timestamp: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.startView(key: key, name: name, timestamp: timestamp, context: context)
        resolve(nil)
    }

    @objc(stopView:withTimestamp:withContext:withResolver:withRejecter:)
    func stopView(key: NSString, timestamp: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.stopView(key: key, timestamp: timestamp, context: context)
        resolve(nil)
    }

    @objc(startAction:withName:withTimestamp:withContext:withResolver:withRejecter:)
    func startAction(type: NSString, name: NSString, timestamp: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.startAction(type: type, name: name, timestamp: timestamp, context: context)
        resolve(nil)
    }

    @objc(stopAction:withContext:withResolver:withRejecter:)
    func stopAction(timestamp: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.stopAction(timestamp: timestamp, context: context)
        resolve(nil)
    }

    @objc(addAction:withName:withTimestamp:withContext:withResolver:withRejecter:)
    func addAction(type: NSString, name: NSString, timestamp: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.addAction(type: type, name: name, timestamp: timestamp, context: context)
        resolve(nil)
    }

    @objc(startResource:withMethod:withUrl:withTimestamp:withContext:withResolver:withRejecter:)
    func startResource(key: NSString, method: NSString, url: NSString, timestamp: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.startResource(key: key, method: method, url: url, timestamp: timestamp, context: context)
        resolve(nil)
    }

    @objc(stopResource:withStatuscode:withKind:withTimestamp:withContext:withResolver:withRejecter:)
    func stopResource(key: NSString, statusCode: Int64, kind: NSString, timestamp: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.stopResource(key: key, statusCode: statusCode, kind: kind, timestamp: timestamp, context: context)
        resolve(nil)
    }

    @objc(addError:withSource:withStacktrace:withTimestamp:withContext:withResolver:withRejecter:)
    func addError(message: NSString, source: NSString, stacktrace: NSString, timestamp: Int64, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.addError(message: message, source: source, stacktrace: stacktrace, timestamp: timestamp, context: context)
        resolve(nil)
    }

}
