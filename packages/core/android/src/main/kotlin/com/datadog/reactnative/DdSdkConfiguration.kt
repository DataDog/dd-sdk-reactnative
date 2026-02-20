/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.core.configuration.BatchProcessingLevel
import com.datadog.android.trace.TracingHeaderType
import java.net.Proxy

/**
 * A configuration object used to initialize Datadog's core SDK and its feature modules.
 *
 * @param additionalConfiguration Additional configuration parameters forwarded to the native Datadog SDK.
 * @param clientToken A valid Datadog client token.
 * @param env The application’s environment, for example: prod, pre-prod, staging, etc.
 * @param site The Datadog site of your organization (can be 'US', 'EU' or 'GOV', default is 'US').
 * @param service Custom service name.
 * @param verbosity Verbosity level of the SDK’s internal logging.
 * @param trackingConsent Consent, which can take one of the following values: 'pending', 'granted', 'not_granted'.
 * @param uploadFrequency The frequency to which batches of data are sent (can be 'RARE', 'AVERAGE' (default), 'FREQUENT')
 * @param batchSize The preferred size for uploaded batches of data (can be 'SMALL', 'MEDIUM' (default), 'LARGE')
 * @param batchProcessingLevel The preferred number of batches of data that will be sent in a single upload (can be 'LOW', 'MEDIUM' (default), 'HIGH')
 * @param proxyConfiguration Configuration for proxying SDK data.
 * @param rumConfiguration Configuration for the RUM feature module, including RUM application ID and RUM-specific options.
 * @param logsConfiguration Configuration for the Logs feature module.
 * @param traceConfiguration Configuration for the Traces (APM) feature module.
 * @param configurationForTelemetry Additional configuration data for Datadog telemetry.
 */
data class DdSdkConfiguration(
    val additionalConfiguration: Map<String, Any?>? = null,
    val clientToken: String,
    val env: String,
    val site: String? = null,
    val service: String? = null,
    val verbosity: String? = null,
    val trackingConsent: String? = null,
    val uploadFrequency: String? = null,
    val batchSize: String? = null,
    val batchProcessingLevel: String? = null,
    val proxyConfiguration: Pair<Proxy, ProxyAuthenticator?>? = null,
    val rumConfiguration: RumConfiguration? = null,
    val logsConfiguration: LogsConfiguration? = null,
    val traceConfiguration: TraceConfiguration? = null,
    val configurationForTelemetry: ConfigurationForTelemetry? = null
)

/**
 * A configuration object for the Datadog RUM feature.
 *
 * @param applicationId The RUM application ID.
 * @param trackFrustrations Whether to track frustration signals or not.
 * @param longTaskThresholdMs The threshold for javascript long tasks reporting in milliseconds.
 * @param sessionSampleRate The sample rate (between 0 and 100) of RUM sessions kept.
 * @param resourceTraceSampleRate Percentage (0–100) of tracing integrations for network calls between your app and your backend.
 * @param vitalsUpdateFrequency The frequency to which vitals update are sent (can be 'NEVER', 'RARE', 'AVERAGE' (default), 'FREQUENT').
 * @param trackBackgroundEvents Enables/Disables tracking RUM event when no RUM View is active. Might increase number of sessions and billing.
 * @param nativeCrashReportEnabled Whether the SDK should track native Android crashes (default is false).
 * @param nativeLongTaskThresholdMs The threshold for native long tasks reporting in milliseconds.
 * @param nativeViewTracking Enables/Disables tracking RUM Views on the native level.
 * @param nativeInteractionTracking Enables/Disables tracking RUM Actions on the native level.
 * @param firstPartyHosts List of backend hosts to enable tracing with.
 * @param trackNonFatalAnrs Enables tracking of non-fatal ANRs on Android.
 * @param initialResourceThreshold The amount of time after a view starts where a Resource should be considered when calculating Time to Network-Settled (TNS).
 * @param telemetrySampleRate The sample rate (between 0 and 100) of telemetry events.
 * @param customEndpoint Custom RUM intake endpoint used to override the default Datadog intake.
 */
