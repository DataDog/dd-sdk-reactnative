/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import Datadog

extension DDLogger: NativeLogger { }
internal protocol NativeLogger {
    func debug(_ message: String, error: Error?, attributes: [String: Encodable]?)
    func info(_ message: String, error: Error?, attributes: [String: Encodable]?)
    func warn(_ message: String, error: Error?, attributes: [String: Encodable]?)
    func error(_ message: String, error: Error?, attributes: [String: Encodable]?)
}

@objc(DdLogs)
class RNDdLogs: NSObject {

    @objc(requiresMainQueueSetup)
    static func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc(methodQueue)
    let methodQueue: DispatchQueue = sharedQueue

    private lazy var logger: NativeLogger = loggerProvider()
    private let loggerProvider: () -> NativeLogger

    internal init(_ loggerProvider: @escaping () -> NativeLogger) {
        self.loggerProvider = loggerProvider
    }

    override public convenience init() {
        let builder = Logger.builder
            .sendNetworkInfo(true)
            .printLogsToConsole(true)
        self.init { builder.build() }
    }

    @objc(debug:withContext:withUserInfo:withResolver:withRejecter:)
    func debug(message: String, context: NSDictionary, userInfo: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        var attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        attributes[LogMapperAttributes.extraUserInfo] = userInfo["extraUserInfo"] as? any Encodable

        logger.debug(message, error: nil, attributes: attributes)
        resolve(nil)
    }

    @objc(info:withContext:withResolver:withRejecter:)
    func info(message: String, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        let attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        logger.info(message, error: nil, attributes: attributes)
        resolve(nil)
    }

    @objc(warn:withContext:withResolver:withRejecter:)
    func warn(message: String, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        let attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        logger.warn(message, error: nil, attributes: attributes)
        resolve(nil)
    }

    @objc(error:withContext:withResolver:withRejecter:)
    func error(message: String, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        let attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        logger.error(message, error: nil, attributes: attributes)
        resolve(nil)
    }

}
