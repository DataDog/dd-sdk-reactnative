/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.trace.TracingHeaderType
import java.net.Proxy

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
 * @param uploadFrequency The frequency to which batches of data are sent (can be 'RARE', 'AVERAGE' (default), 'FREQUENT')
 * @param batchSize The preferred size for uploaded batches of data (can be 'SMALL', 'MEDIUM' (default), 'LARGE')
 * @param trackBackgroundEvents Enables/Disables tracking RUM event when no RUM View is active. Might increase number of sessions and billing.
 * @param customEndpoints Custom endpoints for RUM/Logs/Trace features.
 * @param additionalConfig Additional configuration parameters.
 * @param configurationForTelemetry Additional configuration data for Datadog telemetry.
 * @param nativeViewTracking Enables/Disables tracking RUM Views on the native level.
 * @param nativeInteractionTracking Enables/Disables tracking RUM Actions on the native level.
 * @param verbosity Verbosity level of the SDK.
 * @param proxyConfig Configuration for proxying SDK data.
 * @param serviceName Custom service name.
 * @param firstPartyHosts List of backend hosts to enable tracing with.
 * @param bundleLogsWithRum Enables RUM correlation with logs.
 * @param bundleLogsWithTraces Enables Traces correlation with logs.
 */
data class DdSdkConfiguration(
    val clientToken: String,
    val env: String,
    val applicationId: String,
    val nativeCrashReportEnabled: Boolean? = null,
    val nativeLongTaskThresholdMs: Double? = null,
    val longTaskThresholdMs: Double? = null,
    val sampleRate: Double? = null,
    val site: String? = null,
    val trackingConsent: String? = null,
    val telemetrySampleRate: Double? = null,
    val vitalsUpdateFrequency: String? = null,
    val trackFrustrations: Boolean? = null,
    val uploadFrequency: String? = null,
    val batchSize: String? = null,
    val trackBackgroundEvents: Boolean? = null,
    val customEndpoints: CustomEndpoints? = null,
    val additionalConfig: Map<String, Any?>? = null,
    val configurationForTelemetry: ConfigurationForTelemetry? = null,
    val nativeViewTracking: Boolean? = null,
    val nativeInteractionTracking: Boolean? = null,
    val verbosity: String? = null,
    val proxyConfig: Pair<Proxy, ProxyAuthenticator?>? = null,
    val serviceName: String? = null,
    val firstPartyHosts: Map<String, Set<TracingHeaderType>>? = null,
    val bundleLogsWithRum: Boolean? = null,
    val bundleLogsWithTraces: Boolean? = null
)

internal data class JSONConfigurationFile(
    val configuration: JSONDdSdkConfiguration
)

internal data class JSONDdSdkConfiguration(
    val clientToken: String,
    val env: String,
    val applicationId: String,
    val nativeCrashReportEnabled: Boolean? = null,
    val nativeLongTaskThresholdMs: Double? = null,
    val longTaskThresholdMs: Double? = null,
    val sessionSamplingRate: Double? = null,
    val site: String? = null,
    val trackingConsent: String? = null,
    val telemetrySampleRate: Double? = null,
    val vitalsUpdateFrequency: String? = null,
    val trackFrustrations: Boolean? = null,
    val uploadFrequency: String? = null,
    val batchSize: String? = null,
    val trackBackgroundEvents: Boolean? = null,
    val customEndpoints: CustomEndpoints? = null,
    val nativeViewTracking: Boolean? = null,
    val nativeInteractionTracking: Boolean? = null,
    val verbosity: String? = null,
    val proxy: JSONProxyConfiguration? = null,
    val serviceName: String? = null,
    val firstPartyHosts: List<JSONFirstPartyHost>? = null,
    val bundleLogsWithRum: Boolean? = null,
    val bundleLogsWithTraces: Boolean? = null
)

internal data class JSONProxyConfiguration(
    val type: String,
    val address: String,
    val port: Int,
    val username: String? = null,
    val password: String? = null
)

internal data class JSONFirstPartyHost(
    val match: String,
    val propagatorTypes: List<String>
)

/**
 * Additional configuration data for Datadog telemetry.
 * @param initializationType Type of initialization used.
 * @param trackErrors Whether JS errors are tracked.
 * @param trackInteractions Whether interactions are tracked.
 * @param trackNetworkRequests Whether network requests are tracked.
 * @param reactVersion Version of react used in app.
 * @param reactNativeVersion Version of react-native used in app.
 */
data class ConfigurationForTelemetry(
    val initializationType: String? = null,
    val trackErrors: Boolean? = null,
    val trackInteractions: Boolean? = null,
    val trackNetworkRequests: Boolean? = null,
    val reactVersion: String? = null,
    val reactNativeVersion: String? = null
)

/**
 * Custom endpoints for features.
 * @param rum Custom endpoint for RUM.
 * @param logs Custom endpoint for Logs.
 * @param trace Custom endpoint for Trace.
 */
data class CustomEndpoints(
    val rum: String? = null,
    val logs: String? = null,
    val trace: String? = null
)
