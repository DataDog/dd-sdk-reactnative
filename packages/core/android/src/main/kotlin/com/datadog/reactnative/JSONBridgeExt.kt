/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import org.json.JSONObject

/**
 * Converts a [JSONObject] to a [WritableMap].
 */
internal fun JSONObject.toWritableMap(): WritableMap = this.toMap().toWritableMap()

/**
 * Converts a [JSONObject] to a [Map].
 */
internal fun JSONObject.toMap(): Map<String, Any?> {
    val map = mutableMapOf<String, Any?>()
    val keys = this.keys()

    while (keys.hasNext()) {
        val key = keys.next()
        val value = this.opt(key)

        map[key] =
            when (value) {
                null, JSONObject.NULL -> null
                is JSONObject -> value.toMap()
                is org.json.JSONArray -> value.toList()
                else -> value
            }
    }

    return map
}

/**
 * Converts a [org.json.JSONArray] to a [List].
 */
internal fun org.json.JSONArray.toList(): List<Any?> {
    val list = mutableListOf<Any?>()

    for (i in 0 until this.length()) {
        val value = this.opt(i)

        list.add(
            when (value) {
                null, JSONObject.NULL -> null
                is JSONObject -> value.toMap()
                is org.json.JSONArray -> value.toList()
                else -> value
            },
        )
    }

    return list
}

/**
 * Converts a [ReadableMap] to a [JSONObject].
 */
internal fun ReadableMap.toJSONObject(): JSONObject = this.toMap().toJSONObject()

/**
 * Converts a [Map] to a [JSONObject].
 */
@Suppress("UNCHECKED_CAST")
internal fun Map<String, Any>.toJSONObject(): JSONObject {
    val jsonObject = JSONObject()

    for ((key, value) in this) {
        jsonObject.put(
            key,
            when (value) {
                is Map<*, *> -> (value as Map<String, Any>).toJSONObject()
                is List<*> -> value.toJSONArray()
                else -> value
            },
        )
    }

    return jsonObject
}

/**
 * Converts a [List] to a [org.json.JSONArray].
 */
@Suppress("UNCHECKED_CAST")
internal fun List<*>.toJSONArray(): org.json.JSONArray {
    val jsonArray = org.json.JSONArray()

    for (value in this) {
        jsonArray.put(
            when (value) {
                is Map<*, *> -> (value as Map<String, Any>).toJSONObject()
                is List<*> -> value.toJSONArray()
                else -> value
            },
        )
    }

    return jsonArray
}
