/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import java.security.MessageDigest
import java.time.Instant
import org.json.JSONArray
import org.json.JSONObject

internal class NativeFfeCore {
    private var activeConfiguration: NativeFlagsConfiguration? = null
    private var currentContext: Map<String, Any?> = emptyMap()
    private var status: String = STATUS_NOT_READY
    private var configurationSetCount: Int = 0
    private var fetchCount: Int = 0
    private var evaluationCount: Int = 0
    private var lastEvent: String? = null
    private var lastError: String? = null

    fun configurationFromString(wire: String): NativeFlagsConfiguration {
        val wireJson = JSONObject(wire)
        val version = wireJson.optInt("version")
        require(version == SUPPORTED_WIRE_VERSION) { "Unsupported ConfigurationWire version: $version" }

        val server = wireJson.optJSONObject("server")
        val precomputed = wireJson.optJSONObject("precomputed")
        require(server != null || precomputed != null) { "ConfigurationWire must include server or precomputed config" }

        val serverResponse = server?.getString("response")?.let { JSONObject(it) }
        val precomputedResponse = precomputed?.getString("response")?.let { JSONObject(it) }
        val kind = when {
            server != null && precomputed != null -> KIND_MIXED
            server != null -> KIND_RULES
            else -> KIND_PRECOMPUTED
        }
        val etag = server?.optString("etag")?.takeIf { it.isNotBlank() }
            ?: precomputed?.optString("etag")?.takeIf { it.isNotBlank() }

        return NativeFlagsConfiguration(
            wire = wire,
            version = version,
            kind = kind,
            etag = etag,
            serverResponse = serverResponse,
            precomputedResponse = precomputedResponse,
        )
    }

    fun configurationToString(configuration: Map<String, Any?>): String {
        return configuration[KEY_WIRE] as? String
            ?: throw IllegalArgumentException("FlagsConfiguration is missing wire")
    }

    fun setConfiguration(configuration: Map<String, Any?>): Map<String, Any?> {
        return try {
            val parsed = configurationFromString(configurationToString(configuration))
            val firstConfiguration = activeConfiguration == null
            activeConfiguration = parsed
            configurationSetCount += 1
            status = STATUS_READY
            lastError = null
            lastEvent = if (firstConfiguration) EVENT_PROVIDER_READY else EVENT_CONFIGURATION_CHANGED
            debugState()
        } catch (error: Exception) {
            status = if (activeConfiguration == null) STATUS_ERROR else STATUS_STALE
            lastError = error.message
            lastEvent = EVENT_PROVIDER_ERROR
            debugState()
        }
    }

    fun setEvaluationContext(context: Map<String, Any?>): Map<String, Any?> {
        currentContext = context
        return debugState()
    }

    fun resolveBooleanEvaluation(flagKey: String, defaultValue: Boolean): Map<String, Any?> {
        return resolveEvaluation(flagKey, defaultValue, EXPECTED_BOOLEAN)
    }

    fun resolveStringEvaluation(flagKey: String, defaultValue: String): Map<String, Any?> {
        return resolveEvaluation(flagKey, defaultValue, EXPECTED_STRING)
    }

    fun resolveNumberEvaluation(flagKey: String, defaultValue: Double): Map<String, Any?> {
        return resolveEvaluation(flagKey, defaultValue, EXPECTED_NUMBER)
    }

    fun resolveObjectEvaluation(flagKey: String, defaultValue: Map<String, Any?>): Map<String, Any?> {
        return resolveEvaluation(flagKey, defaultValue, EXPECTED_OBJECT)
    }

    fun debugState(): Map<String, Any?> {
        val configuration = activeConfiguration
        return mapOf(
            "status" to status,
            "activeConfigurationKind" to configuration?.kind,
            "activeEtag" to configuration?.etag,
            "currentContext" to currentContext,
            "configurationSetCount" to configurationSetCount,
            "fetchCount" to fetchCount,
            "evaluationCount" to evaluationCount,
            "lastEvent" to lastEvent,
            "lastError" to lastError,
        ).filterValues { it != null }
    }

