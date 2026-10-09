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
import com.datadog.android.rum.featureoperations.FailureReason
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import java.util.Locale

/**
 * The entry point to use Datadog's RUM feature.
 */
@Suppress("TooManyFunctions")
class DdRumImplementation internal constructor(
    private val datadog: DatadogWrapper = DatadogSDKWrapper(),
    private val heatmapActionHandler: HeatmapActionHandler = HeatmapActionHandler()
) {
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
     * @param touch The native touch data for tap actions, or null for other action types.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the action occurred (in milliseconds). If not provided, current timestamp will be used.
     */
    @Suppress("LongParameterList")
    fun addAction(
        type: String,
        name: String,
        touch: ReadableMap?,
        context: ReadableMap,
        timestampMs: Double,
        promise: Promise
    ) {
        val attributes = context.toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, timestampMs.toLong())
        }

        val eligibleAction = heatmapActionHandler.resolveEligibility(datadog, type, name, touch)
        if (eligibleAction == null) {
            addActionWithoutHeatmap(type, name, attributes)
            promise.resolve(null)
            return
        }

        // Resolve before dispatching heatmap work (iOS parity).
        promise.resolve(null)

        heatmapActionHandler.attachHeatmapData(eligibleAction, name, attributes) {
            addActionWithoutHeatmap(type, name, attributes)
        }
    }

    private fun addActionWithoutHeatmap(type: String, name: String, attributes: Map<String, Any?>) {
        datadog.getRumMonitor().addAction(
            type = type.asRumActionType(),
            name = name,
            attributes = attributes
        )
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
     * @param fingerprint A custom fingerprint to group this error with similar ones.
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
     * Adds a custom attribute to the active RUM View. It will be propagated to all future RUM events associated with the active View.
     * @param key: key for this view attribute.
     * @param value: value for this attribute.
     */
    fun addViewAttribute(key: String, value: ReadableMap, promise: Promise) {
        val attributeValue = value.toMap()["value"]
        val attributes = mutableMapOf<String, Any?>()
        attributes[key] = attributeValue
        datadog.getRumMonitor().addViewAttributes(attributes)
        promise.resolve(null)
    }

    /**
     * Removes an attribute from the active RUM View.
     * @param key: key for the attribute to be removed from the view.
     */
    fun removeViewAttribute(key: String, promise: Promise) {
        val keysToDelete: Collection<String> = listOf(key)
        datadog.getRumMonitor().removeViewAttributes(keysToDelete)
        promise.resolve(null)
    }

    /**
     * Adds multiple attributes to the active RUM View. They will be propagated to all future RUM events associated with the active View.
     * @param attributes: key/value object containing all attributes to be added to the view.
     */
    fun addViewAttributes(attributes: ReadableMap, promise: Promise) {
        datadog.getRumMonitor().addViewAttributes(attributes.toMap())
        promise.resolve(null)
    }

    /**
     * Removes multiple attributes from the active RUM View.
     * @param keys: keys for the attributes to be removed from the view.
     */
    fun removeViewAttributes(keys: ReadableArray, promise: Promise) {
        val keysToDelete = (0 until keys.size())
            .mapNotNull { keys.getString(it) }
        datadog.getRumMonitor().removeViewAttributes(keysToDelete)
        promise.resolve(null)
    }

    /**
     * Adds the loading time of the view to the active view.
     * It is calculated as the difference between the current time and the start time of the view.
     * @param overwrite: If true, overwrites the previously calculated view loading time.
     */
    fun addViewLoadingTime(overwrite: Boolean, promise: Promise) {
        datadog.getRumMonitor().addViewLoadingTime(overwrite)
        promise.resolve(null)
    }

    /**
     * This method can be used to mark the moment in time when the UI of the app is considered fully displayed.
     * The duration between the application launch and this moment of time will be shown as TTFD (time to full display)
     * in the RUM session explorer. Only the first call to this method will have any effect for a given RUM session.
     */
    fun reportAppFullyDisplayed(promise: Promise) {
        datadog.getRumMonitor().reportAppFullyDisplayed()
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

    /**
     * Starts a Feature Operation.
     *
     * @param name Human-readable operation name (e.g., "login_flow").
     * @param operationKey Optional key that uniquely identifies this operation instance.
     * @param attributes Additional attributes to attach to the operation.
     * @param promise Resolved with `null` when the call completes.
     */
    fun startFeatureOperation(name: String, operationKey: String? = null, attributes: ReadableMap, promise: Promise) {
        val attributesMap = attributes.toHashMap().toMutableMap()
        datadog.getRumMonitor().startFeatureOperation(name, operationKey, attributesMap);
        promise.resolve(null)
    }

    /**
     * Marks a Feature Operation as successfully completed.
     *
     * @param name The name of the feature operation (for example, `"login_flow"`).
     * @param operationKey The key of the operation instance to complete, if one was provided when starting it.
     * @param attributes A map of custom attributes to attach to this completion event.
     */
    fun succeedFeatureOperation(name: String, operationKey: String? = null, attributes: ReadableMap, promise: Promise) {
        val attributesMap = attributes.toHashMap().toMutableMap()
        datadog.getRumMonitor().succeedFeatureOperation(name, operationKey, attributesMap)
        promise.resolve(null)
    }


    /**
     * Marks a Feature Operation as failed.
     *
     * @param name The name of the feature operation (for example, `"login_flow"`).
     * @param operationKey The key of the operation instance to fail, if one was provided when starting it.
     * @param failureReason The reason for the failure. Possible values are defined in [FailureReason]
     *                      (e.g., `FailureReason.ERROR`, `FailureReason.ABANDONED`, `FailureReason.OTHER`).
     * @param attributes A map of custom attributes to attach to this failure event.
     */
    fun failFeatureOperation(
        name: String,
        operationKey: String? = null,
        failureReason: String,
        attributes: ReadableMap,
        promise: Promise
    ) {
        val attributesMap = attributes.toHashMap().toMutableMap()
        val reason = runCatching {
            enumValueOf<FailureReason>(failureReason.uppercase())
        }.getOrDefault(FailureReason.OTHER)

        datadog.getRumMonitor().failFeatureOperation(name, operationKey, reason, attributesMap)
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
            "custom" -> RumErrorSource.CUSTOM
            "report" -> RumErrorSource.REPORT
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

    @Suppress("UndocumentedPublicClass")
    companion object {
        private const val MISSING_RESOURCE_SIZE = -1L
        internal const val NAME = "DdRum"
    }
}
