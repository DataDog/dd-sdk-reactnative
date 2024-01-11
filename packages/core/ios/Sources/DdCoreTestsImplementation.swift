/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import React
import DatadogCore
import DatadogInternal

@objc
public class DdCoreTestsImplementation: NSObject {
    private let getCoreProxy: () throws -> DatadogCoreProtocol
    
    internal init(_ getCoreProxy: @escaping () throws -> DatadogCoreProtocol) {
        self.getCoreProxy = getCoreProxy
    }

    private var proxy: DatadogCoreObserver? = nil

    @objc
    public override convenience init() {
        self.init({
            return Datadog.sdkInstance(named: CoreRegistry.defaultInstanceName)
        })
    }
    
    @objc
    public func startRecording(resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        do {
            let core = try getCoreProxy()
            self.proxy = DatadogCoreObserver(core: core)
        } catch {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
        }
        return
    }

    @objc
    public func clearData(resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        self.proxy?.waitAndDeleteEvents(ofFeature: "rum")
        self.proxy?.waitAndDeleteEvents(ofFeature: "logging")
        self.proxy?.waitAndDeleteEvents(ofFeature: "tracing")
        self.proxy?.waitAndDeleteEvents(ofFeature: "session-replay")

        resolve(nil)
        return
    }
    
    @objc
    public func getAllEvents(feature: String, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        do {
            let coreProxy = try getCoreProxy()
            let events = proxy?.waitAndReturnEvents(ofFeature: feature, ofType: AnyEncodable.self)
            let data = try JSONSerialization.data(withJSONObject: events, options: .prettyPrinted)
            resolve(String(data: data, encoding: String.Encoding.utf8) ?? "")
        } catch {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
        }
        return
    }
    
    @objc
    public func getAllEventsData(feature: String, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        do {
            let coreProxy = try getCoreProxy()
            let events = proxy?.waitAndReturnEventsData(ofFeature: feature)
            let data = try JSONSerialization.data(withJSONObject: events, options: .prettyPrinted)
            resolve(String(data: data, encoding: String.Encoding.utf8) ?? "")
        } catch {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
        }
        return
    }
}
