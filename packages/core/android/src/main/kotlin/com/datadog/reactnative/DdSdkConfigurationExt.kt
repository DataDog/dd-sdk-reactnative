/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

@file:Suppress("TooManyFunctions")

package com.datadog.reactnative

import android.util.Log
import com.datadog.android.trace.TracingHeaderType
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap
import java.net.InetSocketAddress
import java.net.Proxy
import java.util.Locale

internal fun ReadableMap.asDdSdkConfiguration(): DdSdkConfiguration {
    return DdSdkConfiguration(
        clientToken = getString("clientToken").orEmpty(),
        env = getString("env").orEmpty(),
        applicationId = getString("applicationId").orEmpty(),
        nativeCrashReportEnabled = getBoolean("nativeCrashReportEnabled"),
        nativeLongTaskThresholdMs = getDouble("nativeLongTaskThresholdMs"),
        longTaskThresholdMs = getDouble("longTaskThresholdMs"),
        sampleRate = getDouble("sampleRate"),
        site = getString("site"),
        trackingConsent = getString("trackingConsent"),
        telemetrySampleRate = getDouble("telemetrySampleRate"),
        vitalsUpdateFrequency = getString("vitalsUpdateFrequency"),
        trackFrustrations = getBoolean("trackFrustrations"),
        uploadFrequency = getString("uploadFrequency"),
        batchSize = getString("batchSize"),
        trackBackgroundEvents = getBoolean("trackBackgroundEvents"),
        customEndpoints = getMap("customEndpoints")?.asCustomEndpoints(),
        additionalConfig = getMap("additionalConfiguration")?.toHashMap(),
        configurationForTelemetry = getMap(
            "configurationForTelemetry"
        )?.asConfigurationForTelemetry(),
        nativeViewTracking = getBoolean("nativeViewTracking"),
        nativeInteractionTracking = getBoolean("nativeInteractionTracking"),
        verbosity = getString("verbosity"),
        proxyConfig = getMap("proxyConfig")?.asProxyConfig(),
        serviceName = getString("serviceName"),
        firstPartyHosts = getArray("firstPartyHosts")?.asFirstPartyHosts(),
        bundleLogsWithRum = getBoolean("bundleLogsWithRum"),
        bundleLogsWithTraces = getBoolean("bundleLogsWithTraces"),
        trackNonFatalAnrs = getBooleanOrNull("trackNonFatalAnrs"),
        batchProcessingLevel = getString("batchProcessingLevel"),
        initialResourceThreshold = getDoubleOrNull("initialResourceThreshold")
    )
}

internal fun ReadableMap.asConfigurationForTelemetry(): ConfigurationForTelemetry {
    return ConfigurationForTelemetry(
        initializationType = getString("initializationType"),
        trackErrors = getBoolean("trackErrors"),
        trackInteractions = getBoolean("trackInteractions"),
        trackNetworkRequests = getBoolean("trackNetworkRequests"),
        reactVersion = getString("reactVersion"),
        reactNativeVersion = getString("reactNativeVersion"),
    )
}

internal fun ReadableMap.asCustomEndpoints(): CustomEndpoints {
    return CustomEndpoints(
        rum = getString("rum"),
        logs = getString("logs"),
        trace = getString("trace"),
    )
}

@Suppress("ComplexMethod")
internal fun ReadableMap.asProxyConfig(): Pair<Proxy, ProxyAuthenticator?>? {
    val address: String? = getString("address")

    // getInt expects the value to be non-null
    var port: Int? = null
    if (hasKey("port")) {
        port = getInt("port")
    }

    val type = getString("type")

    return if (address != null && port != null && type != null) {
        buildProxyConfig(
            type,
            address,
            port,
            getString("username"),
            getString("password")
        )
    } else {
        null
    }
}

internal fun ReadableArray.asFirstPartyHosts(): Map<String, Set<TracingHeaderType>> {
    return this.toList().mapNotNull {
        if (it == null) {
            null
        } else if (it !is Map<*, *>) {
            Log.e(
                javaClass.simpleName,
                "Ignoring $it (${it.javaClass.simpleName}) because it is not of type Map"
            )
            null
        } else {
            val match = it["match"] as? String

            @Suppress("UNCHECKED_CAST")
            val propagatorTypes = it["propagatorTypes"] as? List<String>

            if (match != null && propagatorTypes != null) {
                JSONFirstPartyHost(match, propagatorTypes)
            } else {
                null
            }
        }
    }.asFirstPartyHosts()
}

