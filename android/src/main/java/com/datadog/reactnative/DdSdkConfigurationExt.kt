/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.bridge.DdSdkConfiguration
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap

fun ReadableMap.asDdSdkConfiguration(): DdSdkConfiguration {
    return DdSdkConfiguration(
        clientToken = getString("clientToken").orEmpty(),
        env = getString("env").orEmpty(),
        applicationId = getString("applicationId"),
        nativeCrashReportEnabled = getBoolean("nativeCrashReportEnabled"),
        sampleRate = getDouble("sampleRate"),
        site = getString("site"),
        trackingConsent = getString("trackingConsent"),
        additionalConfig = getMap("additionalConfig")?.toHashMap(),
        manualTracingEnabled = getBoolean("manualTracingEnabled")
    )
}

fun DdSdkConfiguration.toReadableMap(): ReadableMap {
    val map = WritableNativeMap()
    map.putString("clientToken", clientToken)
    map.putString("env", env)
    applicationId?.let { map.putString("applicationId", it) }
    nativeCrashReportEnabled?.let { map.putBoolean("nativeCrashReportEnabled", it) }
    sampleRate?.let { map.putDouble("sampleRate", it) }
    site?.let { map.putString("site", it) }
    trackingConsent?.let { map.putString("trackingConsent", it) }
    additionalConfig?.let { map.putMap("additionalConfig", it.toWritableMap()) }
    manualTracingEnabled?.let { map.putBoolean("manualTracingEnabled", it) }
    return map
}
