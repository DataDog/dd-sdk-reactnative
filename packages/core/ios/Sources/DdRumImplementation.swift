/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
@_spi(Experimental)
import DatadogRUM
import DatadogInternal
import React

private extension RUMActionType {
    init(from string: String) {
        switch string.lowercased() {
        case "tap": self = .tap
        case "scroll": self = .scroll
        case "swipe": self = .swipe
        default: self = .custom
        }
    }
}

internal extension RUMErrorSource {
    init(from string: String) {
        switch string.lowercased() {
        case "source": self = .source
        case "network": self = .network
        case "webview": self = .webview
        case "console": self = .console
        default: self = .custom
        }
    }
}

private extension RUMResourceType {
    init(from string: String) {
        switch string {
        case "image": self = .image
        case "xhr": self = .xhr
        case "beacon": self = .beacon
        case "css": self = .css
        case "document": self = .document
        case "fetch": self = .fetch
        case "font": self = .font
        case "js": self = .js
        case "media": self = .media
        default: self = .other
        }
    }
}

private extension RUMMethod {
    init(from string: String) {
        switch string.uppercased() {
        case "POST": self = .post
        case "GET": self = .get
        case "HEAD": self = .head
        case "PUT": self = .put
        case "DELETE": self = .delete
        case "PATCH": self = .patch
        default: self = .get
        }
    }
}

internal extension RUMFeatureOperationFailureReason {
    init(from string: String) {
        switch string.lowercased() {
        case "error": self = .error
        case "abandoned": self = .abandoned
        default: self = .other
        }
    }
}

@objc
public class DdRumImplementation: NSObject {
    internal static let timestampKey = "_dd.timestamp"
    internal static let fingerprintKey = "_dd.error.fingerprint"
    internal static let resourceTimingsKey = "_dd.resource_timings"

    internal static let fetchTimingKey = "fetch"
    internal static let redirectTimingKey = "redirect"
    internal static let dnsTimingKey = "dns"
    internal static let connectTimingKey = "connect"
    internal static let sslTimingKey = "ssl"
    internal static let firstByteTimingKey = "firstByte"
    internal static let downloadTimingKey = "download"

    internal static let missingResourceSize = -1

    lazy var nativeRUM: RUMMonitorProtocol = rumProvider()
    lazy var rumInternal: RUMMonitorInternalProtocol? = rumInternalProvider()
    lazy var heatmapIdentifierRegistry: HeatmapIdentifierRegistry? = heatmapIdentifierRegistryProvider()
    private let mainDispatchQueue: DispatchQueueType
    private let uiManager: RCTUIManager
    private let rootViewProvider: () -> UIView?
    private let heatmapIdentifierRegistryProvider: () -> HeatmapIdentifierRegistry?
    private let rumProvider: () -> RUMMonitorProtocol
    private let rumInternalProvider: () -> RUMMonitorInternalProtocol?

    private typealias UserAction = (type: RUMActionType, name: String?)

    internal init(
        mainDispatchQueue: DispatchQueueType,
        uiManager: RCTUIManager,
        rootViewProvider: @escaping () -> UIView?,
        heatmapIdentifierRegistryProvider: @escaping () -> HeatmapIdentifierRegistry?,
        rumProvider: @escaping () -> RUMMonitorProtocol,
        rumInternalProvider: @escaping () -> RUMMonitorInternalProtocol?
    ) {
        self.mainDispatchQueue = mainDispatchQueue
        self.uiManager = uiManager
        self.rootViewProvider = rootViewProvider
        self.heatmapIdentifierRegistryProvider = heatmapIdentifierRegistryProvider
        self.rumProvider = rumProvider
        self.rumInternalProvider = rumInternalProvider
    }

    @objc
    public convenience init(bridge: RCTBridge) {
        self.init(
            mainDispatchQueue: DispatchQueue.main,
            uiManager: bridge.uiManager,
            rootViewProvider: { UIWindow.reactRootView() },
            heatmapIdentifierRegistryProvider: { CoreRegistry.default.heatmapIdentifierRegistry },
            rumProvider: { RUMMonitor.shared() },
            rumInternalProvider: { RUMMonitor.shared()._internal }
        )
    }

    @objc
    public func startView(key: String, name: String, context: NSDictionary, timestampMs: Double, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.startView(key: key, name: name, attributes: attributes(from: context, with: timestampMs))
        resolve(nil)
    }

    @objc
    public func stopView(key: String, context: NSDictionary, timestampMs: Double, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.stopView(key: key, attributes: attributes(from: context, with: timestampMs))
        resolve(nil)
    }

    @objc
    public func startAction(type: String, name: String, context: NSDictionary, timestampMs: Double, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.startAction(type: RUMActionType(from: type), name: name, attributes: attributes(from: context, with: timestampMs))
        resolve(nil)
    }

