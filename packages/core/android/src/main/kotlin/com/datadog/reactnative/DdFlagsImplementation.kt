/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.Datadog
import com.datadog.android.api.InternalLogger
import com.datadog.android.api.SdkCore
import com.datadog.android.flags.EvaluationContextCallback
import com.datadog.android.flags.Flags
import com.datadog.android.flags.FlagsClient
import com.datadog.android.flags.FlagsConfiguration
import com.datadog.android.flags._FlagsInternalProxy
import com.datadog.android.flags.model.EvaluationContext
import com.datadog.android.flags.model.FlagsClientState
import com.datadog.android.flags.model.UnparsedFlag
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import org.json.JSONObject
import java.util.Locale

/**
 * The entry point to use Datadog's Flags feature.
 */
class DdFlagsImplementation(
    private val sdkCoreOverride: SdkCore? = null,
) {
    private val clients: MutableMap<String, FlagsClient> = mutableMapOf()

    private val sdkCore: SdkCore
        get() = sdkCoreOverride ?: Datadog.getInstance()

    /**
     * Enable the Flags feature with the provided configuration.
     * @param configuration The configuration for Flags.
     */
    fun enable(
        configuration: ReadableMap,
        promise: Promise,
    ) {
        val flagsConfig = buildFlagsConfiguration(configuration.toMap())
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

    private fun getClient(name: String): FlagsClient = clients.getOrPut(name) { FlagsClient.Builder(name, sdkCore).build() }

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
        val internalClient = _FlagsInternalProxy(client)

        // Set the evaluation context.
        val evaluationContext = buildEvaluationContext(targetingKey, attributes)
        client.setEvaluationContext(
            evaluationContext,
            object : EvaluationContextCallback {
                override fun onSuccess() {
                    val flagsSnapshot = internalClient.getFlagAssignmentsSnapshot()
                    val serializedFlagsSnapshot =
                        flagsSnapshot.mapValues { (key, flag) ->
                            convertUnparsedFlagToMap(key, flag)
                        }.toWritableMap()
                    promise.resolve(serializedFlagsSnapshot)
                }

                override fun onFailure(error: Throwable) {
                    // If network request fails and there are cached flags, return them.
                    if (client.state.getCurrentState() == FlagsClientState.Stale) {
                        val flagsSnapshot = internalClient.getFlagAssignmentsSnapshot()
                        val serializedFlagsSnapshot =
                            flagsSnapshot.mapValues { (key, flag) ->
                                convertUnparsedFlagToMap(key, flag)
                            }.toWritableMap()
                        promise.resolve(serializedFlagsSnapshot)
                    } else {
                        promise.reject("CLIENT_NOT_INITIALIZED", error.message, error)
                    }
                }
            },
        )
    }

    /**
     * A bridge for tracking feature flag evaluations in React Native.
     * @param clientName The name of the client.
     * @param key The key of the flag.
     * @param rawFlag The raw flag from the JavaScript cache.
     * @param targetingKey The targeting key.
     * @param attributes The attributes for the evaluation context.
     * @param promise The promise to resolve.
     */
    @Suppress("LongParameterList")
    fun trackEvaluation(
        clientName: String,
        key: String,
        rawFlag: ReadableMap,
        targetingKey: String,
        attributes: ReadableMap,
        promise: Promise,
    ) {
        val client = getClient(clientName)
        val internalClient = _FlagsInternalProxy(client)

        val flag = convertMapToUnparsedFlag(rawFlag.toMap())
        val evaluationContext = buildEvaluationContext(targetingKey, attributes)
        internalClient.trackFlagSnapshotEvaluation(key, flag, evaluationContext)

        promise.resolve(null)
    }

    internal companion object {
        internal const val NAME = "DdFlags"
    }
}

@Suppress("UNCHECKED_CAST")
private fun buildFlagsConfiguration(configuration: Map<String, Any?>): FlagsConfiguration? {
    val enabled = configuration["enabled"] as? Boolean ?: false

    if (!enabled) {
        return null
    }

    // Hard set `gracefulModeEnabled` to `true` because SDK misconfigurations are handled on JS
    // side.
    // This prevents crashes on hot reload when clients are recreated.
    val gracefulModeEnabled = true

    val trackExposures = configuration["trackExposures"] as? Boolean ?: true
    val rumIntegrationEnabled = configuration["rumIntegrationEnabled"] as? Boolean ?: true

    return FlagsConfiguration
        .Builder()
        .apply {
            gracefulModeEnabled(gracefulModeEnabled)
            trackExposures(trackExposures)
            rumIntegrationEnabled(rumIntegrationEnabled)

            // The SDK automatically appends endpoint names to the custom endpoints.
            // The input config expects a base URL rather than a full URL.
            (configuration["customFlagsEndpoint"] as? String)?.let {
                useCustomFlagEndpoint("$it/precompute-assignments")
            }
            (configuration["customExposureEndpoint"] as? String)?.let {
                useCustomExposureEndpoint("$it/api/v2/exposures")
            }
        }.build()
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

private fun convertUnparsedFlagToMap(
    flagKey: String,
    flag: UnparsedFlag,
): Map<String, Any?> {
    // Parse the value based on variationType
    val parsedValue: Any? =
        when (flag.variationType) {
            "boolean" -> flag.variationValue.lowercase(Locale.US).toBooleanStrictOrNull()
            "string" -> flag.variationValue
            "integer" -> flag.variationValue.toIntOrNull()
            "number", "float" -> flag.variationValue.toDoubleOrNull()
            "object" -> try {
                JSONObject(flag.variationValue).toMap()
            } catch (_: Exception) {
                null
            }
            else -> {
                null
            }
        }

    if (parsedValue == null) {
        InternalLogger.UNBOUND.log(
            InternalLogger.Level.ERROR,
            InternalLogger.Target.USER,
            { "Flag '$flagKey': Failed to parse value '${flag.variationValue}' as '${flag.variationType}'" },
        )
    }

    // Return a [Map] as an intermediate because it is easier to use; we can convert it to WritableMap right before sending to React Native.
    return mapOf(
        "key" to flagKey,
        "value" to (parsedValue ?: flag.variationValue),
        "allocationKey" to flag.allocationKey,
        "variationKey" to flag.variationKey,
        "variationType" to flag.variationType,
        "variationValue" to flag.variationValue,
        "reason" to flag.reason,
        "doLog" to flag.doLog,
        "extraLogging" to flag.extraLogging.toMap(),
        // Serialized as a String because the React Native bridge converts Long values to Double
        "serialId" to flag.serialId?.toString()
    )
}

@Suppress("UNCHECKED_CAST")
private fun convertMapToUnparsedFlag(map: Map<String, Any>): UnparsedFlag =
    object : UnparsedFlag {
        override val variationType: String = map["variationType"] as? String ?: ""
        override val variationValue: String = map["variationValue"] as? String ?: ""
        override val doLog: Boolean = map["doLog"] as? Boolean ?: false
        override val allocationKey: String = map["allocationKey"] as? String ?: ""
        override val variationKey: String = map["variationKey"] as? String ?: ""
        override val extraLogging: JSONObject =
            (map["extraLogging"] as? Map<String, Any>)?.toJSONObject()
                ?: JSONObject()
        override val reason: String = map["reason"] as? String ?: ""
        override val serialId: Long? =
            (map["serialId"] as? String)?.toLongOrNull()
                ?: (map["serialId"] as? Number)?.toLong()
    }
