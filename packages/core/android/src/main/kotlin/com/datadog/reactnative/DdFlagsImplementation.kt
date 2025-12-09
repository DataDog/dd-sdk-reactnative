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
import com.datadog.android.flags.model.EvaluationContext
import com.datadog.android.flags.model.ErrorCode
import com.datadog.android.flags.model.ResolutionDetails
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import org.json.JSONObject

class DdFlagsImplementation(private val sdkCore: SdkCore = Datadog.getInstance()) {

    private val clients: MutableMap<String, FlagsClient> = mutableMapOf()

    /**
     * Enable the Flags feature with the provided configuration.
     * @param configuration The configuration for Flags.
     */
    fun enable(configuration: ReadableMap, promise: Promise) {
        val flagsConfig = configuration.asFlagsConfiguration()
        if (flagsConfig != null) {
            Flags.enable(flagsConfig, sdkCore)
        } else {
            InternalLogger.UNBOUND.log(
                    InternalLogger.Level.ERROR,
                    InternalLogger.Target.USER,
                    { "Invalid configuration provided for Flags. Feature initialization skipped." }
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
    private fun getClient(name: String): FlagsClient {
        return clients.getOrPut(name) {
            FlagsClient.Builder(name, sdkCore).build()
        }
    }

    private fun parseAttributes(attributes: ReadableMap): Map<String, String> {
        val result = mutableMapOf<String, String>()
        val iterator = attributes.entryIterator
        while (iterator.hasNext()) {
            val entry = iterator.next()
            // Convert all values to strings as required by Android SDK
            result[entry.key] = entry.value?.toString() ?: ""
        }
        return result
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
            promise: Promise
    ) {
        val client = getClient(clientName)
        val parsedAttributes = parseAttributes(attributes)
        val evaluationContext = EvaluationContext(targetingKey, parsedAttributes)

        client.setEvaluationContext(evaluationContext)
        promise.resolve(null)
    }

    /**
     * Get details for a boolean flag.
     * @param clientName The name of the client.
     * @param key The flag key.
     * @param defaultValue The default value.
     */
    fun getBooleanDetails(
            clientName: String,
            key: String,
            defaultValue: Boolean,
            promise: Promise
    ) {
        val client = getClient(clientName)
        val details = client.resolve<Boolean>(key, defaultValue)
        promise.resolve(details.toReactNativeMap(key))
    }

    /**
     * Get details for a string flag.
     * @param clientName The name of the client.
     * @param key The flag key.
     * @param defaultValue The default value.
     */
    fun getStringDetails(clientName: String, key: String, defaultValue: String, promise: Promise) {
        val client = getClient(clientName)
        val details = client.resolve<String>(key, defaultValue)
        promise.resolve(details.toReactNativeMap(key))
    }

    /**
     * Get details for a number flag. Includes Number and Integer flags.
     * @param clientName The name of the client.
     * @param key The flag key.
     * @param defaultValue The default value.
     */
    fun getNumberDetails(clientName: String, key: String, defaultValue: Double, promise: Promise) {
        val client = getClient(clientName)

        // Try as Double first.
        val doubleDetails = client.resolve<Double>(key, defaultValue)

        // If type mismatch and value is an integer, try as Int.
        if (doubleDetails.errorCode == ErrorCode.TYPE_MISMATCH) {
            val safeInt = defaultValue.toInt()
            val intDetails = client.resolve<Int>(key, safeInt)

            if (intDetails.errorCode == null) {
                promise.resolve(intDetails.toReactNativeMap(key))
                return
            }
        }

        promise.resolve(doubleDetails.toReactNativeMap(key))
    }

    /**
     * Get details for an object flag.
     * @param clientName The name of the client.
     * @param key The flag key.
     * @param defaultValue The default value.
     */
    fun getObjectDetails(
            clientName: String,
            key: String,
            defaultValue: ReadableMap,
            promise: Promise
    ) {
        val client = getClient(clientName)
        val jsonDefaultValue = defaultValue.toJSONObject()
        val details = client.resolve(key, jsonDefaultValue)
        promise.resolve(details.toReactNativeMap(key))
    }

    internal companion object {
        internal const val NAME = "DdFlags"
    }
}

/** Convert ResolutionDetails to React Native map format expected by the JS layer. */
private fun <T : Any> ResolutionDetails<T>.toReactNativeMap(key: String): WritableMap {
    val map = WritableNativeMap()
    map.putString("key", key)

    when (val v = value) {
        is Boolean -> map.putBoolean("value", v)
        is String -> map.putString("value", v)
        is Int -> map.putDouble("value", v.toDouble()) // Convert to double for RN.
        is Double -> map.putDouble("value", v)
        is JSONObject -> map.putMap("value", v.toWritableMap())
        else -> map.putNull("value")
    }

    variant?.let { map.putString("variant", it) } ?: map.putNull("variant")
    reason?.let { map.putString("reason", it.name) } ?: map.putNull("reason")
    errorCode?.let { map.putString("error", it.name) } ?: map.putNull("error")

    return map
}

/** Convert ReadableMap to JSONObject for flag default values. */
private fun ReadableMap.toJSONObject(): JSONObject {
    val json = JSONObject()
    val iterator = entryIterator
    while (iterator.hasNext()) {
        val entry = iterator.next()
        json.put(entry.key, entry.value)
    }
    return json
}

/** Convert JSONObject to WritableMap for React Native. */
private fun JSONObject.toWritableMap(): WritableMap {
    val map = WritableNativeMap()
    val keys = keys()
    while (keys.hasNext()) {
        val key = keys.next()
        when (val value = get(key)) {
            is Boolean -> map.putBoolean(key, value)
            is Int -> map.putInt(key, value)
            is Double -> map.putDouble(key, value)
            is String -> map.putString(key, value)
            is JSONObject -> map.putMap(key, value.toWritableMap())
            JSONObject.NULL -> map.putNull(key)
            else -> map.putNull(key)
        }
    }
    return map
}

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

    return FlagsConfiguration.Builder()
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
            }
            .build()
}
