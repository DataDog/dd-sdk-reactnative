package com.datadog.reactnative.sessionreplay.utils

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType

object SRCache {
    private val cache = mutableMapOf<String, Map<String, Any?>>()

    private fun readableMapToMap(readableMap: ReadableMap): Map<String, Any?> {
        val result = mutableMapOf<String, Any?>()
        val iterator = readableMap.keySetIterator()

        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            when (val type = readableMap.getType(key)) {
                ReadableType.Null -> result[key] = null
                ReadableType.Boolean -> result[key] = readableMap.getBoolean(key)
                ReadableType.Number -> result[key] = readableMap.getDouble(key)
                ReadableType.String -> result[key] = readableMap.getString(key)
                ReadableType.Map -> result[key] = readableMapToMap(readableMap.getMap(key)!!)
                ReadableType.Array -> result[key] = readableMap.getArray(key)?.toArrayList() // Optional: shallow conversion
                else -> throw IllegalArgumentException("Unsupported type: $type")
            }
        }

        return result
    }

    fun put(key: String, value: ReadableMap) {
        cache[key] = readableMapToMap(value)
    }

    fun get(key: String): Map<String, Any?>? {
        return cache[key]
    }

    fun clear() {
        cache.clear()
    }

    fun remove(key: String) {
        cache.remove(key)
    }
}