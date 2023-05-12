/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.tools.unit

import com.datadog.android.core.configuration.UploadFrequency
import com.datadog.android.core.configuration.VitalsUpdateFrequency
import com.datadog.reactnative.ConfigurationForTelemetry
import com.datadog.reactnative.DdSdkConfiguration
import com.datadog.reactnative.toReadableMap
import com.facebook.react.bridge.ReadableMap

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
    additionalConfig?.let { map.put("additionalConfig", it.toReadableMap()) }
    configurationForTelemetry?.let {
        map.put("configurationForTelemetry", it.toReadableJavaOnlyMap())
    }
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