    @objc
    public func stopAction(type: String, name: String, context: NSDictionary, timestampMs: Double, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.stopAction(type: RUMActionType(from: type), name: name, attributes: attributes(from: context, with: timestampMs))
        resolve(nil)
    }

    @objc
    public func addAction(type: String, name: String, touch: NSDictionary?, context: NSDictionary, timestampMs: Double, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        if
            let touch,
            let reactTag = touch["reactTag"] as? NSNumber,
            let x = touch["x"] as? NSNumber,
            let y = touch["y"] as? NSNumber,
            let pageX = touch["pageX"] as? NSNumber,
            let pageY = touch["pageY"] as? NSNumber
        {
            addAction(
                at: Date(timeIntervalSince1970: timestampMs / 1_000),
                type: RUMActionType(from: type),
                name: name,
                reactTag: reactTag,
                location: .init(x: CGFloat(truncating: x), y: CGFloat(truncating: y)),
                pageLocation: .init(x: CGFloat(truncating: pageX), y: CGFloat(truncating: pageY)),
                attributes: castAttributesToSwift(context)
            )
        } else {
            nativeRUM.addAction(type: RUMActionType(from: type), name: name, attributes: attributes(from: context, with: timestampMs))
        }
        resolve(nil)
    }

    @objc
    public func startResource(key: String, method: String, url: String, context: NSDictionary, timestampMs: Double, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.startResource(resourceKey: key, httpMethod: RUMMethod(from: method), urlString: url, attributes: attributes(from: context, with: timestampMs))
        resolve(nil)
    }

    @objc
    public func stopResource(key: String, statusCode: Int64, kind: String, size: Double, context: NSDictionary, timestampMs: Double, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        let mutableContext = NSMutableDictionary(dictionary: context)
        if let resourceTimings = mutableContext.object(forKey: Self.resourceTimingsKey) as? [String: Any] {
            mutableContext.removeObject(forKey: Self.resourceTimingsKey)

            addResourceMetrics(key: key, resourceTimings: resourceTimings)
        }

        nativeRUM.stopResource(
            resourceKey: key,
            statusCode: Int(statusCode),
            kind: RUMResourceType(from: kind),
            size: Int64(size) == Self.missingResourceSize ? nil : Int64(size),
            attributes: attributes(from: mutableContext, with: timestampMs)
        )
        resolve(nil)
    }

    @objc
    public func addError(message: String, source: String, stacktrace: String, context: NSDictionary, timestampMs: Double, fingerprint: String, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
    
        func addErrorWithContext(errorContext: NSDictionary) -> Void {
            nativeRUM.addError(message: message, type: nil, stack: stacktrace, source: RUMErrorSource(from: source), attributes: attributes(from: errorContext, with: timestampMs), file: nil, line: nil)
        }
        
        if !fingerprint.isEmpty {
            let updatedContext = NSMutableDictionary(dictionary: context)
            updatedContext[Self.fingerprintKey] = fingerprint
            addErrorWithContext(errorContext: updatedContext)
        } else {
            addErrorWithContext(errorContext: context)
        }
        
        resolve(nil)
    }

    @objc
    public func addTiming(name: String, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.addTiming(name: name)
        resolve(nil)
    }
    
    @objc
    public func addViewAttribute(key: AttributeKey, value: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        if let attributeValue = value.object(forKey: "value") {
            let castedAttribute = castValueToSwift(attributeValue)
            nativeRUM.addViewAttribute(forKey: key, value: castedAttribute)
        }
        resolve(nil)
    }
    
    @objc
    public func removeViewAttribute(key: AttributeKey, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.removeViewAttribute(forKey: key)
        resolve(nil)
    }
    
    @objc
    public func addViewAttributes(attributes: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        let castedAttributes = castAttributesToSwift(attributes)
        nativeRUM.addViewAttributes(castedAttributes)
        resolve(nil)
    }
    
    @objc
    public func removeViewAttributes(keys: [AttributeKey], resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.removeViewAttributes(forKeys: keys)
        resolve(nil)
    }
    
    @objc
    public func addViewLoadingTime(overwrite: Bool, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.addViewLoadingTime(overwrite: overwrite)
        resolve(nil)
    }

    @objc
    public func reportAppFullyDisplayed(resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.reportAppFullyDisplayed()
        resolve(nil)
    }

    @objc
    public func stopSession(resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.stopSession()
        resolve(nil)
    }

    @objc
    public func addFeatureFlagEvaluation(name: String, value: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        let valueAsEncodable = castAttributesToSwift(value)
        if let value = valueAsEncodable["value"] {
            nativeRUM.addFeatureFlagEvaluation(name: name, value: value)
        }
        resolve(nil)
    }
    
