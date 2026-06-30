/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.api.storage.datastore.DataStoreHandler
import com.datadog.android.api.storage.datastore.DataStoreReadCallback
import com.datadog.android.api.storage.datastore.DataStoreWriteCallback
import com.datadog.android.core.internal.persistence.Deserializer
import com.datadog.android.core.persistence.Serializer
import com.datadog.android.core.persistence.datastore.DataStoreContent
import java.io.File
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.data.Offset
import org.json.JSONArray
import org.json.JSONObject
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir

internal class NativeFfeCoreTest {
    private val testedCore = NativeFfeCore()

    @Test
    fun `M parse and serialize configuration W canonical UFC configuration wire round trip`() {
        // When
        val configuration = testedCore.configurationFromString(flagsConfigurationWire)
        val serialized = testedCore.configurationToString(configuration.toMap())
        val embeddedUfcConfig = JSONObject(flagsConfigurationWire)
            .getJSONObject("server")
            .getString("response")

        // Then
        assertThat(configuration.kind).isEqualTo("rules")
        assertThat(configuration.etag).isEqualTo("ffe-system-test-data")
        assertThat(embeddedUfcConfig).isEqualTo(canonicalUfcConfig)
        assertThat(serialized).isEqualTo(flagsConfigurationWire)
    }

    @Test
    fun `M save and load configuration W native disk store`(@TempDir tempDir: File) {
        // Given
        val store = FileNativeFfeConfigurationStore(tempDir) { STORED_AT_MS }
        val configuration = testedCore.configurationFromString(flagsConfigurationWire)

        // When
        val saveState = testedCore.saveConfiguration(
            configuration.toMap(),
            mapOf("slot" to "default"),
            store,
        )
        val loadedConfiguration = testedCore.loadConfiguration(
            mapOf("slot" to "default"),
            store,
        )
        val activatedState = testedCore.setConfiguration(loadedConfiguration.toMap())

        // Then
        assertThat(testedCore.configurationToString(loadedConfiguration.toMap()))
            .isEqualTo(flagsConfigurationWire)
        assertThat(saveState)
            .containsEntry("configurationSaveCount", 1)
            .containsEntry("configurationLoadCount", 0)
            .doesNotContainKey("activeConfigurationKind")
        @Suppress("UNCHECKED_CAST")
        val lastSave = saveState["lastStorage"] as Map<String, Any?>
        assertThat(lastSave)
            .containsEntry("operation", "save")
            .containsEntry("status", "stored")
            .containsEntry("key", "flags-configuration-default")
            .containsEntry("updatedAtMs", STORED_AT_MS)
        assertThat(activatedState)
            .containsEntry("activeConfigurationKind", "rules")
            .containsEntry("configurationLoadCount", 1)
    }

    @Test
    fun `M save and load configuration W Datadog Flags data store`() {
        // Given
        val dataStore = FakeDataStoreHandler()
        val store = DatadogDataStoreNativeFfeConfigurationStore(
            dataStoreProvider = { dataStore },
            clockMs = { STORED_AT_MS },
        )
        val configuration = testedCore.configurationFromString(flagsConfigurationWire)

        // When
        val saveState = testedCore.saveConfiguration(
            configuration.toMap(),
            mapOf("slot" to "default"),
            store,
        )
        val loadedConfiguration = testedCore.loadConfiguration(
            mapOf("slot" to "default"),
            store,
        )

        // Then
        assertThat(testedCore.configurationToString(loadedConfiguration.toMap()))
            .isEqualTo(flagsConfigurationWire)
        @Suppress("UNCHECKED_CAST")
        val lastSave = saveState["lastStorage"] as Map<String, Any?>
        assertThat(lastSave)
            .containsEntry("operation", "save")
            .containsEntry("status", "stored")
            .containsEntry("key", "flags-configuration-default")
            .containsEntry("updatedAtMs", STORED_AT_MS)
        assertThat(dataStore.values).containsKey("flags-configuration-default")
    }

    @Test
    fun `M return static reason W canonical numeric flag case`() {
        // Given
        val evaluationCase = evaluationCase("test-case-numeric-flag.json")
        setConfiguration()
        setEvaluationContext(evaluationCase)

        // When
        val result = resolveEvaluation(evaluationCase)

        // Then
        assertEvaluationResult(result, evaluationCase)
        assertThat(result["variant"]).isEqualTo("pi")
        @Suppress("UNCHECKED_CAST")
        val metadata = result["flagMetadata"] as Map<String, Any?>
        assertThat(metadata)
            .containsEntry("__dd_allocation_key", "rollout")
            .containsEntry("__dd_do_log", true)
    }

