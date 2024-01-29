/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap

internal fun List<*>.toWritableArray(): WritableNativeArray {
    val list = WritableNativeArray()
    for (it in iterator()) {
        @Suppress("NotImplementedDeclaration")
        when (it) {
            null -> list.pushNull()
            is Int -> list.pushInt(it)
            is Long -> list.pushDouble(it.toDouble())
            is Float -> list.pushDouble(it.toDouble())
            is Double -> list.pushDouble(it)
            is String -> list.pushString(it)
            is List<*> -> list.pushArray(it.toWritableArray())
            is Map<*, *> -> list.pushMap(it.toWritableMap())
            else -> TODO()
        }
    }
    return list
}

internal fun Map<*, *>.toWritableMap(): WritableNativeMap {
    val map = WritableNativeMap()
    for ((k,v) in iterator()) {
        val key = (k as? String) ?: k.toString()
        @Suppress("NotImplementedDeclaration")
        when (v) {
            null -> map.putNull(key)
            is Int -> map.putInt(key, v)
            is Long -> map.putDouble(key, v.toDouble())
            is Float -> map.putDouble(key, v.toDouble())
            is Double -> map.putDouble(key, v)
            is String -> map.putString(key, v)
            is List<*> -> map.putArray(key, v.toWritableArray())
            is Map<*, *> -> map.putMap(key, v.toWritableMap())
            else -> TODO()
        }
    }
    return map
}
