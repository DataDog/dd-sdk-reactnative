/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.Context
import com.datadog.android.Datadog
import com.datadog.android.api.feature.Feature
import com.datadog.android.api.feature.FeatureSdkCore
import com.datadog.android.api.storage.datastore.DataStoreHandler
import com.datadog.android.api.storage.datastore.DataStoreReadCallback
import com.datadog.android.api.storage.datastore.DataStoreWriteCallback
import com.datadog.android.core.internal.persistence.Deserializer
import com.datadog.android.core.persistence.Serializer
import com.datadog.android.core.persistence.datastore.DataStoreContent
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import org.json.JSONObject

internal interface NativeFfeConfigurationStore {
    fun save(slot: String, wire: String): NativeFfeStoredConfiguration
    fun load(slot: String): NativeFfeStoredConfiguration?
}

internal data class NativeFfeStoredConfiguration(
    val key: String,
    val wire: String,
    val updatedAtMs: Long,
)

internal class FileNativeFfeConfigurationStore(
    private val rootDirectory: File,
    private val clockMs: () -> Long = { System.currentTimeMillis() },
) : NativeFfeConfigurationStore {
    constructor(context: Context) : this(
        File(context.filesDir, "${ROOT_DIRECTORY}/${CONFIGURATIONS_DIRECTORY}")
    )

    override fun save(slot: String, wire: String): NativeFfeStoredConfiguration {
        rootDirectory.mkdirs()
        val key = slot.toNativeFfeStorageKey()
        val updatedAtMs = clockMs()
        val payload = nativeFfeStoragePayload(key, wire, updatedAtMs)
        fileForKey(key).writeText(payload, Charsets.UTF_8)
        return NativeFfeStoredConfiguration(key, wire, updatedAtMs)
    }

    override fun load(slot: String): NativeFfeStoredConfiguration? {
        val key = slot.toNativeFfeStorageKey()
        val file = fileForKey(key)
        if (!file.exists()) {
            return null
        }
        return nativeFfeStoredConfigurationFromPayload(key, file.readText(Charsets.UTF_8))
    }

    private fun fileForKey(key: String): File {
        return File(rootDirectory, "$key.json")
    }

    private companion object {
        const val ROOT_DIRECTORY = "datadog/native-ffe"
        const val CONFIGURATIONS_DIRECTORY = "configurations"
    }
}

