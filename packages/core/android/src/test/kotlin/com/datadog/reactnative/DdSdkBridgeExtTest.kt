package com.datadog.reactnative

import com.datadog.tools.unit.forge.BaseConfigurator
import com.datadog.tools.unit.toReadableArray
import com.datadog.tools.unit.toReadableMap
import fr.xgouchet.elmyr.junit5.ForgeConfiguration
import fr.xgouchet.elmyr.junit5.ForgeExtension
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertDoesNotThrow
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.quality.Strictness


@Extensions(
        ExtendWith(MockitoExtension::class),
        ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
@ForgeConfiguration(value = BaseConfigurator::class)
internal class DdSdkBridgeExtTest {
    @Test
    fun `M call toKotlinHashMap W 1-level JavaOnlyMap`() {
        val readableMap = mapOf(
            "null" to null,
            "boolean" to true,
            "number" to 1.23,
            "string" to "test"
        ).toReadableMap()

        val hashMap = readableMap.toKotlinHashMap()

        assert(hashMap["null"] == null)
        assert(hashMap["boolean"] == true)
        assert(hashMap["number"] == 1.23)
        assert(hashMap["string"] == "test")
    }

    @Test
    fun `M call toKotlinHashMap W JavaOnlyMap with nested JavaOnlyMap`() {
        val readableMap = mapOf(
            "null" to null,
            "boolean" to true,
            "number" to 1.23,
            "string" to "test",
            "map" to mapOf(
                "test" to "test"
            ).toReadableMap()
        ).toReadableMap()

        val hashMap = readableMap.toKotlinHashMap()

        assert(hashMap["null"] == null)
        assert(hashMap["boolean"] == true)
        assert(hashMap["number"] == 1.23)
        assert(hashMap["string"] == "test")
        assert(hashMap["map"] is HashMap<*, *>)
        assert((hashMap["map"] as HashMap<*,*>)["test"] == "test")
    }

    @Test
    fun `M call toKotlinHashMap W JavaOnlyMap with nested JavaOnlyArray`() {
        val readableMap = mapOf(
                "null" to null,
                "boolean" to true,
                "number" to 1.23,
                "string" to "test",
                "array" to listOf(null, true, 1.23, "test").toReadableArray()
        ).toReadableMap()

        val hashMap = readableMap.toKotlinHashMap()

        assert(hashMap["null"] == null)
        assert(hashMap["boolean"] == true)
        assert(hashMap["number"] == 1.23)
        assert(hashMap["string"] == "test")

        val array = hashMap["array"] as ArrayList<*>
        assert(array[0] == null)
        assert(array[1] == true)
        assert(array[2] == 1.23)
        assert(array[3] == "test")
    }

    @Test
    fun `M call toKotlinHashMap W JavaOnlyMap with nested JavaOnlyMap and JavaOnlyArray`() {
        val readableMap = mapOf(
                "null" to null,
                "boolean" to true,
                "number" to 1.23,
                "string" to "test",
                "map" to mapOf(
                        "test" to "test"
                ).toReadableMap(),
                "array" to listOf(null, true, 1.23, "test").toReadableArray(),
        ).toReadableMap()

        val hashMap = readableMap.toKotlinHashMap()

        assert(hashMap["null"] == null)
        assert(hashMap["boolean"] == true)
        assert(hashMap["number"] == 1.23)
        assert(hashMap["string"] == "test")
        assert(hashMap["map"] is HashMap<*, *>)
        assert((hashMap["map"] as HashMap<*,*>)["test"] == "test")

        val array = hashMap["array"] as ArrayList<*>
        assert(array[0] == null)
        assert(array[1] == true)
        assert(array[2] == 1.23)
        assert(array[3] == "test")
    }

    @Test
    fun `M call toKotlinHashMap W JavaOnlyMap with multiple nested JavaOnlyMap and JavaOnlyArray`() {
        val readableMap = mapOf(
                "null" to null,
                "boolean" to true,
                "number" to 1.23,
                "string" to "test",
                "map1" to mapOf(
                        "test" to "test"
                ).toReadableMap(),
                "array1" to listOf(null, true, 1.23, "test").toReadableArray(),
                "map2" to mapOf(
                        "nested_map" to mapOf("test" to "test").toReadableMap(),
                        "nested_array" to listOf(null, true, 1.23, "test").toReadableArray()
                ).toReadableMap(),
                "array2" to listOf(
                    mapOf("test" to "test").toReadableMap(),
                    listOf(null, true, 1.23, "test").toReadableArray()
                ).toReadableArray()
        ).toReadableMap()

        val hashMap = readableMap.toKotlinHashMap()

        assert(hashMap["null"] == null)
        assert(hashMap["boolean"] == true)
        assert(hashMap["number"] == 1.23)
        assert(hashMap["string"] == "test")
        assert(hashMap["map1"] is HashMap<*, *>)
        assert((hashMap["map1"] as HashMap<*,*>)["test"] == "test")

        val array = hashMap["array1"] as ArrayList<*>
        assert(array[0] == null)
        assert(array[1] == true)
        assert(array[2] == 1.23)
        assert(array[3] == "test")

        val map2 = hashMap["map2"] as HashMap<*, *>
        assert((map2["nested_map"] as HashMap<*, *>)["test"] == "test")

        val nestedArray = map2["nested_array"] as ArrayList<*>
        assert(nestedArray[0] == null)
        assert(nestedArray[1] == true)
        assert(nestedArray[2] == 1.23)
        assert(nestedArray[3] == "test")
    }

    @Test
    fun `M call toKotlinArrayList W JavaOnlyArray with raw types`() {
        val readableArray = listOf(null, true, 1.23, "test").toReadableArray()
        val kotlinArray = readableArray.toKotlinArrayList()
        assert(kotlinArray[0] == null)
        assert(kotlinArray[1] == true)
        assert(kotlinArray[2] == 1.23)
        assert(kotlinArray[3] == "test")
    }

    @Test
    fun `M call toKotlinArrayList W JavaOnlyArray with nested objects`() {
        val readableArray = listOf(
            null,
            true,
            1.23,
            "test",
            mapOf("test" to "test").toReadableMap(),
            listOf(null, true, 1.23, "test").toReadableArray()
        ).toReadableArray()

        val kotlinArray = readableArray.toKotlinArrayList()
        assert(kotlinArray[0] == null)
        assert(kotlinArray[1] == true)
        assert(kotlinArray[2] == 1.23)
        assert(kotlinArray[3] == "test")
        assert((kotlinArray[4] as HashMap<*, *>)["test"] == "test")

        val nestedArray = kotlinArray[5] as ArrayList<*>
        assert(nestedArray[0] == null)
        assert(nestedArray[1] == true)
        assert(nestedArray[2] == 1.23)
        assert(nestedArray[3] == "test")
    }

    @Test
    fun `M call toKotlinHashMap W malformed ReadableMap`() {
        val readableMap = mapOf(
            "map" to mapOf("test" to "test") // NOT a ReadableMap
        ).toReadableMap()

        assertThrows<IllegalArgumentException> {
            readableMap.toKotlinHashMap()
        }
    }

    @Test
    fun `M call toKotlinArrayList W malformed ReadableArray`() {
        val readableArray = listOf(
            mapOf("test" to "test"), // NOT a ReadableMap
            listOf(null, true, 1.23, "test") // NOT a ReadableArray
        ).toReadableArray()

        assertThrows<IllegalArgumentException> {
            readableArray.toKotlinArrayList()
        }
    }

    @Test
    fun `M call toHashMapArrayList W valid readable array`() {
        val readableArray = listOf(
            mapOf("a1" to "a2").toReadableMap(),
            mapOf("b1" to "b2").toReadableMap(),
            mapOf("c1" to "c2").toReadableMap()
        ).toReadableArray()

        assertDoesNotThrow {
            val kotlinArray = readableArray.toHashMapArrayList()
            assert(kotlinArray.size == readableArray.size())
        }
    }

    @Test
    fun `M call toHashMapArrayList W malformed readable array`() {
        val readableArray = listOf(
            mapOf("a1" to "a2").toReadableMap(),
            listOf("test", 1, false).toReadableArray(),
            mapOf("c1" to "c2").toReadableMap()
        ).toReadableArray()

        assertThrows<TypeCastException> {
            readableArray.toHashMapArrayList()
        }
    }

    @Test
    fun `M call toHashMapArrayList W null values skips null`() {
        val readableArray = listOf(
            mapOf("a1" to "a2").toReadableMap(),
            null,
            mapOf("c1" to "c2").toReadableMap()
        ).toReadableArray()

        assertDoesNotThrow {
            val kotlinArray = readableArray.toHashMapArrayList()
            assert(kotlinArray.size == readableArray.size() - 1)
        }
    }

    @Test
    fun `M call toHashMapArrayList W empty readable array`() {
        val readableArray = listOf<Any>().toReadableArray()

        assertDoesNotThrow {
            val kotlinArray = readableArray.toHashMapArrayList()
            assert(kotlinArray.isEmpty())
        }
    }
}