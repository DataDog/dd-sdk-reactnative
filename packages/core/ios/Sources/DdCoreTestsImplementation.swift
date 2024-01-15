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
    private let getCoreProxy: () throws -> DatadogCoreProxy
    
    internal init(_ getCoreProxy: @escaping () throws -> DatadogCoreProxy) {
        self.getCoreProxy = getCoreProxy
    }

    @objc
    public override convenience init() {
        self.init({
            return DatadogCoreProxy.instance!
        })
    }
    
    @objc
    public func startRecording(resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        resolve(nil)
        return
    }

    @objc
    public func clearData(resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        do {
            try self.getCoreProxy().waitAndDeleteEvents(ofFeature: "rum")
            try self.getCoreProxy().waitAndDeleteEvents(ofFeature: "logging")
            try self.getCoreProxy().waitAndDeleteEvents(ofFeature: "tracing")
            try self.getCoreProxy().waitAndDeleteEvents(ofFeature: "session-replay")

            resolve(nil)
            return
        } catch {
            
        }
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

internal class DatadogCoreProxy: DatadogCoreProtocol {
    let core: DatadogCoreProtocol
    
    private var featureScopeInterceptors: [String: FeatureScopeInterceptor] = [:]

    static var instance: DatadogCoreProxy? = nil
    static func initialize(core: DatadogCoreProtocol) -> DatadogCoreProxy {
        let proxy = DatadogCoreProxy(core: core)
        self.instance = proxy
        return proxy
    }
    
    init(core: DatadogCoreProtocol) {
        self.core = core
    }
    
    func get<T>(feature type: T.Type) -> T? where T : DatadogInternal.DatadogFeature {
        return core.get(feature: type)
    }

    func register<T>(feature: T) throws where T: DatadogFeature {
        do {
            try self.core.register(feature: feature)
            featureScopeInterceptors[T.name] = FeatureScopeInterceptor()
        } catch {
            
        }
    }
    
    func scope(for feature: String) -> FeatureScope? {
        if let interceptor = featureScopeInterceptors[feature] {
            return core.scope(for: feature).map { scope in
                FeatureScopeProxy(proxy: scope, interceptor: interceptor)
            }
        }
        return core.scope(for: feature)
    }

    func send(message: DatadogInternal.FeatureMessage, else fallback: @escaping () -> Void) {
        // not implemented
    }

    func set(baggage: @escaping () -> DatadogInternal.FeatureBaggage?, forKey key: String) {
        // not implemented
    }
    
    
}

private struct FeatureScopeProxy: FeatureScope {
    let proxy: FeatureScope
    let interceptor: FeatureScopeInterceptor

    func eventWriteContext(bypassConsent: Bool, forceNewBatch: Bool, _ block: @escaping (DatadogContext, Writer) -> Void) {
        interceptor.enter()
        proxy.eventWriteContext(bypassConsent: bypassConsent, forceNewBatch: forceNewBatch) { context, writer in
            block(context, interceptor.intercept(writer: writer))
            interceptor.leave()
        }
    }

    func context(_ block: @escaping (DatadogInternal.DatadogContext) -> Void) {
        proxy.context(block)
    }
}

private class FeatureScopeInterceptor {
    struct InterceptingWriter: Writer {
        static let jsonEncoder = JSONEncoder.dd.default()

        let actualWriter: Writer
        unowned var interception: FeatureScopeInterceptor?

        func write<T: Encodable, M: Encodable>(value: T, metadata: M) {
            actualWriter.write(value: value, metadata: metadata)

            let event = value
            let data = try! InterceptingWriter.jsonEncoder.encode(value)
            NSLog(data.base64EncodedString())
            interception?.events.append((event, data))
        }
    }

    func intercept(writer: Writer) -> Writer {
        return InterceptingWriter(actualWriter: writer, interception: self)
    }

    // MARK: - Synchronizing and awaiting events:

    @ReadWriteLock
    private var events: [(event: Any, data: Data)] = []

    private let group = DispatchGroup()

    func enter() { group.enter() }
    func leave() { group.leave() }
    
    func waitAndDeleteEvents() -> Void {
        _ = group.wait(timeout: .distantFuture)
        events = []
    }

    func waitAndReturnEvents() -> [(event: Any, data: Data)] {
        _ = group.wait(timeout: .distantFuture)
        return events
    }
}

extension DatadogCoreProxy {
    /// Returns all events of given type for certain Feature.
    /// - Parameters:
    ///   - name: The Feature to retrieve events from
    ///   - type: The type of events to filter out
    /// - Returns: A list of events.
    public func waitAndReturnEvents<T>(ofFeature name: String, ofType type: T.Type) -> [T] where T: Encodable {
        let interceptor = self.featureScopeInterceptors[name]!
        return interceptor.waitAndReturnEvents().compactMap { $0.event as? T }
    }

    /// Returns serialized events of given Feature.
    ///
    /// - Parameter feature: The Feature to retrieve events from
    /// - Returns: A list of serialized events.
    public func waitAndReturnEventsData(ofFeature name: String) -> [String] {
        let interceptor = self.featureScopeInterceptors[name]!
        return interceptor.waitAndReturnEvents().compactMap { $0.data.base64EncodedString() }
    }

    /// Clears all events of a given Feature
    ///
    /// - Parameter feature: The Feature to delete events from
    public func waitAndDeleteEvents(ofFeature name: String) -> Void {
        let interceptor = self.featureScopeInterceptors[name]!
        interceptor.waitAndDeleteEvents()
    }
}