    @objc
    public func getCurrentSessionId(_ resolve: @escaping (Any?) -> Void, reject: RCTPromiseRejectBlock) -> Void {
        nativeRUM.currentSessionID { sessionId in
            resolve(sessionId)
        }
    }
    
    @objc
    public func startFeatureOperation(
        name: String,
        operationKey: String?,
        attributes: NSDictionary,
        resolve: @escaping (Any?) -> Void,
        reject: RCTPromiseRejectBlock
    ){
        let castedAttributes = castAttributesToSwift(attributes)
        nativeRUM.startFeatureOperation(name: name, operationKey: operationKey, attributes: castedAttributes)
        resolve(nil)
    }

    @objc
    public func succeedFeatureOperation(
        name: String,
        operationKey: String?,
        attributes: NSDictionary,
        resolve: @escaping (Any?) -> Void,
        reject: RCTPromiseRejectBlock
    ){
        let castedAttributes = castAttributesToSwift(attributes)
        nativeRUM.succeedFeatureOperation(name: name, operationKey: operationKey, attributes: castedAttributes)
        resolve(nil)
    }

    @objc
    public func failFeatureOperation(
        name: String,
        operationKey: String?,
        reason: String,
        attributes: NSDictionary,
        resolve: @escaping (Any?) -> Void,
        reject: RCTPromiseRejectBlock
    ){
        let castedAttributes = castAttributesToSwift(attributes)
        nativeRUM.failFeatureOperation(name: name, operationKey: operationKey,
                                       reason: RUMFeatureOperationFailureReason(from: reason), attributes: castedAttributes)
        resolve(nil)
    }

    // MARK: - Private methods

    private func attributes(from context: NSDictionary, with timestampMs: Double) -> [String: Encodable] {
        var context = context as? [String: Any] ?? [:]
        context[Self.timestampKey] = Int64(timestampMs)
        return castAttributesToSwift(context)
    }

    private func addResourceMetrics(key: String, resourceTimings: [String: Any]) {
        let fetch = timingValue(from: resourceTimings, for: Self.fetchTimingKey)
        let redirect = timingValue(from: resourceTimings, for: Self.redirectTimingKey)
        let dns = timingValue(from: resourceTimings, for: Self.dnsTimingKey)
        let connect = timingValue(from: resourceTimings, for: Self.connectTimingKey)
        let ssl = timingValue(from: resourceTimings, for: Self.sslTimingKey)
        let firstByte = timingValue(from: resourceTimings, for: Self.firstByteTimingKey)
        let download = timingValue(from: resourceTimings, for: Self.downloadTimingKey)

        
        if let fetch = fetch {
            rumInternal?.addResourceMetrics(
                at: Date.init(),
                resourceKey: key,
                fetch: fetch,
                redirection: redirect,
                dns: dns,
                connect: connect,
                ssl: ssl,
                firstByte: firstByte,
                download: download,
                // no need to define the size here, because if it is missing,
                // it will be taken from the command
                responseBodySize: nil,
                requestBodySize: nil,
                attributes: [:]
            )
        }
    }

    private func addAction(
        at time: Date,
        type: RUMActionType,
        name: String,
        reactTag: NSNumber,
        location: CGPoint,
        pageLocation: CGPoint,
        attributes: [AttributeKey: AttributeValue]
    ) {
        mainDispatchQueue.async { [uiManager, rootViewProvider, heatmapIdentifierRegistry, rumInternal] in
            var location = location
            let view = uiManager.view(
                forReactTag: reactTag,
                location: &location,
                pageLocation: pageLocation,
                rootViewProvider: rootViewProvider
            )

            let heatmapAttributes: HeatmapAttributes? = view.flatMap { view in
                guard let identifier = heatmapIdentifierRegistry?.heatmapIdentifier(for: ObjectIdentifier(view)) else {
                    return nil
                }
                return HeatmapAttributes(
                    identifier: identifier,
                    size: view.bounds.size,
                    location: location
                )
            }
            rumInternal?.addAction(
                at: time,
                type: type,
                name: name,
                heatmapAttributes: heatmapAttributes,
                attributes: attributes
            )
        }
    }

    private func timingValue(from timings: [String: Any], for timingName: String) -> (start: Date, end: Date)? {
        let timing = timings[timingName] as? [String: NSNumber]
        if let startInNs = timing?["startTime"]?.int64Value, let durationInNs = timing?["duration"]?.int64Value {
            return (
                Date(timeIntervalSince1970: TimeInterval(fromNs: startInNs)),
                Date(timeIntervalSince1970: TimeInterval(fromNs: startInNs + durationInNs))
            )
        }
        return nil
    }
}

internal extension TimeInterval {
    init(fromNs ns: Int64) { self = TimeInterval(Double(ns) / 1_000_000_000) }
}
