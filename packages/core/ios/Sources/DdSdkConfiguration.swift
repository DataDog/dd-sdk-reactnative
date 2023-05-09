/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation

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
     - trackFrustrations: Whether to track frustration signals or not.
     - additionalConfig: Additional configuration parameters.
     - configurationForTelemetry: Additional configuration paramters only used for telemetry purposes.
 */
@objc(DdSdkConfiguration)
public class DdSdkConfiguration: NSObject {
    public var clientToken: String = ""
    public var env: String = ""
    public var applicationId: String? = nil
    public var nativeCrashReportEnabled: Bool? = nil
    public var nativeLongTaskThresholdMs: Double? = nil
    public var longTaskThresholdMs: Double = 0.0
    public var sampleRate: Double? = nil
    public var site: NSString? = nil
    public var trackingConsent: NSString? = nil
    public var telemetrySampleRate: Double? = nil
    public var vitalsUpdateFrequency: NSString? = nil
    public var trackFrustrations: Bool? = nil
    public var uploadFrequency: NSString? = nil
    public var additionalConfig: NSDictionary? = nil
    public var configurationForTelemetry: ConfigurationForTelemetry? = nil

    public init(
        clientToken: String,
        env: String,
        applicationId: String?,
        nativeCrashReportEnabled: Bool?,
        nativeLongTaskThresholdMs: Double?,
        longTaskThresholdMs: Double,
        sampleRate: Double?,
        site: NSString?,
        trackingConsent: NSString?,
        telemetrySampleRate: Double?,
        vitalsUpdateFrequency: NSString?,
        trackFrustrations: Bool?,
        uploadFrequency: NSString?,
        additionalConfig: NSDictionary?,
        configurationForTelemetry: ConfigurationForTelemetry?
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
        self.additionalConfig = additionalConfig
        self.configurationForTelemetry = configurationForTelemetry
    }
}

public class ConfigurationForTelemetry: NSObject {
    public var initializationType: NSString?
    public var trackErrors: Bool?
    public var trackInteractions: Bool?
    public var trackNetworkRequests: Bool?
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
