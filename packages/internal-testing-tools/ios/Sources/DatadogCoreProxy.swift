/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import DatadogCore
import DatadogInternal

internal class DatadogCoreProxy: DatadogCoreProtocol {
    let core: DatadogCoreProtocol
    
    private var featureScopeInterceptors: [String: FeatureScopeInterceptor] = [:]

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
            // TODO: add logging here
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
        core.send(message: message, else: fallback)
    }

    func set(baggage: @escaping () -> DatadogInternal.FeatureBaggage?, forKey key: String) {
        core.set(baggage: baggage, forKey: key)
    }


}

private struct FeatureScopeProxy: FeatureScope {
    let proxy: FeatureScope
    let interceptor: FeatureScopeInterceptor

    // Change function signature in next release
    func eventWriteContext(bypassConsent: Bool, forceNewBatch: Bool, _ block: @escaping (DatadogContext, Writer) throws -> Void) {
        interceptor.enter()
        proxy.eventWriteContext(bypassConsent: bypassConsent, forceNewBatch: forceNewBatch) { context, writer in
            do {
                try block(context, interceptor.intercept(writer: writer))
            } catch {
                
            }
            interceptor.leave()
        }
    }

    // Uncomment this on the next release
//    func context(_ block: @escaping (DatadogInternal.DatadogContext) -> Void) {
//        proxy.context(block)
//    }
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
        if let interceptor = self.featureScopeInterceptors[name] {
            return interceptor.waitAndReturnEvents().compactMap { $0.event as? T }
        }
        return []
    }

    /// Returns serialized events of given Feature.
    ///
    /// - Parameter feature: The Feature to retrieve events from
    /// - Returns: A list of serialized events.
    public func waitAndReturnEventsData(ofFeature name: String) -> [String] {
        if let interceptor = self.featureScopeInterceptors[name] {
            return interceptor.waitAndReturnEvents().compactMap { $0.data.base64EncodedString() }
        }
        return []
    }

    /// Clears all events of a given Feature
    ///
    /// - Parameter feature: The Feature to delete events from
    public func waitAndDeleteEvents(ofFeature name: String) -> Void {
        if let interceptor = self.featureScopeInterceptors[name] {
            interceptor.waitAndDeleteEvents()
        }
    }
}
