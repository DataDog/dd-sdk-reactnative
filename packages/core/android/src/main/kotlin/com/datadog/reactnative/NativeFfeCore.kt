/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

@file:Suppress(
    "ComplexCondition",
    "CyclomaticComplexMethod",
    "LabeledExpression",
    "StringLiteralDuplication",
    "TooGenericExceptionCaught",
    "TooManyFunctions"
)

package com.datadog.reactnative

import java.security.MessageDigest
import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import org.json.JSONArray
import org.json.JSONObject

internal class NativeFfeCore {
    private var activeConfiguration: NativeFlagsConfiguration? = null
    private var currentContext: Map<String, Any?> = emptyMap()
    private var status: String = STATUS_NOT_READY
    private var configurationSetCount: Int = 0
    private var configurationSaveCount: Int = 0
    private var configurationLoadCount: Int = 0
    private var fetchCount: Int = 0
    private var evaluationCount: Int = 0
    private var lastEvent: String? = null
    private var lastFetchRequest: Map<String, Any?>? = null
    private var lastStorage: Map<String, Any?>? = null
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
            serverFlags = serverResponse?.flagsObject()?.toNativeFlags(),
        )
    }

    fun configurationToString(configuration: Map<String, Any?>): String {
        return configuration[KEY_WIRE] as? String
            ?: throw IllegalArgumentException("FlagsConfiguration is missing wire")
    }

    fun fetchConfiguration(
        kind: String,
        options: Map<String, Any?>,
        fetcher: NativeFfeConfigurationFetcher,
    ): NativeFlagsConfiguration {
        fetchCount += 1
        return try {
            val fetched = fetcher.fetch(kind, options)
            lastFetchRequest = fetched.request.toDebugMap(fetched.statusCode)
            lastError = null
            configurationFromString(fetched.wire)
        } catch (error: NativeFfeConfigurationFetchException) {
            lastFetchRequest = error.request.toDebugMap()
            markProviderError(error)
            throw error
        } catch (error: Exception) {
            markProviderError(error)
            throw error
        }
    }

    fun saveConfiguration(
        configuration: Map<String, Any?>,
        options: Map<String, Any?>,
        store: NativeFfeConfigurationStore,
    ): Map<String, Any?> {
        configurationSaveCount += 1
        return try {
            val wire = configurationToString(configuration)
            val stored = store.save(options.toStorageSlot(), wire)
            lastStorage = stored.toDebugMap(OPERATION_SAVE)
            lastError = null
            debugState()
        } catch (error: Exception) {
            lastStorage = mapOf(
                "operation" to OPERATION_SAVE,
                "status" to STATUS_FAILED,
            )
            markProviderError(error)
            throw error
        }
    }

    fun loadConfiguration(
        options: Map<String, Any?>,
        store: NativeFfeConfigurationStore,
    ): NativeFlagsConfiguration {
        configurationLoadCount += 1
        return try {
            val stored = store.load(options.toStorageSlot())
                ?: throw IllegalStateException("No stored flags configuration for slot '${options.toStorageSlot()}'")
            lastStorage = stored.toDebugMap(OPERATION_LOAD)
            lastError = null
            configurationFromString(stored.wire)
        } catch (error: Exception) {
            lastStorage = mapOf(
                "operation" to OPERATION_LOAD,
                "status" to STATUS_FAILED,
            )
            markProviderError(error)
            throw error
        }
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
            "configurationSaveCount" to configurationSaveCount,
            "configurationLoadCount" to configurationLoadCount,
            "fetchCount" to fetchCount,
            "evaluationCount" to evaluationCount,
            "lastEvent" to lastEvent,
            "lastFetchRequest" to lastFetchRequest,
            "lastStorage" to lastStorage,
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
        val flags = configuration.serverFlags
            ?: return defaultResult(flagKey, defaultValue, "ERROR", "PROVIDER_NOT_READY")
        val flag = flags[flagKey]
            ?: return defaultResult(flagKey, defaultValue, "ERROR", "FLAG_NOT_FOUND")

        if (!flag.enabled) {
            return defaultResult(flagKey, defaultValue, "DISABLED", null)
        }
        if (!typeMatches(expectedType, flag.variationType)) {
            return defaultResult(flagKey, defaultValue, "ERROR", "TYPE_MISMATCH")
        }
        if (flag.unsupported) {
            return defaultResult(flagKey, defaultValue, "DEFAULT", null)
        }

        val subjectAttributes = subjectAttributes()
        val targetingKey = currentContext["targetingKey"]?.toString()

        for (allocation in flag.allocations) {
            if (!allocation.isActive()) {
                continue
            }
            if (!rulesMatch(allocation.rules, subjectAttributes)) {
                continue
            }
            val split = try {
                firstMatchingSplit(allocation.splits, targetingKey)
            } catch (_: TargetingKeyMissingException) {
                return defaultResult(flagKey, defaultValue, "ERROR", "TARGETING_KEY_MISSING")
            } ?: continue
            val variation = flag.variations[split.variationKey] ?: continue
            val reason = evaluationReason(allocation, split)
            val extraLogging = split.extraLogging ?: allocation.extraLogging ?: emptyMap<String, Any?>()

            return mapOf(
                "flagKey" to flagKey,
                "value" to variation.value,
                "variant" to variation.key,
                "reason" to reason,
                "flagMetadata" to mapOf(
                    "__dd_allocation_key" to allocation.key,
                    "__dd_do_log" to allocation.doLog,
                    "__dd_split_serial_id" to split.serialId,
                    "allocationKey" to allocation.key,
                    "doLog" to allocation.doLog,
                    "extraLogging" to extraLogging,
                    "configurationKind" to configuration.kind,
                    "configurationEtag" to configuration.etag,
                    "splitSerialId" to split.serialId,
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

    private fun NativeAllocation.isActive(): Boolean {
        val nowMs = System.currentTimeMillis()
        return !hasInvalidDate &&
            (startAtMs == null || nowMs >= startAtMs) &&
            (endAtMs == null || nowMs < endAtMs)
    }

    private fun rulesMatch(rules: List<NativeRule>, subjectAttributes: Map<String, Any?>): Boolean {
        if (rules.isEmpty()) {
            return true
        }
        for (rule in rules) {
            if (rule.conditions.all { conditionMatches(it, subjectAttributes) }) {
                return true
            }
        }
        return false
    }

    private fun conditionMatches(condition: NativeCondition, subjectAttributes: Map<String, Any?>): Boolean {
        val attribute = condition.attribute
        val value = subjectAttributes[attribute]
        return when (condition.operator) {
            "IS_NULL" -> {
                val expectsNull = condition.value as? Boolean ?: false
                if (expectsNull) value == null else value != null
            }
            "MATCHES" -> regexMatches(condition.value.toString(), value?.toString())
            "NOT_MATCHES" -> value?.toString()?.let { !regexMatches(condition.value.toString(), it) } ?: false
            "ONE_OF" -> condition.value.containsComparableValue(value)
            "NOT_ONE_OF" -> value != null && !condition.value.containsComparableValue(value)
            "GTE" -> value.asDouble()?.let { it >= (condition.value.asDouble() ?: 0.0) } ?: false
            "GT" -> value.asDouble()?.let { it > (condition.value.asDouble() ?: 0.0) } ?: false
            "LTE" -> value.asDouble()?.let { it <= (condition.value.asDouble() ?: 0.0) } ?: false
            "LT" -> value.asDouble()?.let { it < (condition.value.asDouble() ?: 0.0) } ?: false
            else -> false
        }
    }

    private fun firstMatchingSplit(splits: List<NativeSplit>, targetingKey: String?): NativeSplit? {
        for (split in splits) {
            if (split.shards.isEmpty()) {
                return split
            }
            if (targetingKey == null) {
                throw TargetingKeyMissingException()
            }
            if (shardsMatch(split.shards, targetingKey)) {
                return split
            }
        }
        return null
    }

    private fun evaluationReason(allocation: NativeAllocation, split: NativeSplit): String {
        if (allocation.rules.isNotEmpty()) {
            return "TARGETING_MATCH"
        }
        if (allocation.startAtMs != null || allocation.endAtMs != null) {
            return "DEFAULT"
        }
        return if (split.shards.isNotEmpty()) {
            "SPLIT"
        } else {
            "STATIC"
        }
    }

    private fun shardsMatch(shards: List<NativeShard>, targetingKey: String): Boolean {
        for (shard in shards) {
            val totalShards = shard.totalShards
            val assignedShard = assignedShard(shard.salt, targetingKey, totalShards)
            var inAnyRange = false
            for (range in shard.ranges) {
                val start = range.start
                val end = range.end
                if (assignedShard >= start && assignedShard < end) {
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

    private fun assignedShard(salt: String, targetingKey: String, totalShards: Long): Long {
        if (totalShards <= 0) {
            return -1
        }
        val digest = MessageDigest.getInstance("MD5").digest("$salt-$targetingKey".toByteArray())
        val firstFourBytes =
            ((digest[0].toLong() and BYTE_MASK) shl 24) or
                ((digest[1].toLong() and BYTE_MASK) shl 16) or
                ((digest[2].toLong() and BYTE_MASK) shl 8) or
                (digest[3].toLong() and BYTE_MASK)
        return firstFourBytes % totalShards
    }

    private fun regexMatches(pattern: String, value: String?): Boolean {
        if (value == null) {
            return false
        }
        return try {
            Regex(pattern.toJavaRegexPattern()).containsMatchIn(value)
        } catch (_: Exception) {
            false
        }
    }

    private fun String.toJavaRegexPattern(): String {
        return replace("[:alnum:]", "\\p{Alnum}")
    }

    private fun markProviderError(error: Exception) {
        status = if (activeConfiguration == null) STATUS_ERROR else STATUS_STALE
        lastError = error.message
        lastEvent = EVENT_PROVIDER_ERROR
    }

    private fun Map<String, Any?>.toStorageSlot(): String {
        return (this["slot"] as? String)
            ?: (this["clientName"] as? String)
            ?: DEFAULT_STORAGE_SLOT
    }

    private fun NativeFfeStoredConfiguration.toDebugMap(operation: String): Map<String, Any?> {
        return mapOf(
            "operation" to operation,
            "status" to STATUS_STORED,
            "key" to key,
            "updatedAtMs" to updatedAtMs,
            "wireBytes" to wire.toByteArray(Charsets.UTF_8).size,
        )
    }

    data class NativeFlagsConfiguration(
        val wire: String,
        val version: Int,
        val kind: String,
        val etag: String?,
        val serverResponse: JSONObject?,
        val precomputedResponse: JSONObject?,
        val serverFlags: Map<String, NativeFlag>?,
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

    data class NativeFlag(
        val key: String,
        val enabled: Boolean,
        val variationType: String,
        val variations: Map<String, NativeVariation>,
        val allocations: List<NativeAllocation>,
        val unsupported: Boolean,
    )

    data class NativeVariation(
        val key: String,
        val value: Any?,
    )

    data class NativeAllocation(
        val key: String?,
        val rules: List<NativeRule>,
        val splits: List<NativeSplit>,
        val doLog: Boolean,
        val extraLogging: Map<String, Any?>?,
        val startAtMs: Long?,
        val endAtMs: Long?,
        val hasInvalidDate: Boolean,
    )

    data class NativeRule(
        val conditions: List<NativeCondition>,
    )

    data class NativeCondition(
        val attribute: String,
        val operator: String,
        val value: Any?,
    )

    data class NativeSplit(
        val variationKey: String,
        val shards: List<NativeShard>,
        val serialId: Int?,
        val extraLogging: Map<String, Any?>?,
    )

    data class NativeShard(
        val salt: String,
        val totalShards: Long,
        val ranges: List<NativeShardRange>,
    )

    data class NativeShardRange(
        val start: Long,
        val end: Long,
    )

    private fun JSONObject.toNativeFlags(): Map<String, NativeFlag> {
        return keys().asSequence().mapNotNull { key ->
            optJSONObject(key)?.toNativeFlag(key)?.let { key to it }
        }.toMap()
    }

    private fun JSONObject.toNativeFlag(fallbackKey: String): NativeFlag {
        val variations = optJSONObject("variations")?.toNativeVariations() ?: emptyMap()
        val allocationsValue = opt("allocations")
        val allocations = optJSONArray("allocations")?.toNativeAllocations() ?: emptyList()
        val unsupported = allocationsValue != null && allocationsValue !is JSONArray ||
            allocations.any { allocation -> allocation.rules.any { rule -> rule.hasUnsupportedOperator() } }
        return NativeFlag(
            key = optString("key").takeIf { it.isNotBlank() } ?: fallbackKey,
            enabled = optBoolean("enabled", false),
            variationType = optString("variationType"),
            variations = variations,
            allocations = allocations,
            unsupported = unsupported,
        )
    }

    private fun JSONObject.toNativeVariations(): Map<String, NativeVariation> {
        return keys().asSequence().mapNotNull { key ->
            val variation = optJSONObject(key) ?: return@mapNotNull null
            key to NativeVariation(
                key = variation.optString("key").takeIf { it.isNotBlank() } ?: key,
                value = variation.opt("value").toBridgeValue(),
            )
        }.toMap()
    }

    private fun JSONArray.toNativeAllocations(): List<NativeAllocation> {
        return (0 until length()).mapNotNull { index -> optJSONObject(index)?.toNativeAllocation() }
    }

    private fun JSONObject.toNativeAllocation(): NativeAllocation {
        val startAt = optString("startAt").takeIf { it.isNotBlank() }
        val endAt = optString("endAt").takeIf { it.isNotBlank() }
        val parsedStartAt = startAt?.toEpochMillisOrNull()
        val parsedEndAt = endAt?.toEpochMillisOrNull()
        return NativeAllocation(
            key = optString("key").takeIf { it.isNotBlank() },
            rules = optJSONArray("rules")?.toNativeRules() ?: emptyList(),
            splits = optJSONArray("splits")?.toNativeSplits() ?: emptyList(),
            doLog = optBoolean("doLog", false),
            extraLogging = optJSONObject("extraLogging")?.toMap(),
            startAtMs = parsedStartAt,
            endAtMs = parsedEndAt,
            hasInvalidDate = (startAt != null && parsedStartAt == null) || (endAt != null && parsedEndAt == null),
        )
    }

    private fun JSONArray.toNativeRules(): List<NativeRule> {
        return (0 until length()).mapNotNull { index -> optJSONObject(index)?.toNativeRule() }
    }

    private fun JSONObject.toNativeRule(): NativeRule {
        return NativeRule(
            conditions = optJSONArray("conditions")?.toNativeConditions() ?: emptyList(),
        )
    }

    private fun JSONArray.toNativeConditions(): List<NativeCondition> {
        return (0 until length()).mapNotNull { index -> optJSONObject(index)?.toNativeCondition() }
    }

    private fun JSONObject.toNativeCondition(): NativeCondition? {
        val operator = optString("operator")
        return NativeCondition(
            attribute = optString("attribute"),
            operator = operator,
            value = opt("value").toBridgeValue(),
        )
    }

    private fun NativeRule.hasUnsupportedOperator(): Boolean {
        return conditions.any { it.operator !in KNOWN_CONDITION_OPERATORS }
    }

    private fun JSONArray.toNativeSplits(): List<NativeSplit> {
        return (0 until length()).mapNotNull { index -> optJSONObject(index)?.toNativeSplit() }
    }

    private fun JSONObject.toNativeSplit(): NativeSplit? {
        val shards = optJSONArray("shards") ?: return null
        val nativeShards = shards.toNativeShards() ?: return null
        return NativeSplit(
            variationKey = optString("variationKey"),
            shards = nativeShards,
            serialId = optionalInt("serialId"),
            extraLogging = optJSONObject("extraLogging")?.toMap(),
        )
    }

    private fun JSONArray.toNativeShards(): List<NativeShard>? {
        return (0 until length()).map { index ->
            optJSONObject(index)?.toNativeShard() ?: return null
        }
    }

    private fun JSONObject.toNativeShard(): NativeShard? {
        val totalShards = optionalLong("totalShards") ?: return null
        if (totalShards <= 0 || totalShards > MAX_UNSIGNED_INT) {
            return null
        }
        val ranges = optJSONArray("ranges")?.toNativeShardRanges(totalShards) ?: return null
        return NativeShard(
            salt = optString("salt"),
            totalShards = totalShards,
            ranges = ranges,
        )
    }

    private fun JSONArray.toNativeShardRanges(totalShards: Long): List<NativeShardRange>? {
        return (0 until length()).map { index ->
            val range = optJSONObject(index) ?: return null
            val start = range.optionalLong("start") ?: return null
            val end = range.optionalLong("end") ?: return null
            if (start < 0 || end < 0 || start >= end || end > totalShards) {
                return null
            }
            NativeShardRange(start, end)
        }
    }

    private fun String.toEpochMillisOrNull(): Long? {
        val normalizedValue = normalizedIsoTimestamp() ?: return null
        return try {
            isoDateFormatter().parse(normalizedValue)?.time
        } catch (_: ParseException) {
            null
        }
    }

    private fun String.normalizedIsoTimestamp(): String? {
        if (!endsWith("Z")) {
            return null
        }

        val withoutZone = dropLast(1)
        val fractionStart = withoutZone.indexOf('.')
        if (fractionStart < 0) {
            return "${withoutZone}.000Z"
        }

        val timestampPrefix = withoutZone.substring(0, fractionStart)
        val fraction = withoutZone.substring(fractionStart + 1)
        if (fraction.isEmpty() || fraction.any { !it.isDigit() }) {
            return null
        }

        return "$timestampPrefix.${fraction.padEnd(ISO_MILLIS_LENGTH, '0').take(ISO_MILLIS_LENGTH)}Z"
    }

    private fun isoDateFormatter(): SimpleDateFormat {
        return SimpleDateFormat(ISO_DATE_FORMAT, Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
            isLenient = false
        }
    }

    private fun Any?.containsString(expected: String): Boolean {
        if (this is List<*>) {
            return any { it?.toString() == expected }
        }
        if (this is JSONArray) {
            return containsString(expected)
        }
        return false
    }

    private fun Any?.containsComparableValue(value: Any?): Boolean {
        return value.matchableStrings().any { containsString(it) }
    }

    private fun Any?.matchableStrings(): Set<String> {
        if (this == null) {
            return emptySet()
        }
        val strings = mutableSetOf(toString())
        if (this is Number) {
            val doubleValue = toDouble()
            if (
                !doubleValue.isNaN() &&
                !doubleValue.isInfinite() &&
                doubleValue % 1.0 == 0.0 &&
                doubleValue >= Long.MIN_VALUE.toDouble() &&
                doubleValue <= Long.MAX_VALUE.toDouble()
            ) {
                strings.add(doubleValue.toLong().toString())
            }
        }
        return strings
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

    private fun JSONObject.optionalLong(key: String): Long? {
        if (!has(key) || isNull(key)) {
            return null
        }
        return when (val value = opt(key)) {
            is Number -> value.toLong()
            is String -> value.toLongOrNull()
            else -> null
        }
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
        const val STATUS_STORED = "stored"
        const val STATUS_FAILED = "failed"
        const val EVENT_PROVIDER_READY = "provider_ready"
        const val EVENT_CONFIGURATION_CHANGED = "configuration_changed"
        const val EVENT_PROVIDER_ERROR = "provider_error"
        const val OPERATION_SAVE = "save"
        const val OPERATION_LOAD = "load"
        const val DEFAULT_STORAGE_SLOT = "default"
        const val EXPECTED_BOOLEAN = "boolean"
        const val EXPECTED_STRING = "string"
        const val EXPECTED_NUMBER = "number"
        const val EXPECTED_OBJECT = "object"
        const val BYTE_MASK = 0xffL
        const val MAX_UNSIGNED_INT = 4_294_967_295L
        const val ISO_DATE_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
        const val ISO_MILLIS_LENGTH = 3
        val KNOWN_CONDITION_OPERATORS = setOf(
            "IS_NULL",
            "MATCHES",
            "NOT_MATCHES",
            "ONE_OF",
            "NOT_ONE_OF",
            "GTE",
            "GT",
            "LTE",
            "LT",
        )
    }
}
