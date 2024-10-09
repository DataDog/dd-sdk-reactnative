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
        assertThat(map).isEqualTo(writableMap.toHashMap())
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
        assertThat(map).hasSameSizeAs(writableMap.keys())
        testMap(map)

        val nestedMap = map["map"]
        assertThat(nestedMap).isNotNull()
        assertThat(nestedMap).isInstanceOf(Map::class.java)
        assertThat((nestedMap as Map<*, *>)).hasSameSizeAs(nestedTestMap.keys())
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
        assertThat(map).hasSameSizeAs(writableMap.keys())
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
        assertThat((map as Map<*, *>)).hasSameSizeAs(writableMap.keys())
        testMap(map)

        val nestedMap = map["map"]
        assertThat((nestedMap as Map<*, *>)).hasSameSizeAs(nestedTestMap.keys())
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
        assertThat((nestedMap as Map<*, *>)).hasSameSizeAs(nestedTestMap.keys())
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