data class RumConfiguration(
    val applicationId: String,
    val trackFrustrations: Boolean? = null,
    val longTaskThresholdMs: Double? = null,
    val sessionSampleRate: Double? = null,
    val resourceTraceSampleRate: Double? = null,
    val vitalsUpdateFrequency: String? = null,
    val trackBackgroundEvents: Boolean? = null,
    val nativeCrashReportEnabled: Boolean? = null,
    val nativeLongTaskThresholdMs: Double? = null,
    val nativeViewTracking: Boolean? = null,
    val nativeInteractionTracking: Boolean? = null,
    val firstPartyHosts: Map<String, Set<TracingHeaderType>>? = null,
    val trackNonFatalAnrs: Boolean? = null,
    val initialResourceThreshold: Double? = null,
    val telemetrySampleRate: Double? = null,
    val customEndpoint: String? = null
)

/**
 * A configuration object for Datadog Logs features.
 *
 * @param bundleLogsWithRum Enables RUM correlation with logs.
 * @param bundleLogsWithTraces Enables Traces correlation with logs.
 * @param customEndpoint Custom Logs intake endpoint used to override the default Datadog intake.
 */
data class LogsConfiguration(
    val bundleLogsWithRum: Boolean,
    val bundleLogsWithTraces: Boolean,
    val customEndpoint: String? = null
)

/**
 * A configuration object for Datadog Traces (APM) features.
 *
 * @param customEndpoint Custom Trace intake endpoint used to override the default Datadog intake.
 */
data class TraceConfiguration(
    val customEndpoint: String? = null
)


internal data class JSONConfigurationFile(
    val configuration: JSONDdSdkConfiguration
)

internal data class JSONDdSdkConfiguration(
    val clientToken: String,
    val env: String,
    val trackingConsent: String? = null,
    val additionalConfiguration: Map<String, Any?>? = null,
    val batchSize: String? = null,
    val batchProcessingLevel: String? = null,
    val proxyConfiguration: JSONProxyConfiguration? = null,
    val service: String? = null,
    val uploadFrequency: String? = null,
    val verbosity: String? = null,
    val version: String? = null,
    val versionSuffix: String? = null,
    val site: String? = null,
    val rumConfiguration: JSONRumConfiguration? = null,
    val logsConfiguration: JSONLogsConfiguration? = null,
    val traceConfiguration: JSONTraceConfiguration? = null
)

internal data class JSONRumConfiguration(
    val applicationId: String? = null,
    val useAccessibilityLabel: Boolean? = null,
    val trackInteractions: Boolean? = null,
    val trackResources: Boolean? = null,
    val trackErrors: Boolean? = null,
    val actionNameAttribute: String? = null,
    val firstPartyHosts: List<JSONFirstPartyHost>? = null,
    val appHangThreshold: Double? = null,
    val initialResourceThreshold: Double? = null,

    // schema: integer | boolean, we only support numeric in JSON file
    val longTaskThresholdMs: Double? = null,
    val nativeCrashReportEnabled: Boolean? = null,
    val nativeLongTaskThresholdMs: Double? = null, // we treat only numeric in JSON
    val nativeViewTracking: Boolean? = null,
    val nativeInteractionTracking: Boolean? = null,
    val sessionSampleRate: Double? = null,
    val resourceTraceSampleRate: Double? = null,
    val trackBackgroundEvents: Boolean? = null,
    val trackFrustrations: Boolean? = null,
    val trackNonFatalAnrs: Boolean? = null,
    val trackWatchdogTerminations: Boolean? = null,
    val vitalsUpdateFrequency: String? = null,
    val trackMemoryWarnings: Boolean? = null,
    val telemetrySampleRate: Double? = null,
    val customEndpoint: String? = null
)

internal data class JSONLogsConfiguration(
    val bundleLogsWithRum: Boolean? = null,
    val bundleLogsWithTraces: Boolean? = null,
    val customEndpoint: String? = null
)

internal data class JSONTraceConfiguration(
    val customEndpoint: String? = null
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
