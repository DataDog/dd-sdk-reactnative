/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.tools.unit.keys
import com.datadog.tools.unit.toReadableArray
import com.datadog.tools.unit.toReadableMap
import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import org.assertj.core.api.Assertions.assertThat
import org.json.JSONArray
import org.json.JSONObject
import org.junit.jupiter.api.Test

internal class DdSdkBridgeExtTest {
    // Default providers for toWritableArray and toWritableMap
    private val createWritableMap = { JavaOnlyMap() }
    private val createWritableArray = { JavaOnlyArray() }

    @Test
    fun `M do a proper conversion W toWritableArray { all types of supported values }`() {
        // Given
        val array = getTestArray()
        val nestedTestMap = getTestMap()
        val nestedTestArray = getTestArray()

        array.add(nestedTestMap) // Nested map
        array.add(nestedTestArray) // Nested array

        // When
        val writableArray = array.toWritableArray(createWritableMap, createWritableArray)

        // Then
        assertThat(writableArray.size()).isEqualTo(array.size)
        testWritableArray(writableArray)

        val nestedMap = writableArray.getMap(array.size - 2)
        assertThat(nestedMap).isInstanceOf(WritableMap::class.java)
        assertThat(nestedMap.keys()).hasSameSizeAs(nestedTestMap.keys)
        testWritableMap(nestedMap as WritableMap)

        val nestedArray = writableArray.getArray(array.size - 1)
        assertThat(nestedArray).isInstanceOf(WritableArray::class.java)
        assertThat(nestedArray.size()).isEqualTo(nestedTestArray.size)
        testWritableArray(nestedArray as WritableArray)
    }

    @Test
    fun `M do a proper conversion W toWritableMap { raw and nested values }`() {
        // Given
        val map = getTestMap()
        val nestedTestMap = getTestMap()
        val nestedTestArray = getTestArray()

        map["map"] = nestedTestMap
        map["array"] = nestedTestArray

        // When
        val writableMap = map.toWritableMap(createWritableMap, createWritableArray)

        // Then
        testWritableMap(writableMap)

        val nestedMap = writableMap.getMap("map")
        assertThat(nestedMap).isNotNull()
        assertThat(nestedMap).isInstanceOf(WritableMap::class.java)
        assertThat(nestedMap!!.keys()).hasSameSizeAs(nestedTestMap.keys)
        testWritableMap(nestedMap as WritableMap)

        val nestedArray = writableMap.getArray("array")
        assertThat(nestedArray).isNotNull()
        assertThat(nestedArray).isInstanceOf(WritableArray::class.java)
        assertThat(nestedArray!!.size()).isEqualTo(nestedTestArray.size)
        testWritableArray(nestedArray as WritableArray)
    }

    @Test
    fun `M do a proper conversion W toMap { 1-level JavaOnlyMap }`() {
        // Given
        val writableMap = getTestWritableMap()

        // When
        val map = writableMap.toMap()

        // Then
        testMap(map)

        val expectedMap = writableMap
            .toHashMap()
            .filterValues { it != null }
            .mapValues { it.value!! }
            .toMap(HashMap())

        assertThat(map).isEqualTo(expectedMap)
    }

    @Test
    fun `M do a proper conversion W toMap { nested JavaOnlyMap }`() {
        // Given
        val writableMap = getTestWritableMap()
        val nestedTestMap = getTestWritableMap()

        writableMap.putMap("map", nestedTestMap)

        // When
        val map = writableMap.toMap()

        // Then
        assertThat(map).isNotNull()
        assertThat(map.size).isEqualTo(writableMap.keys().size - 1)
        testMap(map)

        val nestedMap = map["map"]
        assertThat(nestedMap).isNotNull()
        assertThat(nestedMap).isInstanceOf(Map::class.java)
        assertThat((nestedMap as Map<*, *>).size).isEqualTo(nestedTestMap.keys().size - 1)
        testMap(nestedMap)
    }

    @Test
    fun `M do a proper conversion W toMap { nested JavaOnlyArray }`() {
        // Given
        val writableMap = getTestWritableMap()
        val nestedTestArray = getTestWritableArray()

        writableMap.putArray("array", nestedTestArray)

        // When
        val map = writableMap.toMap()

        // Then
        assertThat(map).isNotNull()
        assertThat(map.size).isEqualTo(writableMap.keys().size - 1)
        testMap(map)

        val nestedArray = map["array"]
        assertThat(nestedArray).isNotNull()
        assertThat(nestedArray).isInstanceOf(List::class.java)
        assertThat(nestedArray as List<*>).hasSize(nestedTestArray.size())
        testArray(nestedArray)
    }

