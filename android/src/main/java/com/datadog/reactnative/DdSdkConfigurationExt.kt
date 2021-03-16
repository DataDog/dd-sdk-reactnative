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

fun ReadableMap.asDdSdkConfiguration(): DdSdkConfiguration{
    return DdSdkConfiguration(
        clientToken = getString("clientToken").orEmpty(),
        env = getString("env").orEmpty(),
        applicationId = getString("applicationId"),
        nativeCrashReportEnabled = getBoolean("nativeCrashReportEnabled"),
        sampleRate = getDouble("sampleRate"),
        additionalConfig = getMap("additionalConfig")?.toHashMap()
    )
}

fun DdSdkConfiguration.toReadableMap(): WritableNativeMap {
    val map = WritableNativeMap()
    map.putString("clientToken", clientToken)
    map.putString("env", env)
    if (applicationId != null) map.putString("applicationId", applicationId)
    if (nativeCrashReportEnabled != null) map.putBoolean("nativeCrashReportEnabled", nativeCrashReportEnabled)
    if (sampleRate != null) map.putDouble("sampleRate", sampleRate)
    if (additionalConfig != null) map.putMap("additionalConfig", additionalConfig.toWritableMap())
    return map
}
