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
import DatadogInternal
import Foundation

public typealias OnSdkInitializedListener = () -> Void

/// Wrapper around the Datadog SDK. Use DatadogSDKWrapper.shared to access the instance.
public class DatadogSDKWrapper {
    // Singleton
    public static var shared = DatadogSDKWrapper()

    // Initialization callbacks
    internal var onSdkInitializedListeners: [OnSdkInitializedListener] = []

    internal private(set) var loggerConfiguration = DatadogLogs.Logger.Configuration()

    private init() { }

    public func addOnSdkInitializedListener(listener:@escaping OnSdkInitializedListener) {
        onSdkInitializedListeners.append(listener)
    }

    // SDK Wrapper
    internal func initialize(
        coreConfiguration: Datadog.Configuration,
        loggerConfiguration: DatadogLogs.Logger.Configuration,
        trackingConsent: TrackingConsent
    ) -> Void {
        Datadog.initialize(with: coreConfiguration, trackingConsent: trackingConsent)

        for listener in onSdkInitializedListeners {
            listener()
        }

        self.loggerConfiguration = loggerConfiguration
    }
}


