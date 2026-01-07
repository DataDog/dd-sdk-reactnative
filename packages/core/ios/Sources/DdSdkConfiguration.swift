/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import DatadogCore
import DatadogInternal
import DatadogRUM
import Foundation

/// A configuration object used to initialize Datadog's core SDK and its feature modules.
/// - Parameters:
///    - additionalConfiguration: Additional configuration parameters forwarded directly
///      to the native Datadog SDKs.
///    - clientToken: A valid Datadog client token.
///    - env: The application’s environment (e.g., "prod", "pre-prod", "staging").
///    - site: The Datadog site of your organization (e.g., `US1`, `US1_FED`, `US3`, `US5`, `EU1`).
///    - service: The custom service name reported for logs, traces, and RUM.
///    - verbosity: Verbosity level of the SDK’s internal logging (`DEBUG`, `INFO`, `WARN`, `ERROR`).
///    - nativeCrashReportEnabled: Whether the SDK should track native (iOS / Android) crashes.
///      Default is `false`.
///    - nativeLongTaskThresholdMs: The threshold for reporting native long tasks in milliseconds.
///    - trackingConsent: User tracking consent (`pending`, `granted`, `not_granted`).
///    - uploadFrequency: The frequency at which batches of data are uploaded.
///    - batchSize: The preferred size of batches sent to Datadog.
///    - batchProcessingLevel: Maximum number of batches processed sequentially before applying a delay.
///    - proxyConfiguration: Configuration for proxying SDK data (proxy type, address, port, etc.).
///    - firstPartyHosts: List of backend hosts considered first-party for network tracing.
///    - rumConfiguration: Configuration for the RUM feature module.
///    - logsConfiguration: Configuration for the Logs feature module.
///    - traceConfiguration: Configuration for the Traces feature module.
///    - configurationForTelemetry: Additional configuration parameters used only for internal telemetry.
@objc(DdSdkConfiguration)
public class DdSdkConfiguration: NSObject {
    public var additionalConfiguration: NSDictionary? = nil
    public var clientToken: String = ""
    public var env: String = ""
    public var site: DatadogSite
    public var service: NSString? = nil
    public var verbosity: NSString? = nil
    public var nativeCrashReportEnabled: Bool? = nil
    public var nativeLongTaskThresholdMs: Double? = nil
    public var trackingConsent: TrackingConsent
    public var uploadFrequency: Datadog.Configuration.UploadFrequency
    public var batchSize: Datadog.Configuration.BatchSize
    public var batchProcessingLevel: Datadog.Configuration.BatchProcessingLevel
    public var proxyConfiguration: [AnyHashable: Any]? = nil
    public var firstPartyHosts: [String: Set<TracingHeaderType>]? = nil
    public var rumConfiguration: RumConfiguration? = nil
    public var logsConfiguration: LogsConfiguration? = nil
    public var traceConfiguration: TraceConfiguration? = nil
    public var configurationForTelemetry: ConfigurationForTelemetry? = nil

    public init(
        additionalConfiguration: NSDictionary?,
        clientToken: String,
        env: String,
        site: DatadogSite,
        service: NSString?,
        verbosity: NSString? = nil,
        nativeCrashReportEnabled: Bool? = nil,
        nativeLongTaskThresholdMs: Double? = nil,
        trackingConsent: TrackingConsent,
        uploadFrequency: Datadog.Configuration.UploadFrequency,
        batchSize: Datadog.Configuration.BatchSize,
        batchProcessingLevel: Datadog.Configuration.BatchProcessingLevel,
        proxyConfiguration: [AnyHashable: Any]?,
        firstPartyHosts: [String: Set<TracingHeaderType>]?,
        rumConfiguration: RumConfiguration?,
        logsConfiguration: LogsConfiguration?,
        traceConfiguration: TraceConfiguration?,
        configurationForTelemetry: ConfigurationForTelemetry?
    ) {
        self.additionalConfiguration = additionalConfiguration
        self.clientToken = clientToken
        self.env = env
        self.site = site
        self.service = service
        self.verbosity = verbosity
        self.nativeCrashReportEnabled = nativeCrashReportEnabled
        self.nativeLongTaskThresholdMs = nativeLongTaskThresholdMs
        self.trackingConsent = trackingConsent
        self.uploadFrequency = uploadFrequency
        self.batchSize = batchSize
        self.batchProcessingLevel = batchProcessingLevel
        self.proxyConfiguration = proxyConfiguration
        self.firstPartyHosts = firstPartyHosts
        self.rumConfiguration = rumConfiguration
        self.logsConfiguration = logsConfiguration
        self.traceConfiguration = traceConfiguration
        self.configurationForTelemetry = configurationForTelemetry
    }
}

