/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.tools.unit

import com.datadog.android.core.configuration.BatchSize
import com.datadog.android.core.configuration.UploadFrequency
import com.datadog.android.rum.configuration.VitalsUpdateFrequency
import com.datadog.reactnative.ConfigurationForTelemetry
import com.datadog.reactnative.CustomEndpoints
import com.datadog.reactnative.DdSdkConfiguration
import com.datadog.reactnative.ProxyAuthenticator
import com.facebook.react.bridge.ReadableMap
import java.net.Proxy

fun DdSdkConfiguration.toReadableJavaOnlyMap(): ReadableMap {
    val map = mutableMapOf<String, Any?>()
    map["clientToken"] = clientToken
    map["env"] = env
    applicationId?.let { map.put("applicationId", it) }
    map["nativeCrashReportEnabled"] = if (nativeCrashReportEnabled == null) {
        false
    } else {
        nativeCrashReportEnabled
    }
    map["nativeLongTaskThresholdMs"] = if (nativeLongTaskThresholdMs == null) {
        0f
    } else {
        nativeLongTaskThresholdMs
    }
    map["longTaskThresholdMs"] = if (longTaskThresholdMs == null) {
        0f
    } else {
        longTaskThresholdMs
    }
    if (sampleRate != null) {
        map["sampleRate"] = sampleRate
    } else {
        // we have to put something, because ReadableMap.asDdSdkConfiguration() will call
        // ReadableMap#getDouble which doesn't allow having null value
        map["sampleRate"] = 100f
    }
    if (telemetrySampleRate != null) {
        map["telemetrySampleRate"] = telemetrySampleRate
    } else {
        // we have to put something, because ReadableMap.asDdSdkConfiguration() will call
        // ReadableMap#getDouble which doesn't allow having null value
        map["telemetrySampleRate"] = 20f
    }
    site?.let { map.put("site", it) }
    trackingConsent?.let { map.put("trackingConsent", it) }
    if (vitalsUpdateFrequency != null) {
        map["vitalsUpdateFrequency"] = vitalsUpdateFrequency
    } else {
        // we have to put something, because ReadableMap.asDdSdkConfiguration() will call
        // ReadableMap#getString which doesn't allow having null value
        map["vitalsUpdateFrequency"] = VitalsUpdateFrequency.AVERAGE.toString()
    }
    map["trackFrustrations"] = if (trackFrustrations == null) {
        false
    } else {
        trackFrustrations
    }
    if (uploadFrequency != null) {
        map["uploadFrequency"] = uploadFrequency
    } else {
        map["uploadFrequency"] = UploadFrequency.AVERAGE.toString()
    }
    if (batchSize != null) {
        map["batchSize"] = batchSize
    } else {
        map["batchSize"] = BatchSize.MEDIUM.toString()
    }
    map["trackBackgroundEvents"] = if (trackBackgroundEvents == null) {
        false
    } else {
        trackBackgroundEvents
    }
    customEndpoints?.let {
        map.put("customEndpoints", it.toReadableJavaOnlyMap())
    }
    additionalConfig?.let { map.put("additionalConfiguration", it.toReadableMap()) }
    configurationForTelemetry?.let {
        map.put("configurationForTelemetry", it.toReadableJavaOnlyMap())
    }
    map.put("nativeViewTracking", nativeViewTracking)
    map.put("nativeInteractionTracking", nativeInteractionTracking)
    verbosity?.let { map.put("verbosity", it) }
    proxyConfig?.let {
        map.put("proxyConfig", it.toReadableMap())
    }
    serviceName?.let { map.put("serviceName", it) }
    firstPartyHosts?.let {
        map.put("firstPartyHosts", it.toFirstPartyHostsReadableArray())
    }
    map.put("bundleLogsWithRum", bundleLogsWithRum)
    map.put("bundleLogsWithTraces", bundleLogsWithTraces)

    trackNonFatalAnrs?.let { map.put("trackNonFatalAnrs", it) }

    return map.toReadableMap()
}

internal fun ConfigurationForTelemetry.toReadableJavaOnlyMap(): ReadableMap {
    val map = mutableMapOf<String, Any?>()
    initializationType?.let { map.put("initializationType", it) }
    trackErrors?.let { map.put("trackErrors", it) }
    trackInteractions?.let { map.put("trackInteractions", it) }
    trackNetworkRequests?.let { map.put("trackNetworkRequests", it) }
    reactVersion?.let { map.put("reactVersion", it) }
    reactNativeVersion?.let { map.put("reactNativeVersion", it) }
    return map.toReadableMap()
}

internal fun CustomEndpoints.toReadableJavaOnlyMap(): ReadableMap {
    val map = mutableMapOf<String, Any?>()
    rum?.let { map.put("rum", it) }
    logs?.let { map.put("logs", it) }
    trace?.let { map.put("trace", it) }
    return map.toReadableMap()
}

internal fun Pair<Proxy, ProxyAuthenticator?>.toReadableMap(): ReadableMap {
    val map = mutableMapOf<String, Any?>()
    val inetAddress = first.address().toString()
    val address = inetAddress.substringBeforeLast(":")
    val port = inetAddress.substringAfterLast(":").toInt()
    map.put("type", first.type())
    map.put("address", address)
    map.put("port", port)
    map.put("username", second?.username)
    map.put("password", second?.password)
    return map.toReadableMap()
}
