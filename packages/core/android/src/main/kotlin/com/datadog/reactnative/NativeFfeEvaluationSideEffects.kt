/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

@file:Suppress("CyclomaticComplexMethod", "TooGenericExceptionCaught")

package com.datadog.reactnative

import com.datadog.android.Datadog
import com.datadog.android.api.InternalLogger
import com.datadog.android.api.SdkCore
import com.datadog.android.flags.FlagsClient
import com.datadog.android.flags._FlagsInternalProxy
import com.datadog.android.flags.model.EvaluationContext
import com.datadog.android.flags.model.UnparsedFlag
import org.json.JSONArray
import org.json.JSONObject

internal class NativeFfeEvaluationSideEffects(
    private val tracker: NativeFfeEvaluationTracker = DatadogFlagsEvaluationTracker(),
) {
    private var attemptedCount = 0
    private var trackedCount = 0
    private var skippedCount = 0
    private var failedCount = 0
    private var lastStatus: String? = null
    private var lastError: String? = null

    fun trackEvaluation(result: Map<String, Any?>, context: Map<String, Any?>): String {
        val request = result.toTrackingRequest(context)
        if (request == null) {
            skippedCount += 1
            lastStatus = STATUS_SKIPPED
            lastError = null
            return STATUS_SKIPPED
        }

        attemptedCount += 1
        return try {
            tracker.track(request)
            trackedCount += 1
            lastStatus = STATUS_TRACKED
            lastError = null
            STATUS_TRACKED
        } catch (error: Exception) {
            failedCount += 1
            lastStatus = STATUS_FAILED
            lastError = error.message
            InternalLogger.UNBOUND.log(
                InternalLogger.Level.WARN,
                InternalLogger.Target.USER,
                { "Native FFE evaluation side effects failed for flag '${request.flagKey}': ${error.message}" },
            )
            STATUS_FAILED
        }
    }

    fun debugState(): Map<String, Any?> = mapOf(
        "attemptedCount" to attemptedCount,
        "trackedCount" to trackedCount,
        "skippedCount" to skippedCount,
        "failedCount" to failedCount,
        "lastStatus" to lastStatus,
        "lastError" to lastError,
    ).filterValues { it != null }

    @Suppress("UNCHECKED_CAST")
    private fun Map<String, Any?>.toTrackingRequest(context: Map<String, Any?>): NativeFfeEvaluationSideEffectRequest? {
        val metadata = this["flagMetadata"] as? Map<String, Any?> ?: return null
        val flagKey = this["flagKey"] as? String ?: return null
        val variationKey = this["variant"] as? String ?: return null
        val reason = this["reason"] as? String ?: return null
        val value = this["value"] ?: return null
        val allocationKey = metadata["allocationKey"] as? String ?: return null
        val targetingKey = context["targetingKey"]?.toString()?.takeIf { it.isNotBlank() } ?: return null
        val clientName = context["clientName"]?.toString()?.takeIf { it.isNotBlank() } ?: DEFAULT_CLIENT_NAME
        val attributes = (context["attributes"] as? Map<*, *>)
            ?.mapNotNull { (key, attributeValue) ->
                (key as? String)?.let { it to attributeValue.toString() }
            }
            ?.toMap()
            ?: emptyMap()
        val doLog = metadata["doLog"] as? Boolean ?: false
        val extraLogging = (metadata["extraLogging"] as? Map<*, *>)?.toJSONObject() ?: JSONObject()
        val variationType = metadata["variationType"] as? String ?: value.toVariationType()

        val flag = object : UnparsedFlag {
            override val variationType: String = variationType
            override val variationValue: String = value.toVariationValue()
            override val doLog: Boolean = doLog
            override val allocationKey: String = allocationKey
            override val variationKey: String = variationKey
            override val extraLogging: JSONObject = extraLogging
            override val reason: String = reason
        }

        return NativeFfeEvaluationSideEffectRequest(
            clientName = clientName,
            flagKey = flagKey,
            flag = flag,
            evaluationContext = EvaluationContext(targetingKey, attributes),
        )
    }

    private fun Any.toVariationType(): String = when (this) {
        is Boolean -> "boolean"
        is String -> "string"
        is Number -> "number"
        is Map<*, *> -> "object"
        else -> "object"
    }

    private fun Any?.toVariationValue(): String = when (this) {
        null -> "null"
        is Map<*, *> -> toJSONObject().toString()
        is List<*> -> toJSONArray().toString()
        else -> toString()
    }

    private fun Map<*, *>.toJSONObject(): JSONObject {
        val jsonObject = JSONObject()
        for ((key, value) in this) {
            jsonObject.put(key.toString(), value.toJsonValue())
        }
        return jsonObject
    }

    private fun List<*>.toJSONArray(): JSONArray {
        val jsonArray = JSONArray()
        for (value in this) {
            jsonArray.put(value.toJsonValue())
        }
        return jsonArray
    }

    private fun Any?.toJsonValue(): Any? = when (this) {
        is Map<*, *> -> toJSONObject()
        is List<*> -> toJSONArray()
        null -> JSONObject.NULL
        else -> this
    }

    private companion object {
        const val DEFAULT_CLIENT_NAME = "default"
        const val STATUS_TRACKED = "tracked"
        const val STATUS_SKIPPED = "skipped"
        const val STATUS_FAILED = "failed"
    }
}

internal data class NativeFfeEvaluationSideEffectRequest(
    val clientName: String,
    val flagKey: String,
    val flag: UnparsedFlag,
    val evaluationContext: EvaluationContext,
)

internal interface NativeFfeEvaluationTracker {
    fun track(request: NativeFfeEvaluationSideEffectRequest)
}

private class DatadogFlagsEvaluationTracker(
    private val sdkCoreProvider: () -> SdkCore = { Datadog.getInstance() },
) : NativeFfeEvaluationTracker {
    private val clients: MutableMap<String, FlagsClient> = mutableMapOf()

    override fun track(request: NativeFfeEvaluationSideEffectRequest) {
        val client = clients.getOrPut(request.clientName) {
            FlagsClient.Builder(request.clientName, sdkCoreProvider()).build()
        }
        _FlagsInternalProxy(client).trackFlagSnapshotEvaluation(
            request.flagKey,
            request.flag,
            request.evaluationContext,
        )
    }
}
