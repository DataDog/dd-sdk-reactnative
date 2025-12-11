/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.Datadog
import com.datadog.android.api.InternalLogger
import com.datadog.android.api.SdkCore
import com.datadog.android.flags.Flags
import com.datadog.android.flags.FlagsClient
import com.datadog.android.flags.FlagsConfiguration
import com.datadog.android.flags.internal.model.PrecomputedFlag
import com.datadog.android.flags.model.EvaluationContext
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import org.json.JSONObject

class DdFlagsImplementation(
    private val sdkCore: SdkCore = Datadog.getInstance(),
) {
    private val clients: MutableMap<String, FlagsClient> = mutableMapOf()

    /**
     * Enable the Flags feature with the provided configuration.
     * @param configuration The configuration for Flags.
     */
    fun enable(
        configuration: ReadableMap,
        promise: Promise,
    ) {
        val flagsConfig = configuration.asFlagsConfiguration()
        if (flagsConfig != null) {
            Flags.enable(flagsConfig, sdkCore)
        } else {
            InternalLogger.UNBOUND.log(
                InternalLogger.Level.ERROR,
                InternalLogger.Target.USER,
                { "Invalid configuration provided for Flags. Feature initialization skipped." },
            )
        }
        promise.resolve(null)
    }

    /**
     * Retrieve or create a FlagsClient instance.
     *
     * Caches clients by name to avoid repeated Builder().build() calls.
     * On hot reload, the cache is cleared and clients are recreated - this is safe
     * because gracefulModeEnabled=true prevents crashes on duplicate creation.
     */
    private fun getClient(name: String): FlagsClient =
        clients.getOrPut(name) {
            FlagsClient.Builder(name, sdkCore).build()
        }

    /**
     * Set the evaluation context for a specific client.
     * @param clientName The name of the client.
     * @param targetingKey The targeting key.
     * @param attributes The attributes for the evaluation context (will be converted to strings).
     */
    fun setEvaluationContext(
        clientName: String,
        targetingKey: String,
        attributes: ReadableMap,
        promise: Promise,
    ) {
        val client = getClient(clientName)

        // Set the evaluation context.
        val evaluationContext = buildEvaluationContext(targetingKey, attributes)
        client.setEvaluationContext(evaluationContext)

        // Retrieve flags state snapshot.
        val flagsSnapshot = client._getInternal()?.getFlagAssignmentsSnapshot()

        // Send the flags state snapshot to React Native. If `flagsSnapshot` is null, the FlagsClient client is not ready yet.
        if (flagsSnapshot != null) {
            val mapOfMaps =
                flagsSnapshot.mapValues { (key, flag) ->
                    convertPrecomputedFlagToMap(key, flag)
                }

            promise.resolve(mapOfMaps.toWritableMap())
        } else {
            promise.reject("CLIENT_NOT_INITIALIZED", "CLIENT_NOT_INITIALIZED", null)
        }
    }

    fun trackEvaluation(
        clientName: String,
        key: String,
        rawFlag: ReadableMap,
        targetingKey: String,
        attributes: ReadableMap,
        promise: Promise,
    ) {
        val client = getClient(clientName)

        val precomputedFlag = convertMapToPrecomputedFlag(rawFlag.toMap())
        val evaluationContext = buildEvaluationContext(targetingKey, attributes)
        client._getInternal()?.trackFlagSnapshotEvaluation(key, precomputedFlag, evaluationContext)

        promise.resolve(null)
    }

    internal companion object {
        internal const val NAME = "DdFlags"
    }
}

private fun buildEvaluationContext(
    targetingKey: String,
    attributes: ReadableMap,
): EvaluationContext {
    val parsed = mutableMapOf<String, String>()

    for ((key, value) in attributes.entryIterator) {
        parsed[key] = value.toString()
    }

    return EvaluationContext(targetingKey, parsed)
}

/**
 * Converts a [PrecomputedFlag] to a [Map] for further React Native bridge transfer.
 * Includes the flag key and parses the value based on variationType.
 */
private fun convertPrecomputedFlagToMap(
    flagKey: String,
    flag: PrecomputedFlag,
): Map<String, Any?> {
    // Parse the value based on variationType
    val parsedValue: Any =
        when (flag.variationType) {
            "boolean" -> {
                flag.variationValue.lowercase().toBooleanStrictOrNull() ?: flag.variationValue
            }

            "string" -> {
                flag.variationValue
            }

            "integer" -> {
                flag.variationValue.toIntOrNull() ?: flag.variationValue
            }

            "number", "float" -> {
                flag.variationValue.toDoubleOrNull() ?: flag.variationValue
            }

            "object" -> {
                try {
                    JSONObject(flag.variationValue).toMap()
                } catch (e: Exception) {
                    flag.variationValue
                }
            }

            else -> {
                flag.variationValue
            }
        }

    return mapOf(
        "key" to flagKey,
        "value" to parsedValue,
        "variationType" to flag.variationType,
        "variationValue" to flag.variationValue,
        "doLog" to flag.doLog,
        "allocationKey" to flag.allocationKey,
        "variationKey" to flag.variationKey,
        "extraLogging" to flag.extraLogging.toMap(),
        "reason" to flag.reason,
    )
}

/**
 * Converts a [Map] to a [PrecomputedFlag].
 */
@Suppress("UNCHECKED_CAST")
private fun convertMapToPrecomputedFlag(map: Map<String, Any>): PrecomputedFlag =
    PrecomputedFlag(
        variationType = map["variationType"] as? String ?: "",
        variationValue = map["variationValue"] as? String ?: "",
        doLog = map["doLog"] as? Boolean ?: false,
        allocationKey = map["allocationKey"] as? String ?: "",
        variationKey = map["variationKey"] as? String ?: "",
        extraLogging = (map["extraLogging"] as? Map<String, Any>)?.toJSONObject() ?: JSONObject(),
        reason = map["reason"] as? String ?: "",
    )

/** Parse configuration from ReadableMap to FlagsConfiguration. */
private fun ReadableMap.asFlagsConfiguration(): FlagsConfiguration? {
    val enabled = if (hasKey("enabled")) getBoolean("enabled") else false

    if (!enabled) {
        return null
    }

    // Hard set `gracefulModeEnabled` to `true` because SDK misconfigurations are handled on JS side.
    // This prevents crashes on hot reload when clients are recreated.
    val gracefulModeEnabled = true

    val trackExposures = if (hasKey("trackExposures")) getBoolean("trackExposures") else true
    val rumIntegrationEnabled =
        if (hasKey("rumIntegrationEnabled")) getBoolean("rumIntegrationEnabled") else true

    return FlagsConfiguration
        .Builder()
        .apply {
            gracefulModeEnabled(gracefulModeEnabled)
            trackExposures(trackExposures)
            rumIntegrationEnabled(rumIntegrationEnabled)

            // The SDK automatically appends endpoint names to the custom endpoints.
            // The input config expects a base URL rather than a full URL.
            if (hasKey("customFlagsEndpoint")) {
                getString("customFlagsEndpoint")?.let { useCustomFlagEndpoint("$it/precompute-assignments") }
            }
            if (hasKey("customExposureEndpoint")) {
                getString("customExposureEndpoint")?.let { useCustomExposureEndpoint("$it/api/v2/exposures") }
            }
        }.build()
}
