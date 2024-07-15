/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.util.Log
import com.datadog.android.rum.RumActionType
import com.datadog.android.rum.RumAttributes
import com.datadog.android.rum.RumErrorSource
import com.datadog.android.rum.RumResourceKind
import com.datadog.android.rum.RumResourceMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import java.util.Locale

/**
 * The entry point to use Datadog's RUM feature.
 */
@Suppress("TooManyFunctions")
class DdRumImplementation(private val datadog: DatadogWrapper = DatadogSDKWrapper()) {
    /**
     * Start tracking a RUM View.
     * @param key The view unique key identifier.
     * @param name The view name.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the view started (in milliseconds). If not provided, current timestamp will be used.
     */
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
        datadog.getRumMonitor().startView(
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
    fun stopView(key: String, context: ReadableMap, timestampMs: Double, promise: Promise) {
        val attributes = context.toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, timestampMs.toLong())
        }
        datadog.getRumMonitor().stopView(
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
        datadog.getRumMonitor().startAction(
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
        datadog.getRumMonitor().stopAction(
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
        datadog.getRumMonitor().addAction(
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
        datadog.getRumMonitor().startResource(
            key = key,
            method = method.asRumResourceMethod(),
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
        datadog.getRumMonitor().stopResource(
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
    fun addError(
        message: String,
        source: String,
        stacktrace: String,
        context: ReadableMap,
        timestampMs: Double,
        fingerprint: String,
        promise: Promise
    ) {
        val attributes = context.toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, timestampMs.toLong())
        }

        if (fingerprint.isNotEmpty()) {
            attributes[RumAttributes.ERROR_FINGERPRINT] = fingerprint
        }

        datadog.getRumMonitor().addErrorWithStacktrace(
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
    fun addTiming(name: String, promise: Promise) {
        datadog.getRumMonitor().addTiming(name)
        promise.resolve(null)
    }

    /**
     * Stops the current RUM Session.
     */
    fun stopSession(promise: Promise) {
        datadog.getRumMonitor().stopSession()
        promise.resolve(null)
    }

    /**
     * Adds result of evaluating a feature flag to the view.
     * Feature flag evaluations are local to the active view and are cleared when the view is stopped.
     * @param name The name of the feature flag
     * @param valueAsMap The value the feature flag evaluated to, encapsulated in a Map
     */
    fun addFeatureFlagEvaluation(name: String, valueAsMap: ReadableMap, promise: Promise) {
        val value = valueAsMap.toHashMap()["value"]
        if (value != null) {
            datadog.getRumMonitor().addFeatureFlagEvaluation(name, value)
        }
        promise.resolve(null)
    }

    /**
     * Returns current session ID, or null if unavailable.
     */
    fun getCurrentSessionId(promise: Promise) {
        datadog.getRumMonitor().getCurrentSessionId {
            promise.resolve(it)
        }
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

    private fun String.asRumResourceMethod(): RumResourceMethod {
        return when(lowercase(Locale.US)) {
            "get" -> RumResourceMethod.GET
            "delete" -> RumResourceMethod.DELETE
            "head" -> RumResourceMethod.HEAD
            "patch" -> RumResourceMethod.PATCH
            "put" -> RumResourceMethod.PUT
            "post" -> RumResourceMethod.POST
            "trace" -> RumResourceMethod.TRACE
            "options" -> RumResourceMethod.OPTIONS
            "connect" -> RumResourceMethod.CONNECT
            else -> {
                Log.w(
                    DdRum::class.java.canonicalName,
                    "Unknown RUM resource method given: $this, " +
                            "using ${RumResourceMethod.GET} as default"
                )
                RumResourceMethod.GET
            }
        }
    }

    // endregion

    companion object {
        private const val MISSING_RESOURCE_SIZE = -1L
        internal const val NAME = "DdRum"
    }
}
