/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.bridge.DatadogConfiguration
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap

fun ReadableMap.asDatadogConfiguration(): DatadogConfiguration{
    return DatadogConfiguration(
        clientToken = getString("clientToken").orEmpty(),
        env = getString("env").orEmpty(),
        applicationId = getString("applicationId")
    )
}

fun DatadogConfiguration.toReadableMap(): WritableNativeMap {
    val map = WritableNativeMap()
    map.putString("clientToken", clientToken)
    map.putString("env", env)
    if (applicationId != null) map.putString("applicationId", applicationId)
    return map
}