    fun evaluationContext(): Map<String, Any?> = currentContext.toMap()

    private fun resolveEvaluation(
        flagKey: String,
        defaultValue: Any?,
        expectedType: String,
    ): Map<String, Any?> {
        evaluationCount += 1
        val configuration = activeConfiguration
            ?: return defaultResult(flagKey, defaultValue, "ERROR", "PROVIDER_NOT_READY")
        val flags = configuration.serverResponse?.flagsObject()
            ?: return defaultResult(flagKey, defaultValue, "ERROR", "PROVIDER_NOT_READY")
        val flag = flags.optJSONObject(flagKey)
            ?: return defaultResult(flagKey, defaultValue, "ERROR", "FLAG_NOT_FOUND")

        if (!flag.optBoolean("enabled", false)) {
            return defaultResult(flagKey, defaultValue, "DISABLED", null)
        }
        if (!typeMatches(expectedType, flag.optString("variationType"))) {
            return defaultResult(flagKey, defaultValue, "ERROR", "TYPE_MISMATCH")
        }

        val subjectAttributes = subjectAttributes()
        val targetingKey = currentContext["targetingKey"]?.toString()
        val allocations = flag.optJSONArray("allocations")
        val variations = flag.optJSONObject("variations") ?: JSONObject()

        for (index in 0 until (allocations?.length() ?: 0)) {
            val allocation = allocations?.optJSONObject(index) ?: continue
            if (!allocationIsActive(allocation)) {
                continue
            }
            if (!rulesMatch(allocation.optJSONArray("rules"), subjectAttributes)) {
                continue
            }
            val split = try {
                firstMatchingSplit(allocation.optJSONArray("splits"), targetingKey)
            } catch (_: TargetingKeyMissingException) {
                return defaultResult(flagKey, defaultValue, "ERROR", "TARGETING_KEY_MISSING")
            } ?: continue
            val variationKey = split.optString("variationKey")
            val variation = variations.optJSONObject(variationKey) ?: continue
            val value = variation.get("value").toBridgeValue()
            val reason = evaluationReason(allocation.optJSONArray("rules"), split)
            val extraLogging = split.optJSONObject("extraLogging")
                ?: allocation.optJSONObject("extraLogging")
                ?: JSONObject()

            return mapOf(
                "flagKey" to flagKey,
                "value" to value,
                "variant" to variation.optString("key", variationKey),
                "reason" to reason,
                "flagMetadata" to mapOf(
                    "__dd_allocation_key" to allocation.optString("key"),
                    "__dd_do_log" to allocation.optBoolean("doLog", false),
                    "__dd_split_serial_id" to split.optionalInt("serialId"),
                    "allocationKey" to allocation.optString("key"),
                    "doLog" to allocation.optBoolean("doLog", false),
                    "extraLogging" to extraLogging.toMap(),
                    "configurationKind" to configuration.kind,
                    "configurationEtag" to configuration.etag,
                    "splitSerialId" to split.optionalInt("serialId"),
                    "variationType" to expectedType,
                ).filterValues { it != null },
            )
        }

        return defaultResult(flagKey, defaultValue, "DEFAULT", null)
    }

    private fun defaultResult(
        flagKey: String,
        defaultValue: Any?,
        reason: String,
        errorCode: String?,
    ): Map<String, Any?> {
        return mapOf(
            "flagKey" to flagKey,
            "value" to defaultValue,
            "reason" to reason,
            "errorCode" to errorCode,
        ).filterValues { it != null }
    }

    private fun JSONObject.flagsObject(): JSONObject? {
        return optJSONObject("flags")
            ?: optJSONObject("data")
                ?.optJSONObject("attributes")
                ?.optJSONObject("flags")
    }