    @Test
    fun `M return split reason W canonical sharded flag case`() {
        // Given
        val evaluationCase = evaluationCase("test-case-flag-with-empty-string.json", caseIndex = 1)
        setConfiguration()
        setEvaluationContext(evaluationCase)

        // When
        val result = resolveEvaluation(evaluationCase)

        // Then
        assertEvaluationResult(result, evaluationCase)
    }

    @Test
    fun `M return targeting match reason W canonical targeted flag case`() {
        // Given
        val evaluationCase = evaluationCase("test-case-flag-with-empty-string.json")
        setConfiguration()
        setEvaluationContext(evaluationCase)

        // When
        val result = resolveEvaluation(evaluationCase)

        // Then
        assertEvaluationResult(result, evaluationCase)
    }

    @Test
    fun `M return targeting key missing W canonical null targeting key case`() {
        // Given
        val evaluationCase = evaluationCase("test-case-null-targeting-key.json", caseIndex = 1)
        setConfiguration()
        setEvaluationContext(evaluationCase)

        // When
        val result = resolveEvaluation(evaluationCase)

        // Then
        assertEvaluationResult(result, evaluationCase)
        assertThat(result["errorCode"]).isEqualTo("TARGETING_KEY_MISSING")
    }

    @Test
    fun `M match shared evaluation corpus W canonical UFC rules configuration`() {
        // Given
        setConfiguration()
        val failures = mutableListOf<String>()

        evaluationCaseFileNames().forEach { fileName ->
            evaluationCases(fileName).forEach { evaluationCase ->
                try {
                    setEvaluationContext(evaluationCase)
                    val result = resolveEvaluation(evaluationCase)
                    evaluationMismatch(result, evaluationCase)?.let { failures += it }
                } catch (failure: AssertionError) {
                    failures += "${evaluationCase.source}: ${failure.message}"
                } catch (failure: Exception) {
                    failures += "${evaluationCase.source}: ${failure.message}"
                }
            }
        }

        // Then
        assertThat(failures).isEmpty()
    }

    private fun setConfiguration() {
        val configuration = testedCore.configurationFromString(flagsConfigurationWire)
        testedCore.setConfiguration(configuration.toMap())
    }

    private fun setEvaluationContext(evaluationCase: EvaluationCase) {
        testedCore.setEvaluationContext(
            mapOf(
                "targetingKey" to evaluationCase.targetingKey,
                "attributes" to evaluationCase.attributes,
            )
        )
    }

    private fun resolveEvaluation(evaluationCase: EvaluationCase): Map<String, Any?> {
        return when (evaluationCase.variationType) {
            "BOOLEAN" -> testedCore.resolveBooleanEvaluation(
                evaluationCase.flag,
                evaluationCase.defaultValue as Boolean,
            )
            "STRING" -> testedCore.resolveStringEvaluation(
                evaluationCase.flag,
                evaluationCase.defaultValue as String,
            )
            "INTEGER",
            "NUMERIC" -> testedCore.resolveNumberEvaluation(
                evaluationCase.flag,
                (evaluationCase.defaultValue as Number).toDouble(),
            )
            "JSON" -> {
                @Suppress("UNCHECKED_CAST")
                testedCore.resolveObjectEvaluation(
                    evaluationCase.flag,
                    evaluationCase.defaultValue as Map<String, Any?>,
                )
            }
            else -> error("Unsupported fixture variation type: ${evaluationCase.variationType}")
        }
    }

    private fun assertEvaluationResult(result: Map<String, Any?>, evaluationCase: EvaluationCase) {
        assertThat(result["flagKey"]).isEqualTo(evaluationCase.flag)
        assertThat(result["reason"]).isEqualTo(evaluationCase.expectedReason)
        assertJsonValue(result["value"], evaluationCase.expectedValue)
        if (evaluationCase.expectedErrorCode != null) {
            assertThat(result["errorCode"]).isEqualTo(evaluationCase.expectedErrorCode)
        }
    }

    private fun evaluationMismatch(result: Map<String, Any?>, evaluationCase: EvaluationCase): String? {
        if (result["flagKey"] != evaluationCase.flag) {
            return "${evaluationCase.source}: flagKey expected ${evaluationCase.flag}, got ${result["flagKey"]}"
        }
        if (result["reason"] != evaluationCase.expectedReason) {
            return "${evaluationCase.source}: reason expected ${evaluationCase.expectedReason}, got ${result["reason"]}"
        }
        if (!jsonValuesEqual(result["value"], evaluationCase.expectedValue)) {
            return "${evaluationCase.source}: value expected ${evaluationCase.expectedValue}, got ${result["value"]}"
        }
        if (evaluationCase.expectedErrorCode != null && result["errorCode"] != evaluationCase.expectedErrorCode) {
            return "${evaluationCase.source}: errorCode expected ${evaluationCase.expectedErrorCode}, got ${result["errorCode"]}"
        }
        return null
    }

