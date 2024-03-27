/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import React
import DatadogCore
import DatadogSDKReactNative
import DatadogInternal

@objc
public class DdInternalTestingImplementation: NSObject {
    @objc
    public func clearData(resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        let coreProxy = (DatadogSDKWrapper.shared.getCoreInstance() as! DatadogCoreProxy)
        coreProxy.waitAndDeleteEvents(ofFeature: "rum")
        coreProxy.waitAndDeleteEvents(ofFeature: "logging")
        coreProxy.waitAndDeleteEvents(ofFeature: "tracing")
        coreProxy.waitAndDeleteEvents(ofFeature: "session-replay")

        resolve(nil)
    }

    @objc
    public func getAllEvents(feature: String, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        do {
            let coreProxy = (DatadogSDKWrapper.shared.getCoreInstance() as! DatadogCoreProxy)
            let events = coreProxy.waitAndReturnEventsData(ofFeature: feature)
            let data = try JSONSerialization.data(withJSONObject: events, options: .prettyPrinted)
            resolve(String(data: data, encoding: String.Encoding.utf8) ?? "")
        } catch {
            consolePrint("\(error)", .error)
            reject(nil, "Cannot serialize events, check XCode console for more information", nil)
        }
        return
    }
    
    @objc
    public func enable(resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        DatadogSDKWrapper.shared.addOnCoreInitializedListener(listener: {core in
            let proxiedCore = DatadogCoreProxy(core: core)
            DatadogSDKWrapper.shared.setCoreInstance(core: proxiedCore)
        })
        resolve(nil)
    }
}

// This is to be used for native initialization
public class DdInternalTestingNativeInitialization: NSObject {
    @objc
    public func enableFromNative() -> Void {
        DatadogSDKWrapper.shared.addOnCoreInitializedListener(listener: {core in
            let proxiedCore = DatadogCoreProxy(core: core)
            DatadogSDKWrapper.shared.setCoreInstance(core: proxiedCore)
        })
    }
}
