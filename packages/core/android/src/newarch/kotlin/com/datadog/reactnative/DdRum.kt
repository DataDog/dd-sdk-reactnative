/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

/**
 * The entry point to use Datadog's RUM feature.
 */
@Suppress("TooManyFunctions")
class DdRum(
    reactContext: ReactApplicationContext,
    datadogWrapper: DatadogWrapper = DatadogSDKWrapper()
) : NativeDdRumSpec(reactContext) {

    private val implementation = DdRumImplementation(datadog = datadogWrapper)

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
    override fun stopView(key: String, context: ReadableMap, timestampMs: Double, promise: Promise) {
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
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the action occurred (in milliseconds).
     * If not provided, current timestamp will be used.
     */
    @ReactMethod
    override fun addAction(
        type: String,
        name: String,
        context: ReadableMap,
        timestampMs: Double,
        promise: Promise
    ) {
        implementation.addAction(type, name, context, timestampMs, promise)
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
}
