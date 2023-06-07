/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import Datadog

extension DDLogger: NativeLogger {
    // Adding stubs until they are added to the the LoggerProtocol extension
    func debug(_ message: String, errorKind: String?, errorMessage: String?, stackTrace: String?, attributes: [String : Encodable]?) {
        log(level: .debug, message: message, errorKind: errorKind, errorMessage: errorMessage, stackTrace: stackTrace, attributes: attributes)
    }
    func info(_ message: String, errorKind: String?, errorMessage: String?, stackTrace: String?, attributes: [String : Encodable]?) {
        log(level: .info, message: message, errorKind: errorKind, errorMessage: errorMessage, stackTrace: stackTrace, attributes: attributes)
    }
    func warn(_ message: String, errorKind: String?, errorMessage: String?, stackTrace: String?, attributes: [String : Encodable]?) {
        log(level: .warn, message: message, errorKind: errorKind, errorMessage: errorMessage, stackTrace: stackTrace, attributes: attributes)
    }
    func error(_ message: String, errorKind: String?, errorMessage: String?, stackTrace: String?, attributes: [String : Encodable]?) {
        log(level: .error, message: message, errorKind: errorKind, errorMessage: errorMessage, stackTrace: stackTrace, attributes: attributes)
    }
}
internal protocol NativeLogger {
    func debug(_ message: String, error: Error?, attributes: [String: Encodable]?)
    func debug(_ message: String, errorKind: String?, errorMessage: String?, stackTrace: String?, attributes: [String: Encodable]?)
    func info(_ message: String, error: Error?, attributes: [String: Encodable]?)
    func info(_ message: String, errorKind: String?, errorMessage: String?, stackTrace: String?, attributes: [String: Encodable]?)
    func warn(_ message: String, error: Error?, attributes: [String: Encodable]?)
    func warn(_ message: String, errorKind: String?, errorMessage: String?, stackTrace: String?, attributes: [String: Encodable]?)
    func error(_ message: String, error: Error?, attributes: [String: Encodable]?)
    func error(_ message: String, errorKind: String?, errorMessage: String?, stackTrace: String?, attributes: [String: Encodable]?)
}

@objc
open class DdLogsImplementation: NSObject {
    private lazy var logger: NativeLogger = loggerProvider()
    private let loggerProvider: () -> NativeLogger
    private let isSDKInitialized: () -> Bool
    
    internal init(_ loggerProvider: @escaping () -> NativeLogger, _ isSDKInitialized: @escaping () -> Bool) {
        self.loggerProvider = loggerProvider
        self.isSDKInitialized = isSDKInitialized
    }

    @objc
    public override convenience init() {
        let builder = Logger.builder
            .sendNetworkInfo(true)
            .printLogsToConsole(true)
        self.init({ builder.build() }, { Datadog.isInitialized })
    }

    @objc
    open func debug(message: String, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        if (!self.isSDKInitialized()) {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
            return
        }
        let attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        logger.debug(message, error: nil, attributes: attributes)
        resolve(nil)
    }

    @objc
    open func info(message: String, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        if (!self.isSDKInitialized()) {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
            return
        }
        let attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        logger.info(message, error: nil, attributes: attributes)
        resolve(nil)
    }

    @objc
    open func warn(message: String, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        if (!self.isSDKInitialized()) {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
            return
        }
        let attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        logger.warn(message, error: nil, attributes: attributes)
        resolve(nil)
    }

    @objc
    open func error(message: String, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        if (!self.isSDKInitialized()) {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
            return
        }
        let attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        logger.error(message, error: nil, attributes: attributes)
        resolve(nil)
    }

    @objc
    open func debugWithError(message: String, errorKind: String?, errorMessage: String?, stacktrace: String?, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        if (!self.isSDKInitialized()) {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
            return
        }
        let attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        logger.debug(message, errorKind: errorKind, errorMessage: errorMessage, stackTrace: stacktrace, attributes: attributes)
        resolve(nil)
    }

    @objc
    open func infoWithError(message: String, errorKind: String?, errorMessage: String?, stacktrace: String?, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        if (!self.isSDKInitialized()) {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
            return
        }
        let attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        logger.info(message, errorKind: errorKind, errorMessage: errorMessage, stackTrace: stacktrace, attributes: attributes)
        resolve(nil)
    }

    @objc
    open func warnWithError(message: String, errorKind: String?, errorMessage: String?, stacktrace: String?, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        if (!self.isSDKInitialized()) {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
            return
        }
        let attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        logger.warn(message, errorKind: errorKind, errorMessage: errorMessage, stackTrace: stacktrace, attributes: attributes)
        resolve(nil)
    }

    @objc
    open func errorWithError(message: String, errorKind: String?, errorMessage: String?, stacktrace: String?, context: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        if (!self.isSDKInitialized()) {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
            return
        }
        let attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        logger.error(message, errorKind: errorKind, errorMessage: errorMessage, stackTrace: stacktrace, attributes: attributes)
        resolve(nil)
    }
}
