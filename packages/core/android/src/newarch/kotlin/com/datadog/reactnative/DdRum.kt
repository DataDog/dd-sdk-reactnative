/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.rum.featureoperations.FailureReason
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.ViewUtil

/**
 * The entry point to use Datadog's RUM feature.
 */
@Suppress("TooManyFunctions")
class DdRum(
    reactContext: ReactApplicationContext,
    datadogWrapper: DatadogWrapper = DatadogSDKWrapper()
) : NativeDdRumSpec(reactContext) {

    private val telemetry = DdTelemetry()

    private val implementation = DdRumImplementation(
        datadog = datadogWrapper,
        heatmapActionHandler = HeatmapActionHandler(
            heatmapTouchResolver = HeatmapTouchResolver(viewResolver = { reactTag ->
                try {
                    val uiManagerType = ViewUtil.getUIManagerType(reactTag)
                    UIManagerHelper.getUIManager(reactApplicationContext, uiManagerType)
                        ?.resolveView(reactTag)
                } catch (e: Exception) {
                    telemetry.telemetryError("Failed to resolve view for heatmap tracking", e)
                    null
                }
            })
        )
    )

    override fun getName(): String = DdRumImplementation.NAME

    /**
     * Start tracking a RUM View.
     * @param key The view unique key identifier.
     * @param name The view name.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the view started (in milliseconds). If not provided,
     * current timestamp will be used.
     */
    @ReactMethod
    override fun startView(
        key: String,
        name: String,
        context: ReadableMap,
        timestampMs: Double,
        promise: Promise
    ) {
        implementation.startView(key, name, context, timestampMs, promise)
    }

    /**
     * Stop tracking a RUM View.
     * @param key The view unique key identifier.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the view stopped (in milliseconds).
     * If not provided, current timestamp will be used.
     */
    @ReactMethod
    override fun stopView(
        key: String,
        context: ReadableMap,
        timestampMs: Double,
        promise: Promise
    ) {
        implementation.stopView(key, context, timestampMs, promise)
    }

    /**
     * Start tracking a RUM Action.
     * @param type The action type (tap, scroll, swipe, click, custom).
     * @param name The action name.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the action started (in milliseconds).
     * If not provided, current timestamp will be used.
     */
    @ReactMethod
    override fun startAction(
        type: String,
        name: String,
        context: ReadableMap,
        timestampMs: Double,
        promise: Promise
    ) {
        implementation.startAction(type, name, context, timestampMs, promise)
    }

    /**
     * Stop tracking the ongoing RUM Action.
     * @param type The action type (tap, scroll, swipe, click, custom).
     * @param name The action name.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the action stopped (in milliseconds).
     * If not provided, current timestamp will be used.
     */
    @ReactMethod
    override fun stopAction(
        type: String,
        name: String,
        context: ReadableMap,
        timestampMs: Double,
        promise: Promise
    ) {
        implementation.stopAction(type, name, context, timestampMs, promise)
    }

    /**
     * Add a RUM Action.
     * @param type The action type (tap, scroll, swipe, click, custom).
     * @param name The action name.
     * @param touch The native touch data for tap actions, or null for other action types.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the action occurred (in milliseconds).
     * If not provided, current timestamp will be used.
     */
    @Suppress("LongParameterList")
    @ReactMethod
    override fun addAction(
        type: String,
        name: String,
        touch: ReadableMap?,
        context: ReadableMap,
        timestampMs: Double,
        promise: Promise
    ) {
        implementation.addAction(type, name, touch, context, timestampMs, promise)
    }

    /**
     * Start tracking a RUM Resource.
     * @param key The resource unique key identifier.
     * @param method The resource method (GET, POST, …).
     * @param url The resource url.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the resource started (in milliseconds).
     * If not provided, current timestamp will be used.
     */
    @Suppress("LongParameterList")
    @ReactMethod
    override fun startResource(
        key: String,
        method: String,
        url: String,
        context: ReadableMap,
        timestampMs: Double,
        promise: Promise
    ) {
        implementation.startResource(key, method, url, context, timestampMs, promise)
    }

    /**
     * Stop tracking a RUM Resource.
     * @param key The resource unique key identifier.
     * @param statusCode The resource status code.
     * @param kind The resource's kind (xhr, document, image, css, font, …).
     * @param size The resource size in bytes.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the resource stopped (in milliseconds).
     * If not provided, current timestamp will be used.
     */
    @Suppress("LongParameterList")
    @ReactMethod
    override fun stopResource(
        key: String,
        statusCode: Double,
        kind: String,
        size: Double,
        context: ReadableMap,
        timestampMs: Double,
        promise: Promise
    ) {
        implementation.stopResource(key, statusCode, kind, size, context, timestampMs, promise)
    }

    /**
     * Add a RUM Error.
     * @param message The error message.
     * @param source The error source (network, source, console, logger, …).
     * @param stacktrace The error stacktrace.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the error occurred (in milliseconds).
     * If not provided, current timestamp will be used.
     */
    @Suppress("LongParameterList")
    @ReactMethod
    override fun addError(
        message: String,
        source: String,
        stacktrace: String,
        context: ReadableMap,
        timestampMs: Double,
        fingerprint: String,
        promise: Promise
    ) {
        implementation.addError(
            message,
            source,
            stacktrace,
            context,
            timestampMs,
            fingerprint,
            promise
        )
    }

    /**
     * Adds a specific timing in the active View. The timing duration will be computed as the
     * difference between the time the View was started and the time this function was called.
     * @param name The name of the new custom timing attribute.
     * Timings can be nested up to 8 levels deep.
     * Names using more than 8 levels will be sanitized by SDK.
     */
    @ReactMethod
    override fun addTiming(name: String, promise: Promise) {
        implementation.addTiming(name, promise)
    }

    /**
     * Adds a custom attribute to the active RUM View. It will be propagated to all future RUM events associated with the active View.
     * @param key: key for this view attribute.
     * @param value: value for this attribute.
     */
    @ReactMethod
    override fun addViewAttribute(key: String, value: ReadableMap, promise: Promise) {
        implementation.addViewAttribute(key, value, promise)
    }

    /**
     * Removes an attribute from the active RUM View.
     * @param key: key for the attribute to be removed from the view.
     */
    @ReactMethod
    override fun removeViewAttribute(key: String, promise: Promise) {
        implementation.removeViewAttribute(key, promise)
    }

    /**
     * Adds multiple attributes to the active RUM View. They will be propagated to all future RUM events associated with the active View.
     * @param attributes: key/value object containing all attributes to be added to the view.
     */
    @ReactMethod
    override fun addViewAttributes(attributes: ReadableMap, promise: Promise) {
        implementation.addViewAttributes(attributes, promise)
    }

    /**
     * Removes multiple attributes from the active RUM View.
     * @param keys: keys for the attributes to be removed from the view.
     */
    @ReactMethod
    override fun removeViewAttributes(keys: ReadableArray, promise: Promise) {
        implementation.removeViewAttributes(keys, promise)
    }

    /**
     * Adds the loading time of the view to the active view.
     * It is calculated as the difference between the current time and the start time of the view.
     * @param overwrite: If true, overwrites the previously calculated view loading time.
     */
    @ReactMethod
    override fun addViewLoadingTime(overwrite: Boolean, promise: Promise) {
        implementation.addViewLoadingTime(overwrite, promise)
    }

    /**
     * This method can be used to mark the moment in time when the UI of the app is considered fully displayed.
     * The duration between the application launch and this moment of time will be shown as TTFD (time to full display)
     * in the RUM session explorer. Only the first call to this method will have any effect for a given RUM session.
     */
    @ReactMethod
    override fun reportAppFullyDisplayed(promise: Promise) {
        implementation.reportAppFullyDisplayed(promise)
    }

    /**
     * Stops the current RUM Session.
     */
    @ReactMethod
    override fun stopSession(promise: Promise) {
        implementation.stopSession(promise)
    }

    /**
     * Adds result of evaluating a feature flag to the view.
     * Feature flag evaluations are local to the active view and are cleared when the view
     * is stopped.
     * @param name The name of the feature flag
     * @param value The value the feature flag evaluated to, encapsulated in a Map
     */
    @ReactMethod
    override fun addFeatureFlagEvaluation(name: String, value: ReadableMap, promise: Promise) {
        implementation.addFeatureFlagEvaluation(name, value, promise)
    }

    /**
     * Returns current session ID, or null if unavailable.
     */
    @ReactMethod
    override fun getCurrentSessionId(promise: Promise) {
        implementation.getCurrentSessionId(promise)
    }

    /**
     * Starts a RUM Feature Operation.
     *
     * @param name Human-readable operation name (e.g., "login_flow").
     * @param operationKey Optional key that uniquely identifies this operation instance.
     * @param attributes Additional attributes to attach to the operation.
     * @param promise Resolved with `null` when the call completes.
     */
    @ReactMethod
    override fun startFeatureOperation(
        name: String,
        operationKey: String?,
        attributes: ReadableMap,
        promise: Promise
    ) {
        implementation.startFeatureOperation(name, operationKey, attributes, promise)
    }

    /**
     * Marks a Feature Operation as successfully completed.
     *
     * @param name The name of the feature operation (for example, `"login_flow"`).
     * @param operationKey The key of the operation instance to complete, if one was provided when starting it.
     * @param attributes A map of custom attributes to attach to this completion event.
     */
    @ReactMethod
    override fun succeedFeatureOperation(
        name: String,
        operationKey: String?,
        attributes: ReadableMap,
        promise: Promise
    ) {
        implementation.succeedFeatureOperation(name, operationKey, attributes, promise)
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
    @ReactMethod
    override fun failFeatureOperation(
        name: String,
        operationKey: String?,
        failureReason: String,
        attributes: ReadableMap,
        promise: Promise
    ) {
        implementation.failFeatureOperation(name, operationKey, failureReason, attributes, promise)
    }
}
