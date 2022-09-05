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
