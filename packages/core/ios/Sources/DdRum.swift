/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import Datadog

extension DDRUMMonitor: NativeRUM { }
internal protocol NativeRUM {
    func startView(key: String, name: String?, attributes: [String: Encodable])
    func stopView(key: String, attributes: [String: Encodable])
    func addError(message: String, type: String?, source: RUMErrorSource, stack: String?, attributes: [String: Encodable], file: StaticString?, line: UInt?)
    func startResourceLoading(resourceKey: String, httpMethod: RUMMethod, urlString: String, attributes: [String: Encodable])
    func stopResourceLoading(resourceKey: String, statusCode: Int?, kind: RUMResourceType, size: Int64?, attributes: [String: Encodable])
    func startUserAction(type: RUMUserActionType, name: String, attributes: [String: Encodable])
    func stopUserAction(type: RUMUserActionType, name: String?, attributes: [String: Encodable])
    func addUserAction(type: RUMUserActionType, name: String, attributes: [String: Encodable])
    func addTiming(name: String)
    func stopSession()
    func addResourceMetrics(resourceKey: String,
                            fetch: (start: Date, end: Date),
                            redirection: (start: Date, end: Date)?,
                            dns: (start: Date, end: Date)?,
                            connect: (start: Date, end: Date)?,
                            ssl: (start: Date, end: Date)?,
                            firstByte: (start: Date, end: Date)?,
                            download: (start: Date, end: Date)?,
                            responseSize: Int64?,
                            attributes: [AttributeKey: AttributeValue])
    func addFeatureFlagEvaluation(name: String, value: Encodable)
}

private extension RUMUserActionType {
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

@objc(DdRum)
class RNDdRum: NSObject {
    internal static let timestampKey = "_dd.timestamp"
    internal static let resourceTimingsKey = "_dd.resource_timings"

    internal static let fetchTimingKey = "fetch"
    internal static let redirectTimingKey = "redirect"
    internal static let dnsTimingKey = "dns"
    internal static let connectTimingKey = "connect"
    internal static let sslTimingKey = "ssl"
    internal static let firstByteTimingKey = "firstByte"
    internal static let downloadTimingKey = "download"

    internal static let missingResourceSize = -1

    lazy var nativeRUM: NativeRUM = rumProvider()
    private let rumProvider: () -> NativeRUM

    private typealias UserAction = (type: RUMUserActionType, name: String?)

    internal init(_ rumProvider: @escaping () -> NativeRUM) {
        self.rumProvider = rumProvider
    }

    override convenience init() {
        self.init { Global.rum }
    }

    @objc(requiresMainQueueSetup)
    static func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc(methodQueue)
    let methodQueue: DispatchQueue = sharedQueue

    @objc(startView:withName:withContext:withTimestampms:withResolver:withRejecter:)
    func startView(key: String, name: String, context: NSDictionary, timestampMs: Int64, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.startView(key: key, name: name, attributes: attributes(from: context, with: timestampMs))
        resolve(nil)
    }

    @objc(stopView:withContext:withTimestampms:withResolver:withRejecter:)
    func stopView(key: String, context: NSDictionary, timestampMs: Int64, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.stopView(key: key, attributes: attributes(from: context, with: timestampMs))
        resolve(nil)
    }

    @objc(startAction:withName:withContext:withTimestampms:withResolver:withRejecter:)
    func startAction(type: String, name: String, context: NSDictionary, timestampMs: Int64, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.startUserAction(type: RUMUserActionType(from: type), name: name, attributes: attributes(from: context, with: timestampMs))
        resolve(nil)
    }

    @objc(stopAction:withName:withContext:withTimestampms:withResolver:withRejecter:)
    func stopAction(type: String, name: String, context: NSDictionary, timestampMs: Int64, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.stopUserAction(type: RUMUserActionType(from: type), name: name, attributes: attributes(from: context, with: timestampMs))
        resolve(nil)
    }

    @objc(addAction:withName:withContext:withTimestampms:withResolver:withRejecter:)
    func addAction(type: String, name: String, context: NSDictionary, timestampMs: Int64, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.addUserAction(type: RUMUserActionType(from: type), name: name, attributes: attributes(from: context, with: timestampMs))
        resolve(nil)
    }

    @objc(startResource:withMethod:withUrl:withContext:withTimestampms:withResolver:withRejecter:)
    func startResource(key: String, method: String, url: String, context: NSDictionary, timestampMs: Int64, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.startResourceLoading(resourceKey: key, httpMethod: RUMMethod(from: method), urlString: url, attributes: attributes(from: context, with: timestampMs))
        resolve(nil)
    }

    @objc(stopResource:withStatuscode:withKind:withSize:withContext:withTimestampms:withResolver:withRejecter:)
    func stopResource(key: String, statusCode: Int64, kind: String, size: Int64, context: NSDictionary, timestampMs: Int64, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        let mutableContext = NSMutableDictionary(dictionary: context)
        if let resourceTimings = mutableContext.object(forKey: Self.resourceTimingsKey) as? [String: Any] {
            mutableContext.removeObject(forKey: Self.resourceTimingsKey)

            addResourceMetrics(key: key, resourceTimings: resourceTimings)
        }

        nativeRUM.stopResourceLoading(
            resourceKey: key,
            statusCode: Int(statusCode),
            kind: RUMResourceType(from: kind),
            size: size == Self.missingResourceSize ? nil : size,
            attributes: attributes(from: mutableContext, with: timestampMs)
        )
        resolve(nil)
    }

    @objc(addError:withSource:withStacktrace:withContext:withTimestampms:withResolver:withRejecter:)
    func addError(message: String, source: String, stacktrace: String, context: NSDictionary, timestampMs: Int64, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.addError(message: message, type: nil, source: RUMErrorSource(from: source), stack: stacktrace, attributes: attributes(from: context, with: timestampMs), file: nil, line: nil)
        resolve(nil)
    }

    @objc(addTiming:withResolver:withRejecter:)
    func addTiming(name: String, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.addTiming(name: name)
        resolve(nil)
    }

    @objc(stopSession:withRejecter:)
    func stopSession(resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeRUM.stopSession()
        resolve(nil)
    }

    @objc(addFeatureFlagEvaluation:withValue:withResolver:withRejecter:)
    func addFeatureFlagEvaluation(name: String, value: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        let valueAsEncodable = castAttributesToSwift(value)
        if let value = valueAsEncodable["value"] {
            nativeRUM.addFeatureFlagEvaluation(name: name, value: value)
        }
        resolve(nil)
    }

    // MARK: - Private methods

    private func attributes(from context: NSDictionary, with timestampMs: Int64) -> [String: Encodable] {
        var context = context as? [String: Any] ?? [:]
        context[Self.timestampKey] = timestampMs
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
            nativeRUM.addResourceMetrics(
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
                responseSize: nil,
                attributes: [:]
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
