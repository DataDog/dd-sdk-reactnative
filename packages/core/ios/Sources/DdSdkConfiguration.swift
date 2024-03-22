/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import DatadogCore
import DatadogInternal
import DatadogRUM

/**
 A configuration object to initialize Datadog's features.
 - Parameters:
     - clientToken: A valid Datadog client token.
     - env: The application’s environment, for example: prod, pre-prod, staging, etc.
     - applicationId: The RUM application ID.
     - nativeCrashReportEnabled: Whether the SDK should track native (pure iOS or pure Android) crashes (default is false).
     - nativeLongTaskThresholdMs: The threshold for native long tasks reporting in milliseconds.
     - longTaskThresholdMs: The threshold for javascript long tasks reporting in milliseconds.
     - sampleRate: The sample rate (between 0 and 100) of RUM sessions kept.
     - site: The Datadog site of your organization (can be 'US1', 'US1_FED', 'US3', 'US5', or 'EU1', default is 'US1').
     - trackingConsent: Consent, which can take one of the following values: 'pending', 'granted', 'not_granted'.
     - telemetrySampleRate: The sample rate (between 0 and 100) of telemetry events.
     - vitalsUpdateFrequency: The frequency at which to measure vitals performance metrics.
     - uploadFrequency: The frequency at which batches of data are sent.
     - batchSize: The preferred size of batched data uploaded to Datadog.
     - trackFrustrations: Whether to track frustration signals or not.
     - trackBackgroundEvents: Enables/Disables tracking RUM event when no RUM View is active. Might increase number of sessions and billing.
     - customEndpoints: Custom endpoints for RUM/Logs/Trace features.
     - additionalConfig: Additional configuration parameters.
     - configurationForTelemetry: Additional configuration paramters only used for telemetry purposes.
     - nativeViewTracking: Enables/Disables tracking RUM Views on the native level.
     - nativeInteractionTracking: Enables/Disables tracking RUM Actions on the native level.
     - verbosity: Verbosity level of the SDK.
     - proxyConfig: Configuration for proxying SDK data.
     - serviceName: Custom service name.
     - firstPartyHosts: List of backend hosts to enable tracing with.    
 */
@objc(DdSdkConfiguration)
public class DdSdkConfiguration: NSObject {
    public var clientToken: String = ""
    public var env: String = ""
    public var applicationId: String = ""
    public var nativeCrashReportEnabled: Bool? = nil
    public var nativeLongTaskThresholdMs: Double? = nil
    public var longTaskThresholdMs: Double = 0.0
    public var sampleRate: Double? = nil
    public var site: DatadogSite
    public var trackingConsent: TrackingConsent
    public var telemetrySampleRate: Double? = nil
    public var vitalsUpdateFrequency: RUM.Configuration.VitalsFrequency? = nil
    public var trackFrustrations: Bool? = nil
    public var uploadFrequency: Datadog.Configuration.UploadFrequency
    public var batchSize: Datadog.Configuration.BatchSize
    public var trackBackgroundEvents: Bool? = nil
    public var customEndpoints: CustomEndpoints? = nil
    public var additionalConfig: NSDictionary? = nil
    public var configurationForTelemetry: ConfigurationForTelemetry? = nil
    public var nativeViewTracking: Bool? = nil
    public var nativeInteractionTracking: Bool? = nil
    public var verbosity: NSString? = nil
    public var proxyConfig: [AnyHashable: Any]? = nil
    public var serviceName: NSString? = nil
    public var firstPartyHosts: [String: Set<TracingHeaderType>]? = nil
    public var resourceTracingSamplingRate: Double? = nil

    public init(
        clientToken: String,
        env: String,
        applicationId: String,
        nativeCrashReportEnabled: Bool?,
        nativeLongTaskThresholdMs: Double?,
        longTaskThresholdMs: Double,
        sampleRate: Double?,
        site: DatadogSite,
        trackingConsent: TrackingConsent,
        telemetrySampleRate: Double?,
        vitalsUpdateFrequency: RUM.Configuration.VitalsFrequency?,
        trackFrustrations: Bool?,
        uploadFrequency: Datadog.Configuration.UploadFrequency,
        batchSize: Datadog.Configuration.BatchSize,
        trackBackgroundEvents: Bool?,
        customEndpoints: CustomEndpoints?,
        additionalConfig: NSDictionary?,
        configurationForTelemetry: ConfigurationForTelemetry?,
        nativeViewTracking: Bool?,
        nativeInteractionTracking: Bool?,
        verbosity: NSString?,
        proxyConfig: [AnyHashable: Any]?,
        serviceName: NSString?,
        firstPartyHosts: [String: Set<TracingHeaderType>]?,
        resourceTracingSamplingRate: Double?
    ) {
        self.clientToken = clientToken
        self.env = env
        self.applicationId = applicationId
        self.nativeCrashReportEnabled = nativeCrashReportEnabled
        self.nativeLongTaskThresholdMs = nativeLongTaskThresholdMs
        self.longTaskThresholdMs = longTaskThresholdMs
        self.sampleRate = sampleRate
        self.site = site
        self.trackingConsent = trackingConsent
        self.telemetrySampleRate = telemetrySampleRate
        self.vitalsUpdateFrequency = vitalsUpdateFrequency
        self.trackFrustrations = trackFrustrations
        self.uploadFrequency = uploadFrequency
        self.batchSize = batchSize
        self.trackBackgroundEvents = trackBackgroundEvents
        self.customEndpoints = customEndpoints
        self.additionalConfig = additionalConfig
        self.configurationForTelemetry = configurationForTelemetry
        self.nativeViewTracking = nativeViewTracking
        self.nativeInteractionTracking = nativeInteractionTracking
        self.verbosity = verbosity
        self.proxyConfig = proxyConfig
        self.serviceName = serviceName
        self.firstPartyHosts = firstPartyHosts
        self.resourceTracingSamplingRate = resourceTracingSamplingRate
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

public class CustomEndpoints: NSObject {
    public var rum: NSString?
    public var logs: NSString?
    public var trace: NSString?
    
    public init(
        rum: NSString?,
        logs: NSString?,
        trace: NSString?
    ) {
        self.rum = rum
        self.logs = logs
        self.trace = trace
    }
}