    @Test
    fun `M do a proper conversion W toMap { nested JavaOnlyMap and JavaOnlyArray }`() {
        // Given
        val writableMap = getTestWritableMap()
        val nestedTestMap = getTestWritableMap()
        val nestedTestArray = getTestWritableArray()

        writableMap.putMap("map", nestedTestMap)
        writableMap.putArray("array", nestedTestArray)

        // When
        val map = writableMap.toMap()

        // Then
        assertThat((map as Map<*, *>).size).isEqualTo(writableMap.keys().size - 1)
        testMap(map)

        val nestedMap = map["map"]
        assertThat((nestedMap as Map<*, *>).size).isEqualTo(nestedTestMap.keys().size - 1)
        assertThat(nestedMap).isNotNull()
        assertThat(nestedMap).isInstanceOf(Map::class.java)
        testMap(nestedMap)

        val nestedArray = map["array"]
        assertThat(nestedArray).isNotNull()
        assertThat(nestedArray).isInstanceOf(List::class.java)
        assertThat((nestedArray as List<*>)).hasSize(nestedTestArray.size())
        testArray(nestedArray)
    }

    @Test
    fun `M do a proper conversion W toList { with raw types only }`() {
        // Given
        val writableArray = getTestWritableArray()

        // When
        val array = writableArray.toList()

        // Then
        assertThat(array).isNotNull()
        assertThat(array).hasSize(writableArray.size())
        testArray(array)
    }

    @Test
    fun `M do a proper conversion W toList { with nested objects }`() {
        // Given
        val writableArray = getTestWritableArray()
        val nestedTestMap = getTestWritableMap()
        val nestedTestArray = getTestWritableArray()

        writableArray.pushMap(nestedTestMap)
        writableArray.pushArray(nestedTestArray)

        // When
        val array = writableArray.toList()

        // Then
        assertThat(array).isNotNull()
        assertThat(array).hasSize(writableArray.size())
        testArray(array)

        val nestedMap = array[array.size - 2]
        assertThat(nestedMap).isInstanceOf(Map::class.java)
        assertThat((nestedMap as Map<*, *>).size).isEqualTo(nestedTestMap.keys().size - 1)
        testMap(nestedMap)

        val nestedArray = array[array.size - 1]
        assertThat(nestedArray).isInstanceOf(List::class.java)
        assertThat((nestedArray as List<*>)).hasSize(nestedTestArray.size())
        testArray(nestedArray)
    }

    @Test
    fun `M do a proper conversion and not throw W toMap { malformed nested map }`() {
        // Given
        val readableMap =
            mapOf(
                "map" to mapOf("test" to "test") // NOT a ReadableMap
            ).toReadableMap()

        // When
        val map = readableMap.toMap()

        // Then
        assertThat(map).isEmpty()
    }

    @Test
    fun `M do a proper conversion and not throw W toList { malformed nested array }`() {
        // Given
        val readableArray =
            listOf(
                mapOf("test" to "test"), // NOT a ReadableMap
                listOf(null, true, 1.23, "test") // NOT a ReadableArray
            ).toReadableArray()

        // When
        val list = readableArray.toList()

        // Then
        assertThat(list).isEmpty()
    }

    @Test
    fun `M returns a boolean W getBooleanOrNull { entry in the map }`() {
        // Given
        val readableMap = mapOf(
            "testKey" to true
        ).toReadableMap()

        // When
        val value = readableMap.getBooleanOrNull("testKey")

        // Then
        assertThat(value).isTrue()
    }

    @Test
    fun `M returns null W getBooleanOrNull { entry not in the map }`() {
        // Given
        val readableMap = mapOf(
            "dummy" to false
        ).toReadableMap()

        // When
        val value = readableMap.getBooleanOrNull("testKey")

        // Then
        assertThat(value).isNull()
    }

