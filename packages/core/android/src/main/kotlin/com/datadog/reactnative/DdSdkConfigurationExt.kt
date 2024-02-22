/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

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

    val type =
        getString("type")?.let {
            when (it.lowercase(Locale.US)) {
                "http", "https" -> Proxy.Type.HTTP
                "socks" -> Proxy.Type.SOCKS
                else -> {
                    Log.w(
                        DdSdk::class.java.canonicalName,
                        "Unknown proxy type given: $it, skipping proxy configuration."
                    )
                    null
                }
            }
        }

    val proxy =
        if (address != null && port != null && type != null) {
            Proxy(type, InetSocketAddress(address, port))
        } else {
            return null
        }

    val username = getString("username")
    val password = getString("password")

    val authenticator =
        if (username != null && password != null) {
            ProxyAuthenticator(username, password)
        } else {
            null
        }

    return Pair(proxy, authenticator)
}

internal fun ReadableArray.asFirstPartyHosts(): Map<String, Set<TracingHeaderType>> {
    /**
     * Adapts the data format from the React Native SDK configuration to match with the Android
     * SDK configuration. For example:
     *
     * RN config: [{ match: "example.com", propagatorTypes: [DATADOG, B3] }] Android config: {
     * "example.com": [DATADOG, B3] }
     */
    val firstPartyHostsWithHeaderTypes = mutableMapOf<String, MutableSet<TracingHeaderType>>()

    val firstPartyHosts = this.toArrayList() as List<ReadableMap>
    for (it in firstPartyHosts) {
        val match = it.getString("match")
        val propagatorTypes = it.getArray("propagatorTypes")?.asTracingHeaderTypes()
        if (match != null && propagatorTypes != null && propagatorTypes.isNotEmpty()) {
            val hostMatch = firstPartyHostsWithHeaderTypes[match]
            if (hostMatch != null) {
                hostMatch.addAll(propagatorTypes)
            } else {
                firstPartyHostsWithHeaderTypes[match] = propagatorTypes.toMutableSet()
            }
        }
    }

    return firstPartyHostsWithHeaderTypes
}

internal fun ReadableArray.asTracingHeaderTypes(): Set<TracingHeaderType> {
    return this.toArrayList().mapNotNull {
        when (it) {
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
