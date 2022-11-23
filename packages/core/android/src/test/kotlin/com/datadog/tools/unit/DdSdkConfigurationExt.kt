/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.tools.unit

import com.datadog.android.core.configuration.VitalsUpdateFrequency
import com.datadog.reactnative.DdSdkConfiguration
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
    additionalConfig?.let { map.put("additionalConfig", it.toReadableMap()) }
    return map.toReadableMap()
}
