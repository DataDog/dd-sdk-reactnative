/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import DatadogSDKBridge

@objc(DdSdk)
class RNDdSdk: NSObject {

    @objc(requiresMainQueueSetup)
    static func requiresMainQueueSetup() -> Bool {
        return false
    }

    let nativeInstance: DdSdk = Bridge.getDdSdk()

    @objc(methodQueue)
    let methodQueue: DispatchQueue = sharedQueue

    @objc(initialize:withResolver:withRejecter:)
    func initialize(configuration: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        // Datadog SDK init needs to happen on the main thread: https://github.com/DataDog/dd-sdk-reactnative/issues/198
        // This is safe because the main queue will never be blocked waiting for the sharedQueue
        // Adding an extra check in case sharedQueue is ever changed to be DispatchQueue.main.
        if Thread.isMainThread {
            nativeInstance.initialize(configuration: configuration.asDdSdkConfiguration())
        } else {
            DispatchQueue.main.sync {
                nativeInstance.initialize(configuration: configuration.asDdSdkConfiguration())
            }
        }
        resolve(nil)
    }

    @objc(setAttributes:withResolver:withRejecter:)
    func setAttributes(attributes: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.setAttributes(attributes: attributes)
        resolve(nil)
    }

    @objc(setUser:withResolver:withRejecter:)
    func setUser(user: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.setUser(user: user)
        resolve(nil)
    }

    @objc(setTrackingConsent:withResolver:withRejecter:)
    func setTrackingConsent(trackingConsent: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.setTrackingConsent(trackingConsent: trackingConsent)
        resolve(nil)
    }

}