internal class DatadogDataStoreNativeFfeConfigurationStore(
    private val dataStoreProvider: () -> DataStoreHandler? = { defaultFlagsDataStore() },
    private val fallbackStore: NativeFfeConfigurationStore? = null,
    private val clockMs: () -> Long = { System.currentTimeMillis() },
    private val timeoutMs: Long = DATASTORE_TIMEOUT_MS,
) : NativeFfeConfigurationStore {
    override fun save(slot: String, wire: String): NativeFfeStoredConfiguration {
        val dataStore = dataStoreProvider() ?: return fallbackSave(slot, wire)
        val key = slot.toNativeFfeStorageKey()
        val updatedAtMs = clockMs()
        val payload = nativeFfeStoragePayload(key, wire, updatedAtMs)
        val outcome = AtomicReference<Boolean>()
        val latch = CountDownLatch(1)

        try {
            dataStore.setValue(
                key,
                payload,
                NATIVE_FFE_STORAGE_PAYLOAD_VERSION,
                object : DataStoreWriteCallback {
                    override fun onSuccess() {
                        outcome.set(true)
                        latch.countDown()
                    }

                    override fun onFailure() {
                        outcome.set(false)
                        latch.countDown()
                    }
                },
                STRING_SERIALIZER
            )
        } catch (_: Exception) {
            return fallbackSave(slot, wire)
        }

        if (latch.await(timeoutMs, TimeUnit.MILLISECONDS) && outcome.get() == true) {
            return NativeFfeStoredConfiguration(key, wire, updatedAtMs)
        }
        return fallbackSave(slot, wire)
    }

    override fun load(slot: String): NativeFfeStoredConfiguration? {
        val dataStore = dataStoreProvider() ?: return fallbackStore?.load(slot)
        val key = slot.toNativeFfeStorageKey()
        val outcome = AtomicReference<NativeFfeStoredConfiguration?>()
        val failed = AtomicReference(false)
        val latch = CountDownLatch(1)

        try {
            dataStore.value(
                key,
                NATIVE_FFE_STORAGE_PAYLOAD_VERSION,
                object : DataStoreReadCallback<String> {
                    override fun onSuccess(dataStoreContent: DataStoreContent<String>?) {
                        val payload = dataStoreContent?.data
                        if (payload == null) {
                            failed.set(true)
                        } else {
                            try {
                                outcome.set(nativeFfeStoredConfigurationFromPayload(key, payload))
                            } catch (_: Exception) {
                                failed.set(true)
                            }
                        }
                        latch.countDown()
                    }

                    override fun onFailure() {
                        failed.set(true)
                        latch.countDown()
                    }
                },
                STRING_DESERIALIZER
            )
        } catch (_: Exception) {
            return fallbackStore?.load(slot)
        }

        return if (latch.await(timeoutMs, TimeUnit.MILLISECONDS) && failed.get() == false) {
            outcome.get()
        } else {
            fallbackStore?.load(slot)
        }
    }

    private fun fallbackSave(slot: String, wire: String): NativeFfeStoredConfiguration {
        return fallbackStore?.save(slot, wire)
            ?: throw IllegalStateException("Datadog Flags data store is not available")
    }

    private companion object {
        const val DATASTORE_TIMEOUT_MS = 3_000L

        val STRING_SERIALIZER = object : Serializer<String> {
            override fun serialize(model: String): String = model
        }

        val STRING_DESERIALIZER = object : Deserializer<String, String> {
            override fun deserialize(model: String): String = model
        }

        fun defaultFlagsDataStore(): DataStoreHandler? {
            return try {
                (Datadog.getInstance() as? FeatureSdkCore)
                    ?.getFeature(Feature.FLAGS_FEATURE_NAME)
                    ?.dataStore
            } catch (_: Throwable) {
                null
            }
        }
    }
}

private const val NATIVE_FFE_STORAGE_PAYLOAD_VERSION = 1
private const val DEFAULT_SLOT = "default"
private const val KEY_PREFIX = "flags-configuration"
private const val MAX_SLOT_LENGTH = 80
private val STORAGE_KEY_ALLOWED_PATTERN = Regex("[^A-Za-z0-9._-]")

private fun String.toNativeFfeStorageKey(): String {
    val sanitized = takeIf { it.isNotBlank() }
        ?.replace(STORAGE_KEY_ALLOWED_PATTERN, "_")
        ?.trim('_')
        ?.takeIf { it.isNotBlank() }
        ?: DEFAULT_SLOT
    return "${KEY_PREFIX}-${sanitized.take(MAX_SLOT_LENGTH)}"
}

private fun nativeFfeStoragePayload(key: String, wire: String, updatedAtMs: Long): String {
    return JSONObject()
        .put("version", NATIVE_FFE_STORAGE_PAYLOAD_VERSION)
        .put("key", key)
        .put("updatedAtMs", updatedAtMs)
        .put("wire", wire)
        .toString()
}

@Suppress("FunctionMaxLength")
private fun nativeFfeStoredConfigurationFromPayload(
    expectedKey: String,
    payloadString: String,
): NativeFfeStoredConfiguration {
    val payload = JSONObject(payloadString)
    require(payload.optInt("version") == NATIVE_FFE_STORAGE_PAYLOAD_VERSION) {
        "Unsupported stored flags configuration version: ${payload.optInt("version")}"
    }
    return NativeFfeStoredConfiguration(
        key = payload.optString("key", expectedKey),
        wire = payload.getString("wire"),
        updatedAtMs = payload.optLong("updatedAtMs"),
    )
}
