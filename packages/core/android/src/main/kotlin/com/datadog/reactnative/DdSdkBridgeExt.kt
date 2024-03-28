/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.facebook.infer.annotation.Assertions
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableNativeMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import java.lang.NullPointerException

/**
 * Converts the List to a WritableNativeArray
 */
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

/**
 * Converts the Map to a WritableNativeMap
 */
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

/**
 * Casts the ReadableArray to a List that strictly contains non-null objects of type HashMap.
 * @throws TypeCastException if at least one of the list items is not of type HashMap
 */
internal fun ReadableArray.toHashMapArrayList(): List<HashMap<*, *>> {
    return this.toKotlinArrayList().toMutableList().mapNotNull {
        if (it is HashMap<*, *> || it == null) {
            it as HashMap<*, *>?
        } else {
            throw TypeCastException("Cannot convert ReadableArray to ArrayList of HashMap(s): " +
                    "$it is not of type HashMap<*,*>")
        }
    }
}

/**
 * Recursively converts the ReadableMap to a HashMap which only contains Kotlin stdlib objects,
 * such as ArrayList, HashMap and the raw types.
 * @throws IllegalArgumentException if the readable map is malformed (eg. it contains a HashMap
 * or ArrayList, instead of ReadableMap and ReadableArray respectively).
 */
internal fun ReadableMap.toKotlinHashMap(): HashMap<String, Any> {
    val hashMap: HashMap<String, Any> = this.toHashMap()
    val iterator: Iterator<*> = hashMap.keys.iterator()

    while (iterator.hasNext()) {
        val key = iterator.next() as String
        when (getType(key)) {
            ReadableType.Null, ReadableType.Boolean, ReadableType.Number, ReadableType.String -> {}
            ReadableType.Map -> hashMap[key] = (Assertions.assertNotNull(getMap(key)) as ReadableMap).toKotlinHashMap()
            ReadableType.Array -> hashMap[key] = (Assertions.assertNotNull(getArray(key)) as ReadableArray).toKotlinArrayList()
            else -> throw IllegalArgumentException("Could not convert object with key: $key.")
        }
    }

    return hashMap
}

/**
 * Recursively converts the ReadableArray to a ArrayList which only contains Kotlin stdlib objects,
 * such as ArrayList, HashMap and the raw types.
 * @throws IllegalArgumentException if the readable array is malformed (eg. it contains a HashMap
 * or ArrayList, instead of ReadableMap and ReadableArray respectively).
 */
internal fun ReadableArray.toKotlinArrayList(): ArrayList<*> {
    val arrayList = ArrayList<Any?>()
        for (i in 0 until size()) {
            try {
                when (getType(i)) {
                    ReadableType.Null -> arrayList.add(null as Any?)
                    ReadableType.Boolean -> arrayList.add(getBoolean(i))
                    ReadableType.Number -> arrayList.add(getDouble(i))
                    ReadableType.String -> arrayList.add(getString(i))
                    ReadableType.Map -> arrayList.add(getMap(i).toKotlinHashMap())
                    ReadableType.Array -> arrayList.add(getArray(i).toKotlinArrayList())
                    else -> throw IllegalArgumentException("Unhandled ReadableType: $i.")
                }
            } catch (err: NullPointerException) {
                throw IllegalArgumentException("Could not convert object at index: $i.")
            }
        }

    return arrayList
}