internal object DefaultConfiguration {
    const val NATIVE_CRASH_REPORT_ENABLED = false
    const val SESSION_SAMPLING_RATE = 100.0
    const val SITE = "US1"
    const val LONG_TASK_THRESHOLD_MS = 0.0
    const val NATIVE_LONG_TASK_THRESHOLD_MS = 200.0
    const val NATIVE_VIEW_TRACKING = false
    const val NATIVE_INTERACTION_TRACKING = false
    const val TRACKING_CONSENT = "GRANTED"
    const val TELEMETRY_SAMPLE_RATE = 20.0
    const val VITALS_UPDATE_FREQUENCY = "AVERAGE"
    const val TRACK_FRUSTRATIONS = true
    const val UPLOAD_FREQUENCY = "AVERAGE"
    const val BATCH_SIZE = "MEDIUM"
    const val TRACK_BACKGROUND_EVENTS = false
    const val BUNDLE_LOGS_WITH_RUM = true
    const val BUNDLE_LOGS_WITH_TRACES = true
    const val INITIAL_RESOURCE_THRESHOLD = 0.1
}

@Suppress("ComplexMethod")
internal fun JSONDdSdkConfiguration.asDdSdkConfiguration(): DdSdkConfiguration {
    return DdSdkConfiguration(
        this.clientToken,
        this.env,
        this.applicationId,
        this.nativeCrashReportEnabled ?: DefaultConfiguration.NATIVE_CRASH_REPORT_ENABLED,
        this.nativeLongTaskThresholdMs ?: DefaultConfiguration.NATIVE_LONG_TASK_THRESHOLD_MS,
        this.longTaskThresholdMs ?: DefaultConfiguration.LONG_TASK_THRESHOLD_MS,
        this.sessionSamplingRate ?: DefaultConfiguration.SESSION_SAMPLING_RATE,
        this.site ?: DefaultConfiguration.SITE,
        this.trackingConsent ?: DefaultConfiguration.TRACKING_CONSENT,
        this.telemetrySampleRate ?: DefaultConfiguration.TELEMETRY_SAMPLE_RATE,
        this.vitalsUpdateFrequency ?: DefaultConfiguration.VITALS_UPDATE_FREQUENCY,
        this.trackFrustrations ?: DefaultConfiguration.TRACK_FRUSTRATIONS,
        this.uploadFrequency ?: DefaultConfiguration.UPLOAD_FREQUENCY,
        this.batchSize ?: DefaultConfiguration.BATCH_SIZE,
        this.trackBackgroundEvents ?: DefaultConfiguration.TRACK_BACKGROUND_EVENTS,
        this.customEndpoints,
        mapOf(
            "_dd.source" to "react-native",
            "_dd.sdk_version" to SDK_VERSION
        ),
        null,
        this.nativeViewTracking ?: DefaultConfiguration.NATIVE_VIEW_TRACKING,
        this.nativeInteractionTracking ?: DefaultConfiguration.NATIVE_INTERACTION_TRACKING,
        this.verbosity,
        this.proxy?.asProxyConfig(),
        this.serviceName,
        this.firstPartyHosts?.asFirstPartyHosts(),
        this.bundleLogsWithRum ?: DefaultConfiguration.BUNDLE_LOGS_WITH_RUM,
        this.bundleLogsWithTraces ?: DefaultConfiguration.BUNDLE_LOGS_WITH_TRACES,
        this.trackNonFatalAnrs,
        this.batchProcessingLevel,
        this.initialResourceThreshold ?: DefaultConfiguration.INITIAL_RESOURCE_THRESHOLD
    )
}

internal fun JSONProxyConfiguration.asProxyConfig(): Pair<Proxy, ProxyAuthenticator?>? {
    return buildProxyConfig(type, address, port, username, password)
}

