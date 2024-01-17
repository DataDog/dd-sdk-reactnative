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
    private var coreProxy: DatadogCoreProxy? = nil

    @objc
    public func clearData(resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        self.coreProxy?.waitAndDeleteEvents(ofFeature: "rum")
        self.coreProxy?.waitAndDeleteEvents(ofFeature: "logging")
        self.coreProxy?.waitAndDeleteEvents(ofFeature: "tracing")
        self.coreProxy?.waitAndDeleteEvents(ofFeature: "session-replay")

        resolve(nil)
    }

    @objc
    public func getAllEvents(feature: String, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        do {
            let events = coreProxy?.waitAndReturnEventsData(ofFeature: feature) ?? []
            let data = try JSONSerialization.data(withJSONObject: events, options: .prettyPrinted)
            resolve(String(data: data, encoding: String.Encoding.utf8) ?? "")
        } catch {
            consolePrint("\(error)")
            reject(nil, "Cannot serialize events, check XCode console for more information", nil)
        }
        return
    }
    
    @objc
    public func enable(resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        resolve(nil)
    }
}
