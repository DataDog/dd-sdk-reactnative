/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import android.app.Activity
import com.datadog.android.sessionreplay.SessionReplayInternalCallback
import com.datadog.android.sessionreplay.SessionReplayInternalResourceQueue
import com.facebook.react.bridge.ReactContext
import org.json.JSONException
import org.json.JSONObject
import java.io.IOException

/**
 * Responsible for defining the internal callback implementation for react-native that will allow
 * overriding specific parts of the session replay android sdk.
 */
class ReactNativeInternalCallback(
    private val reactContext: ReactContext,
) : SessionReplayInternalCallback {
    private var resourceQueue: SessionReplayInternalResourceQueue? = null

    companion object {
        private const val ASSETS_JSON = "assets.json"
        private const val ASSETS_BIN = "assets.bin"
    }

    private val jsonObject: JSONObject? = loadAssetsJson()

    /**
     * Loads and parses the `assets.json` file from the app's assets directory.
     * The JSON file maps unique asset keys to metadata entries containing
     * their offset and length inside the `assets.bin` binary file.
     *
     * @return A [JSONObject] representing the parsed asset index, or `null` if
     * the file could not be read or contained invalid JSON.
     */
    private fun loadAssetsJson(): JSONObject? {
        return try {
            val jsonText = reactContext.assets.open(ASSETS_JSON)
                .bufferedReader()
                .use { it.readText() }
            JSONObject(jsonText)
        } catch (e: IOException) {
            null
        } catch (e: JSONException) {
            null
        }
    }

    /**
     * Returns the JSON entry for a given asset key, if it exists in the index.
     *
     * @param key The unique asset key to look up (as defined in `assets.json`).
     * @return A [JSONObject] containing the metadata for the asset, or `null` if not found.
     */
    fun getJSONEntry(key: String): JSONObject? {
        val json = jsonObject ?: return null
        return if (json.has(key)) json.getJSONObject(key) else null
    }

    /**
     * Reads the raw byte data from `assets.bin` corresponding to an entry in `assets.json`.
     * Uses the `offset` and `length` fields in the JSON entry to extract the exact byte
     * range for the requested asset.
     *
     * @param key The unique asset key defined in `assets.json`.
     * @return A [ByteArray] containing the binary data for the asset, or `null` if the key
     * is missing or the read operation fails.
     */
    fun getEntryData(key: String): ByteArray? {
        val entry = getJSONEntry(key) ?: return null

        val offset = entry.optInt("offset", -1)
        val length = entry.optInt("length", -1)

        if (offset < 0 || length <= 0) {
            return null
        }

        return try {
            readAssetBytes(reactContext, offset, length)
        } catch (e: Exception) {
            null
        }
    }


    /**
     * Reads a specific byte range from the `assets.bin` file.
     * Skips forward to the given offset and reads `length` bytes.
     *
     * @param context The React context used to access the app's assets.
     * @param offset The byte offset within `assets.bin` to start reading from.
     * @param length The number of bytes to read.
     * @return A [ByteArray] containing the requested portion of the binary asset.
     * @throws IOException If the file cannot be read or skipped to the correct offset.
     */
    private fun readAssetBytes(context: ReactContext, offset: Int, length: Int): ByteArray {
        context.assets.open(ASSETS_BIN).use { input ->
            var skipped = 0L
            while (skipped < offset) {
                val result = input.skip((offset - skipped).toLong())
                if (result <= 0) throw IOException("Unable to skip to offset $offset in $ASSETS_BIN")
                skipped += result
            }

            // Read `length` bytes
            val buffer = ByteArray(length)
            var bytesRead = 0
            while (bytesRead < length) {
                val read = input.read(buffer, bytesRead, length - bytesRead)
                if (read == -1) break
                bytesRead += read
            }
            return buffer
        }
    }

    /**
     * Adds a resource item to the current [SessionReplayInternalResourceQueue].
     *
     * @param identifier A unique identifier for the resource.
     * @param resourceData The binary content of the resource to enqueue.
     * @param mimeType Optional MIME type describing the resource (e.g., `"image/png"` or `"image/svg+xml"`).
     */
    override fun addResourceItem(identifier: String, resourceData: ByteArray, mimeType: String?) {
        this.resourceQueue?.addResourceItem(identifier, resourceData, mimeType)
    }

    /**
     * Retrieves the current activity from the React context.
     * Used by the Session Replay system to access the active UI context when
     * registering lifecycle listeners.
     *
     * @return The currently active [Activity], or `null` if none is available.
     */
    override fun getCurrentActivity(): Activity? {
        return reactContext.currentActivity
    }

    /**
     * Sets the resource queue to be used by this callback.
     *
     * @param resourceQueue The [SessionReplayInternalResourceQueue] responsible
     * for handling resources.
     */
    override fun setResourceQueue(resourceQueue: SessionReplayInternalResourceQueue) {
        this.resourceQueue = resourceQueue
    }
}