internal fun List<JSONFirstPartyHost>.asFirstPartyHosts(): Map<String, Set<TracingHeaderType>> {
    /**
     * Adapts the data format from the React Native SDK configuration to match with the Android
     * SDK configuration. For example:
     *
     * RN config: [{ match: "example.com", propagatorTypes: [DATADOG, B3] }] Android config: {
     * "example.com": [DATADOG, B3] }
     */
    val firstPartyHostsWithHeaderTypes = mutableMapOf<String, MutableSet<TracingHeaderType>>()

    for (host in this) {
        if (host.propagatorTypes.isNotEmpty()) {
            val hostMatch = firstPartyHostsWithHeaderTypes[host.match]
            if (hostMatch != null) {
                hostMatch.addAll(host.propagatorTypes.asTracingHeaderTypes())
            } else {
                firstPartyHostsWithHeaderTypes[host.match] = host.propagatorTypes.asTracingHeaderTypes().toMutableSet()
            }
        }
    }

    return firstPartyHostsWithHeaderTypes
}

internal fun List<String>.asTracingHeaderTypes(): Set<TracingHeaderType> {
    return this.mapNotNull {
        when (it.lowercase()) {
            "datadog" -> TracingHeaderType.DATADOG
            "b3" -> TracingHeaderType.B3
            "b3multi" -> TracingHeaderType.B3MULTI
            "tracecontext" -> TracingHeaderType.TRACECONTEXT
            else -> null
        }
    }.toSet()
}

@Suppress("ComplexMethod")
internal fun DdSdkConfiguration.toReadableMap(): ReadableMap {
    val map = WritableNativeMap()
    map.putString("clientToken", clientToken)
    map.putString("env", env)
    map.putString("applicationId", applicationId)
    nativeCrashReportEnabled?.let { map.putBoolean("nativeCrashReportEnabled", it) }
    nativeLongTaskThresholdMs?.let { map.putDouble("nativeLongTaskThresholdMs", it) }
    longTaskThresholdMs?.let { map.putDouble("longTaskThresholdMs", it) }
    sampleRate?.let { map.putDouble("sampleRate", it) }
    site?.let { map.putString("site", it) }
    trackingConsent?.let { map.putString("trackingConsent", it) }
    telemetrySampleRate?.let { map.putDouble("telemetrySampleRate", it) }
    vitalsUpdateFrequency?.let { map.putString("vitalsUpdateFrequency", it) }
    trackFrustrations?.let { map.putBoolean("trackFrustrations", it) }
    uploadFrequency?.let { map.putString("uploadFrequency", it) }
    batchSize?.let { map.putString("batchSize", it) }
    trackBackgroundEvents?.let { map.putBoolean("trackBackgroundEvents", it) }
    trackNonFatalAnrs?.let { map.putBoolean("trackNonFatalAnrs", it) }
    additionalConfig?.let { map.putMap("additionalConfig", it.toWritableMap()) }
    initialResourceThreshold?.let { map.putDouble("initialResourceThreshold", it)}
    return map
}

internal fun ConfigurationForTelemetry.toReadableMap(): ReadableMap {
    val map = WritableNativeMap()
    initializationType?.let { map.putString("initializationType", it) }
    trackErrors?.let { map.putBoolean("trackErrors", it) }
    trackInteractions?.let { map.putBoolean("trackInteractions", it) }
    trackNetworkRequests?.let { map.putBoolean("trackNetworkRequests", it) }
    reactVersion?.let { map.putString("reactVersion", it) }
    reactNativeVersion?.let { map.putString("reactNativeVersion", it) }
    return map
}

internal fun CustomEndpoints.toReadableMap(): ReadableMap {
    val map = WritableNativeMap()
    rum?.let { map.putString("rum", it) }
    logs?.let { map.putString("logs", it) }
    trace?.let { map.putString("trace", it) }
    return map
}

private fun buildProxyConfig(
    type: String,
    address: String,
    port: Int,
    username: String?,
    password: String?
): Pair<Proxy, ProxyAuthenticator?>? {
    val proxyType = when (type.lowercase(Locale.US)) {
        "http", "https" -> Proxy.Type.HTTP
        "socks" -> Proxy.Type.SOCKS
        else -> {
            Log.w(
                DdSdk::class.java.canonicalName,
                "Unknown proxy type given: $type, skipping proxy configuration."
            )
            null
        }
    } ?: return null

    val proxy = Proxy(proxyType, InetSocketAddress(address, port))

    val authenticator =
        if (username != null && password != null) {
            ProxyAuthenticator(username, password)
        } else {
            null
        }

    return Pair(proxy, authenticator)
}