    private fun typeMatches(expectedType: String, variationType: String): Boolean {
        return when (expectedType) {
            EXPECTED_BOOLEAN -> variationType == "BOOLEAN"
            EXPECTED_STRING -> variationType == "STRING"
            EXPECTED_NUMBER -> variationType == "INTEGER" || variationType == "NUMERIC"
            EXPECTED_OBJECT -> variationType == "JSON"
            else -> false
        }
    }

    private fun subjectAttributes(): Map<String, Any?> {
        val attributes = mutableMapOf<String, Any?>()
        currentContext["targetingKey"]?.let { attributes["id"] = it }
        @Suppress("UNCHECKED_CAST")
        (currentContext["attributes"] as? Map<String, Any?>)?.let {
            attributes.putAll(it)
        }
        return attributes
    }

    private fun allocationIsActive(allocation: JSONObject): Boolean {
        val now = Instant.now()
        val startAt = allocation.optString("startAt").takeIf { it.isNotBlank() }
        val endAt = allocation.optString("endAt").takeIf { it.isNotBlank() }
        return try {
            val afterStart = startAt == null || !now.isBefore(Instant.parse(startAt))
            val beforeEnd = endAt == null || now.isBefore(Instant.parse(endAt))
            afterStart && beforeEnd
        } catch (_: Exception) {
            false
        }
    }

    private fun rulesMatch(rules: JSONArray?, subjectAttributes: Map<String, Any?>): Boolean {
        if (rules == null || rules.length() == 0) {
            return true
        }
        for (index in 0 until rules.length()) {
            val rule = rules.optJSONObject(index) ?: continue
            val conditions = rule.optJSONArray("conditions") ?: JSONArray()
            var allMatch = true
            for (conditionIndex in 0 until conditions.length()) {
                val condition = conditions.optJSONObject(conditionIndex) ?: continue
                if (!conditionMatches(condition, subjectAttributes)) {
                    allMatch = false
                    break
                }
            }
            if (allMatch) {
                return true
            }
        }
        return false
    }

    private fun conditionMatches(condition: JSONObject, subjectAttributes: Map<String, Any?>): Boolean {
        val attribute = condition.optString("attribute")
        val value = subjectAttributes[attribute]
        return when (condition.optString("operator")) {
            "IS_NULL" -> {
                val expectsNull = condition.optBoolean("value")
                if (expectsNull) value == null else value != null
            }
            "MATCHES" -> value?.toString()?.let { Regex(condition.optString("value")).containsMatchIn(it) } ?: false
            "NOT_MATCHES" -> value?.toString()?.let { !Regex(condition.optString("value")).containsMatchIn(it) } ?: false
            "ONE_OF" -> value?.toString()?.let { condition.optJSONArray("value")?.containsString(it) } ?: false
            "NOT_ONE_OF" -> value?.toString()?.let { condition.optJSONArray("value")?.containsString(it) == false } ?: false
            "GTE" -> value.asDouble()?.let { it >= condition.optDouble("value") } ?: false
            "GT" -> value.asDouble()?.let { it > condition.optDouble("value") } ?: false
            "LTE" -> value.asDouble()?.let { it <= condition.optDouble("value") } ?: false
            "LT" -> value.asDouble()?.let { it < condition.optDouble("value") } ?: false
            else -> false
        }
    }

    private fun firstMatchingSplit(splits: JSONArray?, targetingKey: String?): JSONObject? {
        if (splits == null) {
            return null
        }
        for (index in 0 until splits.length()) {
            val split = splits.optJSONObject(index) ?: continue
            val shards = split.optJSONArray("shards")
            if (shards == null || shards.length() == 0) {
                return split
            }
            if (targetingKey == null) {
                throw TargetingKeyMissingException()
            }
            if (shardsMatch(shards, targetingKey)) {
                return split
            }
        }
        return null
    }

