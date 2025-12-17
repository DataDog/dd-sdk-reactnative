/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import DatadogCore
import DatadogCrashReporting
import DatadogInternal
import DatadogLogs
import DatadogRUM
import DatadogTrace
import Foundation


#if os(iOS)
    import DatadogWebViewTracking
#endif

public typealias OnSdkInitializedListener = (DatadogCoreProtocol) -> Void

/// Wrapper around the Datadog SDK. Use DatadogSDKWrapper.shared to access the instance.
public class DatadogSDKWrapper {
    // Singleton
    public static var shared = DatadogSDKWrapper()

    // Initialization callbacks
    internal var onSdkInitializedListeners: [OnSdkInitializedListener] = []

    internal private(set) var loggerConfiguration = DatadogLogs.Logger.Configuration()

    private init() {}

    public func addOnSdkInitializedListener(listener: @escaping OnSdkInitializedListener) {
        onSdkInitializedListeners.append(listener)
    }

    // SDK Wrapper
    internal func initialize(
        coreConfiguration: Datadog.Configuration,
        loggerConfiguration: DatadogLogs.Logger.Configuration,
        trackingConsent: TrackingConsent
    ) {
        let core = Datadog.initialize(with: coreConfiguration, trackingConsent: trackingConsent)

        for listener in onSdkInitializedListeners {
            listener(core)
        }

        self.loggerConfiguration = loggerConfiguration
    }

    #if os(iOS)
        // Webview
        private var webviewMessageEmitter:
            InternalExtension<WebViewTracking>.AbstractMessageEmitter?

        internal func enableWebviewTracking() {
            webviewMessageEmitter = WebViewTracking._internal.messageEmitter(
                in: CoreRegistry.default)
        }

        internal func sendWebviewMessage(body: NSString) throws {
            try self.webviewMessageEmitter?.send(body: body)
        }
    #endif
}
