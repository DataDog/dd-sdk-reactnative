/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
 
package com.datadog.tools.unit

import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReadableMap

fun Map<*, *>.toReadableMap(): ReadableMap {
    val keysAndValues = mutableListOf<Any?>()

    entries.forEach {
        keysAndValues.add(it.key)
        keysAndValues.add(it.value)
    }

    // this FB implementation is not backed by Android-specific .so library, so ok for unit tests
    return JavaOnlyMap.of(*keysAndValues.toTypedArray())
}
