/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import DatadogCore
import DatadogInternal

@objc
public class DdCoreTestsImplementation: NSObject {
    private let getCoreProxy: () throws -> DatadogCoreProxy
    
    internal init(_ getCoreProxy: @escaping () throws -> DatadogCoreProxy) {
        self.getCoreProxy = getCoreProxy
    }

    @objc
    public override convenience init() {
        self.init({
            guard let coreProxy = Datadog.sdkInstance(named: CoreRegistry.defaultInstanceName) as? DatadogCoreProxy else {
                throw InternalError(description: "Core is not proxy")
            }
            return coreProxy
        })
    }

    @objc
    public func clearData(resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        do {
            let coreProxy = try getCoreProxy()
            coreProxy.waitAndDeleteEvents(ofFeature: "rum")
            coreProxy.waitAndDeleteEvents(ofFeature: "logging")
            coreProxy.waitAndDeleteEvents(ofFeature: "tracing")
            coreProxy.waitAndDeleteEvents(ofFeature: "session-replay")
            resolve(nil)
        } catch {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
        }
        return
    }
    
    @objc
    public func getAllEvents(feature: String, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        do {
            let coreProxy = try getCoreProxy()
            let events = coreProxy.waitAndReturnEvents(ofFeature: feature, ofType: AnyEncodable.self)
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
            let events = coreProxy.waitAndReturnEventsData(ofFeature: feature)
            let data = try JSONSerialization.data(withJSONObject: events, options: .prettyPrinted)
            resolve(String(data: data, encoding: String.Encoding.utf8) ?? "")
        } catch {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
        }
        return
    }
}
