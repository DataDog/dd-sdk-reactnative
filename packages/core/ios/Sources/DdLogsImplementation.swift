/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import DatadogLogs
import DatadogCore

@objc
public class DdLogsImplementation: NSObject {
    private lazy var logger: LoggerProtocol = loggerProvider()
    private let loggerProvider: () -> LoggerProtocol
    private let isSDKInitialized: () -> Bool

    internal init(_ loggerProvider: @escaping () -> LoggerProtocol, _ isSDKInitialized: @escaping () -> Bool) {
        self.loggerProvider = loggerProvider
        self.isSDKInitialized = isSDKInitialized
    }

    @objc
    override public convenience init() {
        self.init({ Logger.create(with: Logger.Configuration(networkInfoEnabled: true, consoleLogFormat: .short)) }, { Datadog.isInitialized() })
    }

    @objc
    public func debug(message: String, context: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        if !self.isSDKInitialized() {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
            return
        }
        let attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        logger.debug(message, error: nil, attributes: attributes)
        resolve(nil)
    }

    @objc
    public func info(message: String, context: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        if !self.isSDKInitialized() {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
            return
        }
        let attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        logger.info(message, error: nil, attributes: attributes)
        resolve(nil)
    }

    @objc
    public func warn(message: String, context: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        if !self.isSDKInitialized() {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
            return
        }
        let attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        logger.warn(message, error: nil, attributes: attributes)
        resolve(nil)
    }

    @objc
    public func error(message: String, context: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        if !self.isSDKInitialized() {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
            return
        }
        let attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        logger.error(message, error: nil, attributes: attributes)
        resolve(nil)
    }

    @objc
    public func debugWithError(message: String, errorKind: String?, errorMessage: String?, stacktrace: String?, context: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        if !self.isSDKInitialized() {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
            return
        }
        let attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        logger._internal.log(level: .debug, message: message, errorKind: errorKind, errorMessage: errorMessage, stackTrace: stacktrace, attributes: attributes)
        resolve(nil)
    }

    @objc
    public func infoWithError(message: String, errorKind: String?, errorMessage: String?, stacktrace: String?, context: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        if !self.isSDKInitialized() {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
            return
        }
        let attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        logger._internal.log(level: .info, message: message, errorKind: errorKind, errorMessage: errorMessage, stackTrace: stacktrace, attributes: attributes)
        resolve(nil)
    }

    @objc
    public func warnWithError(message: String, errorKind: String?, errorMessage: String?, stacktrace: String?, context: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        if !self.isSDKInitialized() {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
            return
        }
        let attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        logger._internal.log(level: .warn, message: message, errorKind: errorKind, errorMessage: errorMessage, stackTrace: stacktrace, attributes: attributes)
        resolve(nil)
    }

    @objc
    public func errorWithError(message: String, errorKind: String?, errorMessage: String?, stacktrace: String?, context: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        if !self.isSDKInitialized() {
            reject(nil, Errors.logSentBeforeSDKInit, nil)
            return
        }
        let attributes = castAttributesToSwift(context).mergeWithGlobalAttributes()
        logger._internal.log(level: .error, message: message, errorKind: errorKind, errorMessage: errorMessage, stackTrace: stacktrace, attributes: attributes)
        resolve(nil)
    }
}