    @Test
    fun `M do a proper conversion W JSONObject toMap { with raw types }`() {
        // Given
        val jsonObject = JSONObject().apply {
            put("null", JSONObject.NULL)
            put("int", 1)
            put("long", 2L)
            put("double", 3.0)
            put("string", "test")
            put("boolean", true)
        }

        // When
        val map = jsonObject.toMap()

        // Then
        assertThat(map).hasSize(6)
        assertThat(map["null"]).isNull()
        assertThat(map["int"]).isEqualTo(1)
        assertThat(map["long"]).isEqualTo(2L)
        assertThat(map["double"]).isEqualTo(3.0)
        assertThat(map["string"]).isEqualTo("test")
        assertThat(map["boolean"]).isEqualTo(true)
    }

    @Test
    fun `M do a proper conversion W JSONObject toMap { with nested objects }`() {
        // Given
        val nestedObject = JSONObject().apply {
            put("nestedKey", "nestedValue")
        }
        val nestedArray = JSONArray().apply {
            put("item1")
            put("item2")
        }
        val jsonObject = JSONObject().apply {
            put("object", nestedObject)
            put("array", nestedArray)
        }

        // When
        val map = jsonObject.toMap()

        // Then
        assertThat(map).hasSize(2)
        assertThat(map["object"]).isInstanceOf(Map::class.java)
        assertThat((map["object"] as Map<*, *>)["nestedKey"]).isEqualTo("nestedValue")
        assertThat(map["array"]).isInstanceOf(List::class.java)
        assertThat((map["array"] as List<*>)).hasSize(2)
        assertThat((map["array"] as List<*>)[0]).isEqualTo("item1")
        assertThat((map["array"] as List<*>)[1]).isEqualTo("item2")
    }

    @Test
    fun `M do a proper conversion W JSONObject toWritableMap { with raw types }`() {
        // Given
        val jsonObject = JSONObject().apply {
            put("int", 1)
            put("double", 2.0)
            put("string", "test")
            put("boolean", true)
        }

        // When
        val writableMap = jsonObject.toWritableMap()

        // Then
        assertThat(writableMap.getInt("int")).isEqualTo(1)
        assertThat(writableMap.getDouble("double")).isEqualTo(2.0)
        assertThat(writableMap.getString("string")).isEqualTo("test")
        assertThat(writableMap.getBoolean("boolean")).isTrue()
    }

    @Test
    fun `M do a proper conversion W JSONArray toList { with raw types }`() {
        // Given
        val jsonArray = JSONArray().apply {
            put(JSONObject.NULL)
            put(1)
            put(2.0)
            put("test")
            put(true)
        }

        // When
        val list = jsonArray.toList()

        // Then
        assertThat(list).hasSize(5)
        assertThat(list[0]).isNull()
        assertThat(list[1]).isEqualTo(1)
        assertThat(list[2]).isEqualTo(2.0)
        assertThat(list[3]).isEqualTo("test")
        assertThat(list[4]).isEqualTo(true)
    }

    @Test
    fun `M do a proper conversion W JSONArray toList { with nested objects }`() {
        // Given
        val nestedObject = JSONObject().apply {
            put("key", "value")
        }
        val nestedArray = JSONArray().apply {
            put("nested")
        }
        val jsonArray = JSONArray().apply {
            put(nestedObject)
            put(nestedArray)
        }

        // When
        val list = jsonArray.toList()

        // Then
        assertThat(list).hasSize(2)
        assertThat(list[0]).isInstanceOf(Map::class.java)
        assertThat((list[0] as Map<*, *>)["key"]).isEqualTo("value")
        assertThat(list[1]).isInstanceOf(List::class.java)
        assertThat((list[1] as List<*>)[0]).isEqualTo("nested")
    }

    @Test
    fun `M do a proper conversion W ReadableMap toJSONObject { with raw types }`() {
        // Given
        val readableMap = mapOf(
            "int" to 1,
            "double" to 2.0,
            "string" to "test",
            "boolean" to true
        ).toReadableMap()

        // When
        val jsonObject = readableMap.toJSONObject()

        // Then
        assertThat(jsonObject.length()).isEqualTo(4)
        assertThat(jsonObject.getInt("int")).isEqualTo(1)
        assertThat(jsonObject.getDouble("double")).isEqualTo(2.0)
        assertThat(jsonObject.getString("string")).isEqualTo("test")
        assertThat(jsonObject.getBoolean("boolean")).isTrue()
    }

