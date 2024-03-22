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
        additionalConfig = getMap("additionalConfig")?.toHashMap(),
        configurationForTelemetry = getMap(
            "configurationForTelemetry"
        )?.asConfigurationForTelemetry(),
        nativeViewTracking = getBoolean("nativeViewTracking"),
        nativeInteractionTracking = getBoolean("nativeInteractionTracking"),
        verbosity = getString("verbosity"),
        proxyConfig = getMap("proxyConfig")?.asProxyConfig(),
        serviceName = getString("serviceName"),
        firstPartyHosts = getArray("firstPartyHosts")?.asFirstPartyHosts()
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
    val firstPartyHosts = this.toArrayList() as List<ReadableMap>
    return firstPartyHosts.mapNotNull<ReadableMap, JSONFirstPartyHost> {
        val match = it.getString("match")
        val propagatorTypes = it.getArray("propagatorTypes")
        if (match != null && propagatorTypes != null) {
            JSONFirstPartyHost(match, propagatorTypes.toArrayList() as List<String>)
        } else null
    }.asFirstPartyHosts()
}

internal object DefaultConfiguration {
    const val nativeCrashReportEnabled = false
    const val sessionSamplingRate = 100.0
    const val site = "US1"
    const val longTaskThresholdMs = 0.0
    const val nativeLongTaskThresholdMs = 200.0
    const val nativeViewTracking = false
    const val nativeInteractionTracking = false
    const val trackingConsent = "GRANTED"
    const val telemetrySampleRate = 20.0
    const val vitalsUpdateFrequency = "AVERAGE"
    const val trackFrustrations = true
    const val uploadFrequency = "AVERAGE"
    const val batchSize = "MEDIUM"
    const val trackBackgroundEvents = false
}

@Suppress("ComplexMethod")
internal fun JSONDdSdkConfiguration.asDdSdkConfiguration(): DdSdkConfiguration {
    return DdSdkConfiguration(
        this.clientToken,
        this.env,
        this.applicationId,
        this.nativeCrashReportEnabled ?: DefaultConfiguration.nativeCrashReportEnabled,
        this.nativeLongTaskThresholdMs ?: DefaultConfiguration.nativeLongTaskThresholdMs,
        this.longTaskThresholdMs ?: DefaultConfiguration.longTaskThresholdMs,
        this.sessionSamplingRate ?: DefaultConfiguration.sessionSamplingRate,
        this.site ?: DefaultConfiguration.site,
        this.trackingConsent ?: DefaultConfiguration.trackingConsent,
        this.telemetrySampleRate ?: DefaultConfiguration.telemetrySampleRate,
        this.vitalsUpdateFrequency ?: DefaultConfiguration.vitalsUpdateFrequency,
        this.trackFrustrations ?: DefaultConfiguration.trackFrustrations,
        this.uploadFrequency ?: DefaultConfiguration.uploadFrequency,
        this.batchSize ?: DefaultConfiguration.batchSize,
        this.trackBackgroundEvents ?: DefaultConfiguration.trackBackgroundEvents,
        this.customEndpoints,
        mapOf(
            "_dd.source" to "react-native",
            "_dd.sdk_version" to SDK_VERSION
        ),
        null,
        this.nativeViewTracking ?: DefaultConfiguration.nativeViewTracking,
        this.nativeInteractionTracking ?: DefaultConfiguration.nativeInteractionTracking,
        this.verbosity,
        this.proxy?.asProxyConfig(),
        this.serviceName,
        this.firstPartyHosts?.asFirstPartyHosts()
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
    additionalConfig?.let { map.putMap("additionalConfig", it.toWritableMap()) }
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

private fun buildProxyConfig(type: String, address: String, port: Int, username: String?, password: String?): Pair<Proxy, ProxyAuthenticator?>? {
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
    }

    if (proxyType == null) {
        return null
    }

    val proxy = Proxy(proxyType, InetSocketAddress(address, port))

    val authenticator =
        if (username != null && password != null) {
            ProxyAuthenticator(username, password)
        } else {
            null
        }

    return Pair(proxy, authenticator)
}