    private fun evaluationReason(rules: JSONArray?, split: JSONObject): String {
        if (rules != null && rules.length() > 0) {
            return "TARGETING_MATCH"
        }
        val shards = split.optJSONArray("shards")
        return if (shards != null && shards.length() > 0) {
            "SPLIT"
        } else {
            "STATIC"
        }
    }

    private fun shardsMatch(shards: JSONArray, targetingKey: String): Boolean {
        for (index in 0 until shards.length()) {
            val shard = shards.optJSONObject(index) ?: return false
            val assignedShard = assignedShard(shard.optString("salt"), targetingKey, shard.optInt("totalShards"))
            val ranges = shard.optJSONArray("ranges") ?: return false
            var inAnyRange = false
            for (rangeIndex in 0 until ranges.length()) {
                val range = ranges.optJSONObject(rangeIndex) ?: continue
                if (assignedShard >= range.optInt("start") && assignedShard < range.optInt("end")) {
                    inAnyRange = true
                    break
                }
            }
            if (!inAnyRange) {
                return false
            }
        }
        return true
    }

    private fun assignedShard(salt: String, targetingKey: String, totalShards: Int): Int {
        if (totalShards <= 0) {
            return -1
        }
        val digest = MessageDigest.getInstance("MD5").digest("$salt-$targetingKey".toByteArray())
        val firstFourBytes =
            ((digest[0].toLong() and BYTE_MASK) shl 24) or
                ((digest[1].toLong() and BYTE_MASK) shl 16) or
                ((digest[2].toLong() and BYTE_MASK) shl 8) or
                (digest[3].toLong() and BYTE_MASK)
        return (firstFourBytes % totalShards).toInt()
    }

    data class NativeFlagsConfiguration(
        val wire: String,
        val version: Int,
        val kind: String,
        val etag: String?,
        val serverResponse: JSONObject?,
        val precomputedResponse: JSONObject?,
    ) {
        fun toMap(): Map<String, Any?> {
            return mapOf(
                "__ddNativeFfeConfiguration" to true,
                KEY_WIRE to wire,
                "version" to version,
                "kind" to kind,
                "etag" to etag,
            ).filterValues { it != null }
        }
    }

    private fun JSONArray.containsString(expected: String): Boolean {
        for (index in 0 until length()) {
            if (opt(index)?.toString() == expected) {
                return true
            }
        }
        return false
    }

    private fun JSONObject.optionalInt(key: String): Int? {
        if (!has(key) || isNull(key)) {
            return null
        }
        return optInt(key)
    }

    private fun Any?.asDouble(): Double? {
        return when (this) {
            is Number -> toDouble()
            is String -> toDoubleOrNull()
            else -> null
        }
    }

    private fun Any?.toBridgeValue(): Any? {
        return when (this) {
            JSONObject.NULL -> null
            is JSONObject -> toMap()
            is JSONArray -> toList()
            else -> this
        }
    }

    private class TargetingKeyMissingException : Exception()

    private companion object {
        const val SUPPORTED_WIRE_VERSION = 2
        const val KEY_WIRE = "wire"
        const val KIND_PRECOMPUTED = "precomputed"
        const val KIND_RULES = "rules"
        const val KIND_MIXED = "mixed"
        const val STATUS_NOT_READY = "not_ready"
        const val STATUS_READY = "ready"
        const val STATUS_STALE = "stale"
        const val STATUS_ERROR = "error"
        const val EVENT_PROVIDER_READY = "provider_ready"
        const val EVENT_CONFIGURATION_CHANGED = "configuration_changed"
        const val EVENT_PROVIDER_ERROR = "provider_error"
        const val EXPECTED_BOOLEAN = "boolean"
        const val EXPECTED_STRING = "string"
        const val EXPECTED_NUMBER = "number"
        const val EXPECTED_OBJECT = "object"
        const val BYTE_MASK = 0xffL
    }
}