    @Test
    fun `M do a proper conversion W ReadableMap toJSONObject { with nested objects }`() {
        // Given
        val readableMap = mapOf(
            "map" to mapOf("nestedKey" to "nestedValue"),
            "list" to listOf("item1", "item2")
        ).toReadableMap()

        // When
        val jsonObject = readableMap.toJSONObject()

        // Then
        assertThat(jsonObject.length()).isEqualTo(2)
        assertThat(jsonObject.getJSONObject("map").getString("nestedKey")).isEqualTo("nestedValue")
        assertThat(jsonObject.getJSONArray("list").length()).isEqualTo(2)
        assertThat(jsonObject.getJSONArray("list").getString(0)).isEqualTo("item1")
        assertThat(jsonObject.getJSONArray("list").getString(1)).isEqualTo("item2")
    }

    @Test
    fun `M do a proper conversion W Map toJSONObject { with raw types }`() {
        // Given
        val map: Map<String, Any> = mapOf(
            "int" to 1,
            "double" to 2.0,
            "string" to "test",
            "boolean" to true
        )

        // When
        val jsonObject = map.toJSONObject()

        // Then
        assertThat(jsonObject.length()).isEqualTo(4)
        assertThat(jsonObject.getInt("int")).isEqualTo(1)
        assertThat(jsonObject.getDouble("double")).isEqualTo(2.0)
        assertThat(jsonObject.getString("string")).isEqualTo("test")
        assertThat(jsonObject.getBoolean("boolean")).isTrue()
    }

    @Test
    fun `M do a proper conversion W Map toJSONObject { with nested objects }`() {
        // Given
        val map: Map<String, Any> = mapOf(
            "nestedMap" to mapOf("key" to "value"),
            "nestedList" to listOf(1, 2, 3)
        )

        // When
        val jsonObject = map.toJSONObject()

        // Then
        assertThat(jsonObject.length()).isEqualTo(2)
        assertThat(jsonObject.getJSONObject("nestedMap").getString("key")).isEqualTo("value")
        assertThat(jsonObject.getJSONArray("nestedList").length()).isEqualTo(3)
        assertThat(jsonObject.getJSONArray("nestedList").getInt(0)).isEqualTo(1)
        assertThat(jsonObject.getJSONArray("nestedList").getInt(1)).isEqualTo(2)
        assertThat(jsonObject.getJSONArray("nestedList").getInt(2)).isEqualTo(3)
    }

    @Test
    fun `M do a proper conversion W List toJSONArray { with raw types }`() {
        // Given
        val list = listOf(null, 1, 2.0, "test", true)

        // When
        val jsonArray = list.toJSONArray()

        // Then
        assertThat(jsonArray.length()).isEqualTo(5)
        assertThat(jsonArray.isNull(0)).isTrue()
        assertThat(jsonArray.getInt(1)).isEqualTo(1)
        assertThat(jsonArray.getDouble(2)).isEqualTo(2.0)
        assertThat(jsonArray.getString(3)).isEqualTo("test")
        assertThat(jsonArray.getBoolean(4)).isTrue()
    }

    @Test
    fun `M do a proper conversion W List toJSONArray { with nested objects }`() {
        // Given
        val list = listOf(
            mapOf("key" to "value"),
            listOf("nested1", "nested2")
        )

        // When
        val jsonArray = list.toJSONArray()

        // Then
        assertThat(jsonArray.length()).isEqualTo(2)
        assertThat(jsonArray.getJSONObject(0).getString("key")).isEqualTo("value")
        assertThat(jsonArray.getJSONArray(1).length()).isEqualTo(2)
        assertThat(jsonArray.getJSONArray(1).getString(0)).isEqualTo("nested1")
        assertThat(jsonArray.getJSONArray(1).getString(1)).isEqualTo("nested2")
    }

    private fun getTestMap(): MutableMap<String, Any?> = mutableMapOf(
        "null" to null,
        "int" to 1,
        "long" to 2L,
        "float" to 3.0f,
        "double" to 4.0,
        "string" to "test",
        "boolean" to true
    )

    private fun getTestWritableMap(): JavaOnlyMap = JavaOnlyMap.of(
        "null",
        null,
        "int",
        1,
        "long",
        2L,
        "float",
        3.0f,
        "double",
        4.0,
        "string",
        "test",
        "boolean",
        true
    )

