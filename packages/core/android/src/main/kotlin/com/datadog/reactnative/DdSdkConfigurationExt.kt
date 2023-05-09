/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.tracing.TracingHeaderType
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap

internal fun ReadableMap.asDdSdkConfiguration(): DdSdkConfiguration {
    return DdSdkConfiguration(
        clientToken = getString("clientToken").orEmpty(),
        env = getString("env").orEmpty(),
        applicationId = getString("applicationId"),
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
        additionalConfig = getMap("additionalConfig")?.toHashMap(),
        configurationForTelemetry = getMap(
            "configurationForTelemetry"
        )?.asConfigurationForTelemetry()
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
    applicationId?.let { map.putString("applicationId", it) }
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
