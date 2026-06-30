/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.Context
import java.io.File
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
        val key = slot.toStorageKey()
        val updatedAtMs = clockMs()
        val payload = JSONObject()
            .put("version", PAYLOAD_VERSION)
            .put("key", key)
            .put("updatedAtMs", updatedAtMs)
            .put("wire", wire)
            .toString()
        fileForKey(key).writeText(payload, Charsets.UTF_8)
        return NativeFfeStoredConfiguration(key, wire, updatedAtMs)
    }

    override fun load(slot: String): NativeFfeStoredConfiguration? {
        val key = slot.toStorageKey()
        val file = fileForKey(key)
        if (!file.exists()) {
            return null
        }
        val payload = JSONObject(file.readText(Charsets.UTF_8))
        require(payload.optInt("version") == PAYLOAD_VERSION) {
            "Unsupported stored flags configuration version: ${payload.optInt("version")}"
        }
        return NativeFfeStoredConfiguration(
            key = key,
            wire = payload.getString("wire"),
            updatedAtMs = payload.optLong("updatedAtMs"),
        )
    }

    private fun fileForKey(key: String): File {
        return File(rootDirectory, "$key.json")
    }

    private fun String.toStorageKey(): String {
        val sanitized = takeIf { it.isNotBlank() }
            ?.replace(STORAGE_KEY_ALLOWED_PATTERN, "_")
            ?.trim('_')
            ?.takeIf { it.isNotBlank() }
            ?: DEFAULT_SLOT
        return "${KEY_PREFIX}-${sanitized.take(MAX_SLOT_LENGTH)}"
    }

    private companion object {
        const val ROOT_DIRECTORY = "datadog/native-ffe"
        const val CONFIGURATIONS_DIRECTORY = "configurations"
        const val PAYLOAD_VERSION = 1
        const val DEFAULT_SLOT = "default"
        const val KEY_PREFIX = "flags-configuration"
        const val MAX_SLOT_LENGTH = 80
        val STORAGE_KEY_ALLOWED_PATTERN = Regex("[^A-Za-z0-9._-]")
    }
}
