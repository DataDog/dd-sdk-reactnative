/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import DatadogCore
import DatadogInternal

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
     - additionalConfig: Additional configuration parameters.
     - configurationForTelemetry: Additional configuration paramters only used for telemetry purposes.
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
    public var trackingConsent: NSString? = nil
    public var telemetrySampleRate: Double? = nil
    public var vitalsUpdateFrequency: NSString? = nil
    public var trackFrustrations: Bool? = nil
    public var uploadFrequency: Datadog.Configuration.UploadFrequency
    public var batchSize: Datadog.Configuration.BatchSize
    public var trackBackgroundEvents: Bool? = nil
    public var additionalConfig: NSDictionary? = nil
    public var configurationForTelemetry: ConfigurationForTelemetry? = nil

    public init(
        clientToken: String,
        env: String,
        applicationId: String,
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
        batchSize: NSString?,
        trackBackgroundEvents: Bool?,
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
        self.site = DdSdkConfiguration.buildSite(site: site)
        self.trackingConsent = trackingConsent
        self.telemetrySampleRate = telemetrySampleRate
        self.vitalsUpdateFrequency = vitalsUpdateFrequency
        self.trackFrustrations = trackFrustrations
        self.uploadFrequency = DdSdkConfiguration.buildUploadFrequency(uploadFrequency: uploadFrequency)
        self.batchSize = DdSdkConfiguration.buildBatchSize(batchSize: batchSize)
        self.trackBackgroundEvents = trackBackgroundEvents
        self.additionalConfig = additionalConfig
        self.configurationForTelemetry = configurationForTelemetry
    }

    static func buildSite(site: NSString?) -> DatadogSite {
        switch site?.lowercased ?? "us" {
        case "us1", "us":
            return .us1
        case "eu1", "eu":
            return .eu1
        case "us3":
            return .us3
        case "us5":
            return .us5
        case "us1_fed", "gov":
            return .us1_fed
        case "ap1":
            return .ap1
        default:
            return .us1
        }
    }

    static func buildBatchSize(batchSize: NSString?) -> Datadog.Configuration.BatchSize {
        switch batchSize?.lowercased ?? "" {
        case "small":
            return .small
        case "medium":
            return .medium
        case "large":
            return .large
        default:
            return .medium
        }
    }

    static func buildUploadFrequency(uploadFrequency: NSString?) -> Datadog.Configuration.UploadFrequency {
        switch uploadFrequency?.lowercased ?? "" {
        case "rare":
            return .rare
        case "average":
            return .average
        case "frequent":
            return .frequent
        default:
            return .average
        }
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
