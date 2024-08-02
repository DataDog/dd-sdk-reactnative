/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap

/**
 * Converts the [List] to a [WritableNativeArray].
 */
internal fun List<*>.toWritableArray(): WritableArray {
    return this.toWritableArray(
        createWritableMap = { WritableNativeMap() },
        createWritableArray = { WritableNativeArray() }
    )
}

/**
 * Converts the [List] to a [WritableArray].
 * @param createWritableMap a function to provide a concrete instance of new WritableMap(s)
 * @param createWritableArray a function to provide a concrete instance of new WritableArray(s)
 */
internal fun List<*>.toWritableArray(
    createWritableMap: () -> WritableMap,
    createWritableArray: () -> WritableArray
): WritableArray {
    val writableArray = createWritableArray()

    for (it in iterator()) {
        when (it) {
            null -> writableArray.pushNull()
            is Int -> writableArray.pushInt(it)
            is Long -> writableArray.pushDouble(it.toDouble())
            is Float -> writableArray.pushDouble(it.toDouble())
            is Double -> writableArray.pushDouble(it)
            is String -> writableArray.pushString(it)
            is Boolean -> writableArray.pushBoolean(it)
            is List<*> -> writableArray.pushArray(
                it.toWritableArray(
                    createWritableMap,
                    createWritableArray
                )
            )
            is Map<*, *> -> writableArray.pushMap(
                it.toWritableMap(
                    createWritableMap,
                    createWritableArray
                )
            )
            else -> Log.e(
                javaClass.simpleName,
                "toWritableArray(): Unhandled type ${it.javaClass.simpleName} has been ignored"
            )
        }
    }

    return writableArray
}

/**
 * Converts the [Map] to a [WritableNativeMap].
 */
internal fun Map<*, *>.toWritableMap(): WritableMap {
    return this.toWritableMap(
        createWritableMap = { WritableNativeMap() },
        createWritableArray = { WritableNativeArray() }
    )
}

/**
 * Converts the [Map] to a [WritableMap].
 * @param createWritableMap a function to provide a concrete instance for WritableMap(s)
 * @param createWritableArray a function to provide a concrete instance for WritableArray(s)
 */
internal fun Map<*, *>.toWritableMap(
    createWritableMap: () -> WritableMap,
    createWritableArray: () -> WritableArray
): WritableMap {
    val map = createWritableMap()

    for ((k, v) in iterator()) {
        val key = (k as? String) ?: k.toString()
        when (v) {
            null -> map.putNull(key)
            is Int -> map.putInt(key, v)
            is Long -> map.putDouble(key, v.toDouble())
            is Float -> map.putDouble(key, v.toDouble())
            is Double -> map.putDouble(key, v)
            is String -> map.putString(key, v)
            is Boolean -> map.putBoolean(key, v)
            is List<*> -> map.putArray(
                key,
                v.toWritableArray(
                    createWritableMap,
                    createWritableArray
                )
            )
            is Map<*, *> -> map.putMap(
                key,
                v.toWritableMap(
                    createWritableMap,
                    createWritableArray
                )
            )
            else -> Log.e(
                javaClass.simpleName,
                "toWritableMap(): Unhandled type ${v.javaClass.simpleName} has been ignored"
            )
        }
    }

    return map
}

/**
 * Recursively converts the [ReadableMap] to a [Map] which only contains Kotlin stdlib objects,
 * such as [List], [Map] and the raw types.
 */
internal fun ReadableMap.toMap(): Map<String, Any> {
    val map = this.toHashMap()
    val iterator = map.keys.iterator()

    fun updateMap(key: String, value: Any?) {
        if (value != null) {
            map[key] = value
        } else {
            map.remove(key)
            Log.e(
                javaClass.simpleName,
                "toMap(): Cannot convert nested object for key: $key"
            )
        }
    }

    while (iterator.hasNext()) {
        val key = iterator.next()
        try {
            when (val type = getType(key)) {
                ReadableType.Map -> updateMap(key, getMap(key)?.toMap())
                ReadableType.Array -> updateMap(key, getArray(key)?.toList())
                ReadableType.Null, ReadableType.Boolean, ReadableType.Number, ReadableType.String -> {}
                else -> {
                    map.remove(key)
                    Log.e(
                        javaClass.simpleName,
                        "toMap(): Skipping unhandled type [${type.name}] for key: $key"
                    )
                }
            }
        } catch (err: IllegalArgumentException) {
            map.remove(key)
            Log.e(
                javaClass.simpleName,
                "toMap(): Could not convert object for key: $key",
                err
            )
        }
    }

    return map
}

/**
 * Recursively converts the [ReadableArray] to a [List] which only contains Kotlin stdlib objects,
 * such as [List], [Map] and the raw types.
 * or [List], instead of [ReadableMap] and [ReadableArray] respectively).
 */
internal fun ReadableArray.toList(): List<*> {
    val list = mutableListOf<Any?>()
    for (i in 0 until size()) {
        // ReadableArray throws a null pointer exception if getMap(i) or getArray(i) returns null
        @Suppress("TooGenericExceptionCaught")
        try {
            when (val type = getType(i)) {
                ReadableType.Null -> list.add(null)
                ReadableType.Boolean -> list.add(getBoolean(i))
                ReadableType.Number -> list.add(getDouble(i))
                ReadableType.String -> list.add(getString(i))
                ReadableType.Map -> {
                    // getMap() return type is nullable in previous RN versions
                    @Suppress("USELESS_ELVIS")
                    val readableMap = getMap(i) ?: Arguments.createMap()
                    list.add(readableMap.toMap())
                }
                ReadableType.Array -> {
                    // getArray() return type is nullable in previous RN versions
                    @Suppress("USELESS_ELVIS")
                    val readableArray = getArray(i) ?: Arguments.createArray()
                    list.add(readableArray.toList())
                }
                else -> Log.e(
                    javaClass.simpleName,
                    "toList(): Unhandled ReadableType: ${type.name}."
                )
            }
        } catch (err: NullPointerException) {
            Log.e(
                javaClass.simpleName,
                "toList(): Could not convert object at index: $i.",
                err
            )
        }
    }

    return list
}

/**
 * Returns the boolean for the given key, or null if the entry is
 * not in the map.
 */
internal fun ReadableMap.getBooleanOrNull(key: String): Boolean? {
    return if (hasKey(key)) {
        getBoolean(key)
    } else {
        null
    }
}
