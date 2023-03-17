/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

/**
 * A configuration object to initialize Datadog's features.
 * @param clientToken A valid Datadog client token.
 * @param env The application’s environment, for example: prod, pre-prod, staging, etc.
 * @param applicationId The RUM application ID.
 * @param nativeCrashReportEnabled Whether the SDK should track native (pure iOS or pure Android) crashes (default is false).
 * @param nativeLongTaskThresholdMs The threshold for native long tasks reporting in milliseconds.
 * @param longTaskThresholdMs The threshold for javascript long tasks reporting in milliseconds.
 * @param sampleRate The sample rate (between 0 and 100) of RUM sessions kept.
 * @param site The Datadog site of your organization (can be 'US', 'EU' or 'GOV', default is 'US').
 * @param trackingConsent Consent, which can take one of the following values: 'pending', 'granted', 'not_granted'.
 * @param telemetrySampleRate The sample rate (between 0 and 100) of telemetry events.
 * @param vitalsUpdateFrequency The frequency to which vitals update are sent (can be 'NEVER', 'RARE', 'AVERAGE' (default), 'FREQUENT').
 * @param trackFrustrations Whether to track frustration signals or not.
 * @param additionalConfig Additional configuration parameters.
 * @param configurationForTelemetry Additional configuration data for Datadog telemetry.
 */
data class DdSdkConfiguration(
    val clientToken: String,
    val env: String,
    val applicationId: String? = null,
    val nativeCrashReportEnabled: Boolean? = null,
    val nativeLongTaskThresholdMs: Double? = null,
    val longTaskThresholdMs: Double? = null,
    val sampleRate: Double? = null,
    val site: String? = null,
    val trackingConsent: String? = null,
    val telemetrySampleRate: Double? = null,
    val vitalsUpdateFrequency: String? = null,
    val trackFrustrations: Boolean? = null,
    val additionalConfig: Map<String, Any?>? = null,
    val configurationForTelemetry: ConfigurationForTelemetry? = null
)

/**
 * Additional configuration data for Datadog telemetry.
 * @param initializationType Type of initialization used.
 * @param trackErrors Whether JS errors are tracked.
 * @param trackInteractions Whether interactions are tracked.
 * @param trackNetworkRequests Whether network requests are tracked.
 */
data class ConfigurationForTelemetry(
    val initializationType: String? = null,
    val trackErrors: Boolean? = null,
    val trackInteractions: Boolean? = null,
    val trackNetworkRequests: Boolean? = null
)