    // Long type is not handled in JavaOnlyArray getType() in RN 0.71.10
    // https://github.com/facebook/react-native/pull/43158
    private fun getTestArray(): MutableList<Any?> = mutableListOf(
        null,
        1,
        2.0f,
        3.0,
        "test",
        true
    )

    // Long type is not handled in JavaOnlyArray getType() in RN 0.71.10
    // https://github.com/facebook/react-native/pull/43158
    private fun getTestWritableArray(): WritableArray = JavaOnlyArray.from(
        listOf(
            null,
            1,
            2.0f,
            3.0,
            "test",
            true
        )
    )

    private fun testWritableArray(array: WritableArray) {
        assertThat(array.getDynamic(0).isNull).isTrue()

        assertThat(array.getInt(1)).isInstanceOf(java.lang.Integer::class.java)
        assertThat(array.getInt(1)).isEqualTo(1)

        assertThat(array.getDouble(2)).isInstanceOf(java.lang.Double::class.java)
        assertThat(array.getDouble(2)).isEqualTo(2.0)

        assertThat(array.getDouble(3)).isInstanceOf(java.lang.Double::class.java)
        assertThat(array.getDouble(3)).isEqualTo(3.0)

        assertThat(array.getString(4)).isInstanceOf(java.lang.String::class.java)
        assertThat(array.getString(4)).isEqualTo("test")

        assertThat(array.getBoolean(5)).isInstanceOf(java.lang.Boolean::class.java)
        assertThat(array.getBoolean(5)).isTrue()
    }

    private fun testWritableMap(map: WritableMap) {
        assertThat(map.getDynamic("null").isNull).isTrue()

        assertThat(map.getInt("int")).isInstanceOf(java.lang.Integer::class.java)
        assertThat(map.getInt("int")).isEqualTo(1)

        assertThat(map.getDouble("long")).isInstanceOf(java.lang.Double::class.java)
        assertThat(map.getDouble("long")).isEqualTo(2.0)

        assertThat(map.getDouble("float")).isInstanceOf(java.lang.Double::class.java)
        assertThat(map.getDouble("float")).isEqualTo(3.0)

        assertThat(map.getDouble("double")).isInstanceOf(java.lang.Double::class.java)
        assertThat(map.getDouble("double")).isEqualTo(4.0)

        assertThat(map.getString("string")).isInstanceOf(java.lang.String::class.java)
        assertThat(map.getString("string")).isEqualTo("test")

        assertThat(map.getBoolean("boolean")).isInstanceOf(java.lang.Boolean::class.java)
        assertThat(map.getBoolean("boolean")).isTrue()
    }

    private fun testArray(array: List<*>) {
        val iterator = array.iterator()
        assertThat(iterator.next()).isNull()

        assertThat(iterator.next())
            .isInstanceOf(java.lang.Double::class.java)
            .isEqualTo(1.0)

        assertThat(iterator.next())
            .isInstanceOf(java.lang.Double::class.java)
            .isEqualTo(2.0)

        assertThat(iterator.next())
            .isInstanceOf(java.lang.Double::class.java)
            .isEqualTo(3.0)

        assertThat(iterator.next())
            .isInstanceOf(java.lang.String::class.java)
            .isEqualTo("test")

        assertThat(iterator.next())
            .isInstanceOf(java.lang.Boolean::class.java)
            .isEqualTo(true)
    }

    private fun testMap(map: Map<*, *>) {
        assertThat(map["null"]).isNull()

        assertThat(map["int"]).isInstanceOf(java.lang.Double::class.java)
        assertThat(map["int"]).isEqualTo(1.0)

        assertThat(map["long"]).isInstanceOf(java.lang.Double::class.java)
        assertThat(map["long"]).isEqualTo(2.0)

        assertThat(map["float"]).isInstanceOf(java.lang.Double::class.java)
        assertThat(map["float"]).isEqualTo(3.0)

        assertThat(map["double"]).isInstanceOf(java.lang.Double::class.java)
        assertThat(map["double"]).isEqualTo(4.0)

        assertThat(map["string"]).isInstanceOf(java.lang.String::class.java)
        assertThat(map["string"]).isEqualTo("test")

        assertThat(map["boolean"]).isInstanceOf(java.lang.Boolean::class.java)
        assertThat(map["boolean"] as Boolean).isTrue()
    }
}
