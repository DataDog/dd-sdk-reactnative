/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.rum.GlobalRum
import com.datadog.android.rum.RumActionType
import com.datadog.android.rum.RumAttributes
import com.datadog.android.rum.RumErrorSource
import com.datadog.android.rum.RumResourceKind
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.util.Locale

/**
 * The entry point to use Datadog's RUM feature.
 */
@Suppress("TooManyFunctions")
class DdRum(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DdRum"

    /**
     * Start tracking a RUM View.
     * @param key The view unique key identifier.
     * @param name The view name.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the view started (in milliseconds). If not provided, current timestamp will be used.
     */
    @ReactMethod
    fun startView(
        key: String,
        name: String,
        context: ReadableMap,
        timestampMs: Double,
        promise: Promise
    ) {
        val attributes = context.toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, timestampMs.toLong())
        }
        GlobalRum.get().startView(
            key = key,
            name = name,
            attributes = attributes
        )
        promise.resolve(null)
    }

    /**
     * Stop tracking a RUM View.
     * @param key The view unique key identifier.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the view stopped (in milliseconds). If not provided, current timestamp will be used.
     */
    @ReactMethod
    fun stopView(key: String, context: ReadableMap, timestampMs: Double, promise: Promise) {
        val attributes = context.toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, timestampMs.toLong())
        }
        GlobalRum.get().stopView(
            key = key,
            attributes = attributes
        )
        promise.resolve(null)
    }

    /**
     * Start tracking a RUM Action.
     * @param type The action type (tap, scroll, swipe, click, custom).
     * @param name The action name.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the action started (in milliseconds). If not provided, current timestamp will be used.
     */
    @ReactMethod
    fun startAction(
        type: String,
        name: String,
        context: ReadableMap,
        timestampMs: Double,
        promise: Promise
    ) {
        val attributes = context.toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, timestampMs.toLong())
        }
        GlobalRum.get().startUserAction(
            type = type.asRumActionType(),
            name = name,
            attributes = attributes
        )
        promise.resolve(null)
    }

    /**
     * Stop tracking the ongoing RUM Action.
     * @param type The action type (tap, scroll, swipe, click, custom).
     * @param name The action name.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the action stopped (in milliseconds). If not provided, current timestamp will be used.
     */
    @ReactMethod
    fun stopAction(
        type: String,
        name: String,
        context: ReadableMap,
        timestampMs: Double,
        promise: Promise
    ) {
        val attributes = context.toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, timestampMs.toLong())
        }
        GlobalRum.get().stopUserAction(
            type = type.asRumActionType(),
            name = name,
            attributes = attributes
        )
        promise.resolve(null)
    }

    /**
     * Add a RUM Action.
     * @param type The action type (tap, scroll, swipe, click, custom).
     * @param name The action name.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the action occurred (in milliseconds). If not provided, current timestamp will be used.
     */
    @ReactMethod
    fun addAction(
        type: String,
        name: String,
        context: ReadableMap,
        timestampMs: Double,
        promise: Promise
    ) {
        val attributes = context.toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, timestampMs.toLong())
        }
        GlobalRum.get().addUserAction(
            type = type.asRumActionType(),
            name = name,
            attributes = attributes
        )
        promise.resolve(null)
    }

    /**
     * Start tracking a RUM Resource.
     * @param key The resource unique key identifier.
     * @param method The resource method (GET, POST, …).
     * @param url The resource url.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the resource started (in milliseconds). If not provided, current timestamp will be used.
     */
    @Suppress("LongParameterList")
    @ReactMethod
    fun startResource(
        key: String,
        method: String,
        url: String,
        context: ReadableMap,
        timestampMs: Double,
        promise: Promise
    ) {
        val attributes = context.toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, timestampMs.toLong())
        }
        GlobalRum.get().startResource(
            key = key,
            method = method,
            url = url,
            attributes = attributes
        )
        promise.resolve(null)
    }

    /**
     * Stop tracking a RUM Resource.
     * @param key The resource unique key identifier.
     * @param statusCode The resource status code.
     * @param kind The resource's kind (xhr, document, image, css, font, …).
     * @param size The resource size in bytes.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the resource stopped (in milliseconds). If not provided, current timestamp will be used.
     */
    @Suppress("LongParameterList")
    @ReactMethod
    fun stopResource(
        key: String,
        statusCode: Double,
        kind: String,
        size: Double,
        context: ReadableMap,
        timestampMs: Double,
        promise: Promise
    ) {
        val attributes = context.toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, timestampMs.toLong())
        }
        val resourceSize = if (size.toLong() == MISSING_RESOURCE_SIZE) {
            null
        } else {
            size.toLong()
        }
        GlobalRum.get().stopResource(
            key = key,
            statusCode = statusCode.toInt(),
            kind = kind.asRumResourceKind(),
            size = resourceSize,
            attributes = attributes
        )
        promise.resolve(null)
    }

    /**
     * Add a RUM Error.
     * @param message The error message.
     * @param source The error source (network, source, console, logger, …).
     * @param stacktrace The error stacktrace.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the error occurred (in milliseconds). If not provided, current timestamp will be used.
     */
    @Suppress("LongParameterList")
    @ReactMethod
    fun addError(
        message: String,
        source: String,
        stacktrace: String,
        context: ReadableMap,
        timestampMs: Double,
        promise: Promise
    ) {
        val attributes = context.toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, timestampMs.toLong())
        }
        GlobalRum.get().addErrorWithStacktrace(
            message = message,
            source = source.asErrorSource(),
            stacktrace = stacktrace,
            attributes = attributes
        )
        promise.resolve(null)
    }

    /**
     * Adds a specific timing in the active View. The timing duration will be computed as the difference between the time the View was started and the time this function was called.
     * @param name The name of the new custom timing attribute. Timings can be nested up to 8 levels deep. Names using more than 8 levels will be sanitized by SDK.
     */
    @ReactMethod
    fun addTiming(name: String, promise: Promise) {
        GlobalRum.get().addTiming(name)
        promise.resolve(null)
    }

    /**
     * Stops the current RUM Session.
     */
    @ReactMethod
    fun stopSession(promise: Promise) {
        GlobalRum.get().stopSession()
        promise.resolve(null)
    }

    /**
     * Adds result of evaluating a feature flag to the view.
     * Feature flag evaluations are local to the active view and are cleared when the view is stopped.
     * @param name The name of the feature flag
     * @param value The value the feature flag evaluated to, encapsulated in a Map
     */
    @ReactMethod
    fun addFeatureFlagEvaluation(name: String, value: ReadableMap, promise: Promise) {
        val value = value.toHashMap()["value"]
        if (value != null) {
            GlobalRum.get().addFeatureFlagEvaluation(name, value)
        }
        promise.resolve(null)
    }

    // region Internal

    private fun String.asRumActionType(): RumActionType {
        return when (lowercase(Locale.US)) {
            "tap" -> RumActionType.TAP
            "scroll" -> RumActionType.SCROLL
            "swipe" -> RumActionType.SWIPE
            "click" -> RumActionType.CLICK
            "back" -> RumActionType.BACK
            else -> RumActionType.CUSTOM
        }
    }

    private fun String.asRumResourceKind(): RumResourceKind {
        return when (lowercase(Locale.US)) {
            "xhr" -> RumResourceKind.XHR
            "native" -> RumResourceKind.NATIVE
            "fetch" -> RumResourceKind.FETCH
            "document" -> RumResourceKind.DOCUMENT
            "beacon" -> RumResourceKind.BEACON
            "js" -> RumResourceKind.JS
            "image" -> RumResourceKind.IMAGE
            "font" -> RumResourceKind.FONT
            "css" -> RumResourceKind.CSS
            "media" -> RumResourceKind.MEDIA
            "other" -> RumResourceKind.OTHER
            else -> RumResourceKind.UNKNOWN
        }
    }

    private fun String.asErrorSource(): RumErrorSource {
        return when (lowercase(Locale.US)) {
            "agent" -> RumErrorSource.AGENT
            "console" -> RumErrorSource.CONSOLE
            "logger" -> RumErrorSource.LOGGER
            "network" -> RumErrorSource.NETWORK
            "source" -> RumErrorSource.SOURCE
            "webview" -> RumErrorSource.WEBVIEW
            else -> RumErrorSource.SOURCE
        }
    }

    // endregion

    companion object {
        private const val MISSING_RESOURCE_SIZE = -1L
    }
}