/// A configuration object for the Datadog RUM feature.
///
/// - Parameters:
///    - applicationId: The RUM Application ID.
///    - trackFrustrations: Whether to track user frustration signals (e.g. rage taps).
///    - longTaskThresholdMs: The threshold for reporting long JavaScript tasks, in milliseconds.
///    - sessionSampleRate: Percentage (0–100) of sampled RUM sessions.
///    - vitalsUpdateFrequency: Frequency at which the SDK collects mobile vitals metrics.
///    - trackBackgroundEvents: Enables/disables tracking RUM events when no RUM View is active.
///      May increase the number of sessions and billing.
///    - nativeViewTracking: Enables tracking of native iOS/Android UI views.
///    - nativeInteractionTracking: Enables tracking of native UI interactions.
///    - appHangThreshold: Threshold in seconds for reporting non-fatal app hangs (iOS only).
///    - trackWatchdogTerminations: Whether the SDK should track application terminations
///      caused by the iOS watchdog.
///    - initialResourceThreshold: The amount of time after a view starts where a Resource should be considered when calculating Time to Network-Settled (TNS).
///    - trackMemoryWarnings: Whether memory warning events should be tracked.
///    - telemetrySampleRate: Sampling rate (0–100) for internal telemetry emitted via RUM.
///    - customEndpoint: A custom RUM  intake endpoint to override the default Datadog intake.
public class RumConfiguration: NSObject {
    public var applicationId: String = ""
    public var trackFrustrations: Bool? = true
    public var longTaskThresholdMs: Double = 0.0
    public var sessionSampleRate: Double? = nil
    public var vitalsUpdateFrequency: RUM.Configuration.VitalsFrequency? = nil
    public var trackBackgroundEvents: Bool? = nil
    public var nativeViewTracking: Bool? = nil
    public var nativeInteractionTracking: Bool? = nil
    public var appHangThreshold: Double? = nil
    public var trackWatchdogTerminations: Bool
    public var initialResourceThreshold: Double? = nil
    public var trackMemoryWarnings: Bool? = nil
    public var telemetrySampleRate: Double? = nil
    public var customEndpoint: String? = nil

    init(
        applicationId: String,
        trackFrustrations: Bool?,
        longTaskThresholdMs: Double,
        sessionSampleRate: Double?,
        vitalsUpdateFrequency: RUM.Configuration.VitalsFrequency?,
        trackBackgroundEvents: Bool?,
        nativeViewTracking: Bool?,
        nativeInteractionTracking: Bool?,
        appHangThreshold: Double?,
        trackWatchdogTerminations: Bool,
        initialResourceThreshold: Double?,
        trackMemoryWarnings: Bool?,
        telemetrySampleRate: Double?,
        customEndpoint: String?
    ) {
        self.applicationId = applicationId
        self.trackFrustrations = trackFrustrations
        self.longTaskThresholdMs = longTaskThresholdMs
        self.sessionSampleRate = sessionSampleRate
        self.vitalsUpdateFrequency = vitalsUpdateFrequency
        self.trackBackgroundEvents = trackBackgroundEvents
        self.nativeViewTracking = nativeViewTracking
        self.nativeInteractionTracking = nativeInteractionTracking
        self.appHangThreshold = appHangThreshold
        self.trackWatchdogTerminations = trackWatchdogTerminations
        self.initialResourceThreshold = initialResourceThreshold
        self.trackMemoryWarnings = trackMemoryWarnings
        self.telemetrySampleRate = telemetrySampleRate
        self.customEndpoint = customEndpoint
    }

}

/// A configuration object for Datadog Logs features.
///
/// - Parameters:
///    - bundleLogsWithRum: Enables correlation between logs and RUM events.
///    - bundleLogsWithTraces: Enables correlation between logs and tracing spans.
///    - customEndpoint: A custom logs intake endpoint to override the default Datadog intake.
public class LogsConfiguration: NSObject {
    public var bundleLogsWithRum: Bool
    public var bundleLogsWithTraces: Bool
    public var customEndpoint: String? = nil

    init(
        bundleLogsWithRum: Bool,
        bundleLogsWithTraces: Bool,
        customEndpoint: String?
    ) {
        self.bundleLogsWithRum = bundleLogsWithRum
        self.bundleLogsWithTraces = bundleLogsWithTraces
        self.customEndpoint = customEndpoint
    }
}

/// A configuration object for Datadog Tracing (APM) features.
///
/// - Parameters:
///    - resourceTracingSamplingRate: Percentage (0–100) of network resource traces to sample.
///    - customEndpoint: A custom Trace intake endpoint to override the default Datadog intake.
public class TraceConfiguration: NSObject {
    public var resourceTraceSampleRate: Double? = nil
    public var customEndpoint: String? = nil

    init(
        resourceTraceSampleRate: Double?,
        customEndpoint: String?
    ) {
        self.resourceTraceSampleRate = resourceTraceSampleRate
        self.customEndpoint = customEndpoint
    }
}

public class ConfigurationForTelemetry: NSObject {
    public var initializationType: NSString?
    public var trackErrors: Bool?
    public var trackInteractions: Bool?
    public let trackNetworkRequests: Bool?
    public var reactVersion: NSString?
    public var reactNativeVersion: NSString?

    public init(
        initializationType: NSString?,
        trackErrors: Bool?,
        trackInteractions: Bool?,
        trackNetworkRequests: Bool?,
        reactVersion: NSString?,
        reactNativeVersion: NSString?
    ) {
        self.initializationType = initializationType
        self.trackErrors = trackErrors
        self.trackInteractions = trackInteractions
        self.trackNetworkRequests = trackNetworkRequests
        self.reactVersion = reactVersion
        self.reactNativeVersion = reactNativeVersion
    }
}
