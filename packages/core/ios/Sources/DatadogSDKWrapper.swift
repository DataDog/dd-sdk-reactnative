/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */


import DatadogCore
import DatadogRUM
import DatadogLogs
import DatadogTrace
import DatadogCrashReporting
import DatadogWebViewTracking
import DatadogInternal
import Foundation

public typealias OnCoreInitializedListener = (DatadogCoreProtocol) -> Void

/// Wrapper around the Datadog SDK. Use DatadogSDKWrapper.shared to access the instance.
public class DatadogSDKWrapper {
    // Singleton
    public static var shared = DatadogSDKWrapper()

    // Initialization callbacks
    internal var onCoreInitializedListeners: [OnCoreInitializedListener] = []
    internal var loggerConfiguration = DatadogLogs.Logger.Configuration()
    // Core instance
    private var coreInstance: DatadogCoreProtocol? = nil

    private init() { }

    public func addOnCoreInitializedListener(listener:@escaping OnCoreInitializedListener) {
        onCoreInitializedListeners.append(listener)
    }

    /// This is intended for internal testing only.
    public func setCoreInstance(core: DatadogCoreProtocol?) {
        self.coreInstance = core
    }

    /// This is not supposed to be used in the SDK itself, rather by other SDKs like Session Replay. 
    public func getCoreInstance() -> DatadogCoreProtocol? {
        return coreInstance
    }

    // SDK Wrapper
    internal func initialize(
        coreConfiguration: Datadog.Configuration,
        loggerConfiguration: DatadogLogs.Logger.Configuration,
        trackingConsent: TrackingConsent
    ) -> Void {
        let core = Datadog.initialize(with: coreConfiguration, trackingConsent: trackingConsent)
        setCoreInstance(core: core)
        for listener in onCoreInitializedListeners {
            listener(core)
        }

        self.loggerConfiguration = loggerConfiguration
    }

    internal func isInitialized() -> Bool {
        return Datadog.isInitialized()
    }

    internal func clearAllData() -> Void {
        if let core = coreInstance {
            Datadog.clearAllData(in: core)
        } else {
            Datadog.clearAllData()
        }
    }

    // Features
    internal func enableRUM(with configuration: RUM.Configuration) {
        if let core = coreInstance {
            RUM.enable(with: configuration, in: core)
        } else {
            consolePrint("Core instance was not found when initializing RUM.", .critical)
        }
    }

    internal func enableLogs(with configuration: Logs.Configuration) {
        if let core = coreInstance {
            Logs.enable(with: configuration, in: core)
        } else {
            consolePrint("Core instance was not found when initializing Logs.", .critical)
        }
    }

    internal func enableTrace(with configuration: Trace.Configuration) {
        if let core = coreInstance {
            Trace.enable(with: configuration, in: core)
        } else {
            consolePrint("Core instance was not found when initializing Trace.", .critical)
        }
    }

    internal func enableCrashReporting() {
        if let core = coreInstance {
            CrashReporting.enable(in: core)
        } else {
            consolePrint("Core instance was not found when initializing CrashReporting.", .critical)
        }
    }

    internal func createLogger() -> LoggerProtocol {
        let core = coreInstance ?? {
            consolePrint("Core instance was not found when creating Logger.", .critical)
            return CoreRegistry.default
        }()

        return DatadogLogs.Logger.create(with: loggerConfiguration, in: core)
    }

    // Telemetry
    internal func telemetryDebug(id: String, message: String) {
        return Datadog._internal.telemetry.debug(id: id, message: message)
    }

    internal func telemetryError(id: String, message: String, kind: String?, stack: String?) {
        return Datadog._internal.telemetry.error(id: id, message: message, kind: kind, stack: stack)
    }

    internal func overrideTelemetryConfiguration(
        initializationType: String? = nil,
        reactNativeVersion: String? = nil,
        reactVersion: String? = nil,
        trackCrossPlatformLongTasks: Bool? = nil,
        trackErrors: Bool? = nil,
        trackInteractions: Bool? = nil,
        trackLongTask: Bool? = nil,
        trackNativeErrors: Bool? = nil,
        trackNativeLongTasks: Bool? = nil,
        trackNetworkRequests: Bool? = nil
    ) {
        coreInstance?.telemetry.configuration(
            initializationType: initializationType,
            reactNativeVersion: reactNativeVersion,
            reactVersion: reactVersion,
            trackCrossPlatformLongTasks: trackCrossPlatformLongTasks,
            trackErrors: trackErrors,
            trackLongTask: trackLongTask, 
            trackNativeErrors: trackNativeErrors,
            trackNativeLongTasks: trackNativeLongTasks,
            trackNetworkRequests: trackNetworkRequests,
            trackUserInteractions: trackInteractions
        )
    }

    // Webview
    private var webviewMessageEmitter: InternalExtension<WebViewTracking>.AbstractMessageEmitter?

    internal func enableWebviewTracking() {
        if let core = coreInstance {
            webviewMessageEmitter = WebViewTracking._internal.messageEmitter(in: core)
        } else {
            consolePrint("Core instance was not found when initializing Webview tracking.", .critical)
        }
    }
    
    internal func sendWebviewMessage(body: NSString) throws {
        try self.webviewMessageEmitter?.send(body: body)
    }
}