    private fun assertJsonValue(actual: Any?, expected: Any?) {
        if (actual is Number && expected is Number) {
            assertThat(actual.toDouble()).isCloseTo(expected.toDouble(), Offset.offset(NUMERIC_TOLERANCE))
        } else {
            assertThat(jsonValuesEqual(actual, expected))
                .withFailMessage("Expected <%s>, got <%s>", expected, actual)
                .isTrue()
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun jsonValuesEqual(actual: Any?, expected: Any?): Boolean {
        if (actual == null || expected == null) {
            return actual == null && expected == null
        }
        if (actual is Number && expected is Number) {
            return kotlin.math.abs(actual.toDouble() - expected.toDouble()) <= NUMERIC_TOLERANCE
        }
        if (actual is List<*> && expected is List<*>) {
            return actual.size == expected.size &&
                actual.indices.all { jsonValuesEqual(actual[it], expected[it]) }
        }
        if (actual is Map<*, *> && expected is Map<*, *>) {
            val actualMap = actual as Map<String, Any?>
            val expectedMap = expected as Map<String, Any?>
            return actualMap.keys == expectedMap.keys &&
                actualMap.keys.all { jsonValuesEqual(actualMap[it], expectedMap[it]) }
        }
        return actual == expected
    }

    private fun evaluationCase(fileName: String, caseIndex: Int = 0): EvaluationCase {
        return evaluationCases(fileName)[caseIndex]
    }

    private fun evaluationCases(fileName: String): List<EvaluationCase> {
        val casesJson = JSONArray(readFixture("evaluation-cases/$fileName"))
        return (0 until casesJson.length()).map { caseIndex ->
            evaluationCase(fileName, caseIndex, casesJson.getJSONObject(caseIndex))
        }
    }

    private fun evaluationCase(
        fileName: String,
        caseIndex: Int,
        caseJson: JSONObject,
    ): EvaluationCase {
        val resultJson = caseJson.getJSONObject("result")
        return EvaluationCase(
            source = "$fileName[$caseIndex]",
            flag = caseJson.getString("flag"),
            variationType = caseJson.getString("variationType"),
            defaultValue = caseJson.get("defaultValue").toNativeFfeFixtureValue(),
            targetingKey = caseJson.optionalNativeFfeString("targetingKey"),
            attributes = (caseJson.optJSONObject("attributes") ?: JSONObject()).toNativeFfeFixtureMap(),
            expectedValue = resultJson.get("value").toNativeFfeFixtureValue(),
            expectedReason = resultJson.getString("reason"),
            expectedErrorCode = resultJson.optionalNativeFfeString("errorCode"),
        )
    }

    private fun evaluationCaseFileNames(): List<String> {
        return listNativeFfeFixtureFiles(javaClass, "ffe-system-test-data/evaluation-cases")
    }

    private fun readFixture(relativePath: String): String {
        return readNativeFfeFixture(javaClass, "ffe-system-test-data/$relativePath")
    }

    private data class EvaluationCase(
        val source: String,
        val flag: String,
        val variationType: String,
        val defaultValue: Any?,
        val targetingKey: String?,
        val attributes: Map<String, Any?>,
        val expectedValue: Any?,
        val expectedReason: String,
        val expectedErrorCode: String?,
    )

    private companion object {
        const val NUMERIC_TOLERANCE = 0.0000001
        const val STORED_AT_MS = 1780000000000L

        val flagsConfigurationWire: String by lazy {
            nativeFfeRulesConfigurationWire(canonicalUfcConfig)
        }

        val canonicalUfcConfig: String by lazy {
            readNativeFfeFixture(
                NativeFfeCoreTest::class.java,
                "ffe-system-test-data/ufc-config.json"
            )
        }
    }
}

private class FakeDataStoreHandler : DataStoreHandler {
    val values = mutableMapOf<String, Pair<Int, String>>()

    override fun <T : Any> setValue(
        key: String,
        data: T,
        version: Int,
        callback: DataStoreWriteCallback?,
        serializer: Serializer<T>,
    ) {
        values[key] = version to (serializer.serialize(data) ?: "")
        callback?.onSuccess()
    }

    override fun <T : Any> value(
        key: String,
        version: Int?,
        callback: DataStoreReadCallback<T>,
        deserializer: Deserializer<String, T>,
    ) {
        val stored = values[key] ?: return callback.onFailure()
        if (version != null && stored.first != version) {
            callback.onFailure()
            return
        }
        callback.onSuccess(
            DataStoreContent(
                stored.first,
                deserializer.deserialize(stored.second),
            )
        )
    }

    override fun removeValue(key: String, callback: DataStoreWriteCallback?) {
        values.remove(key)
        callback?.onSuccess()
    }

    override fun clearAllData() {
        values.clear()
    }
}
