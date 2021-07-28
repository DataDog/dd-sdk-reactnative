/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.bridge.DdBridge
import com.datadog.android.bridge.DdRum as SDKDdRum
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

/**
 * The entry point to use Datadog's RUM feature.
 */
class DdRum(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val nativeInstance: SDKDdRum = DdBridge.getDdRum(reactContext)

    override fun getName(): String = "DdRum"

    /**
     * Start tracking a RUM View.
     * @param key The view unique key identifier.
     * @param name The view name.
     * @param timestampMs The timestamp when the view started (in milliseconds).
     * @param context The additional context to send.
     */
    @ReactMethod
    fun startView(key: String, name: String, timestampMs: Double, context: ReadableMap, promise: Promise) {
        nativeInstance.startView(key, name, timestampMs.toLong(), context.toHashMap())
        promise.resolve(null)
    }

    /**
     * Stop tracking a RUM View.
     * @param key The view unique key identifier.
     * @param timestampMs The timestamp when the view stopped (in milliseconds).
     * @param context The additional context to send.
     */
    @ReactMethod
    fun stopView(key: String, timestampMs: Double, context: ReadableMap, promise: Promise) {
        nativeInstance.stopView(key, timestampMs.toLong(), context.toHashMap())
        promise.resolve(null)
    }

    /**
     * Start tracking a RUM Action.
     * @param type The action type (tap, scroll, swipe, click, custom).
     * @param name The action name.
     * @param timestampMs The timestamp when the action started (in milliseconds).
     * @param context The additional context to send.
     */
    @ReactMethod
    fun startAction(type: String, name: String, timestampMs: Double, context: ReadableMap, promise: Promise) {
        nativeInstance.startAction(type, name, timestampMs.toLong(), context.toHashMap())
        promise.resolve(null)
    }

    /**
     * Stop tracking the ongoing RUM Action.
     * @param timestampMs The timestamp when the action stopped (in milliseconds).
     * @param context The additional context to send.
     */
    @ReactMethod
    fun stopAction(timestampMs: Double, context: ReadableMap, promise: Promise) {
        nativeInstance.stopAction(timestampMs.toLong(), context.toHashMap())
        promise.resolve(null)
    }

    /**
     * Add a RUM Action.
     * @param type The action type (tap, scroll, swipe, click, custom).
     * @param name The action name.
     * @param timestampMs The timestamp when the action occurred (in milliseconds).
     * @param context The additional context to send.
     */
    @ReactMethod
    fun addAction(type: String, name: String, timestampMs: Double, context: ReadableMap, promise: Promise) {
        nativeInstance.addAction(type, name, timestampMs.toLong(), context.toHashMap())
        promise.resolve(null)
    }

    /**
     * Start tracking a RUM Resource.
     * @param key The resource unique key identifier.
     * @param method The resource method (GET, POST, …).
     * @param url The resource url.
     * @param timestampMs The timestamp when the resource started (in milliseconds).
     * @param context The additional context to send.
     */
    @ReactMethod
    fun startResource(key: String, method: String, url: String, timestampMs: Double, context: ReadableMap, promise: Promise) {
        nativeInstance.startResource(key, method, url, timestampMs.toLong(), context.toHashMap())
        promise.resolve(null)
    }

    /**
     * Stop tracking a RUM Resource.
     * @param key The resource unique key identifier.
     * @param statusCode The resource status code.
     * @param kind The resource's kind (xhr, document, image, css, font, …).
     * @param timestampMs The timestamp when the resource stopped (in milliseconds).
     * @param context The additional context to send.
     */
    @ReactMethod
    fun stopResource(key: String, statusCode: Double, kind: String, timestampMs: Double, context: ReadableMap, promise: Promise) {
        nativeInstance.stopResource(key, statusCode.toLong(), kind, timestampMs.toLong(), context.toHashMap())
        promise.resolve(null)
    }

    /**
     * Add a RUM Error.
     * @param message The error message.
     * @param source The error source (network, source, console, logger, …).
     * @param stacktrace The error stacktrace.
     * @param timestampMs The timestamp when the error occurred (in milliseconds).
     * @param context The additional context to send.
     */
    @ReactMethod
    fun addError(message: String, source: String, stacktrace: String, timestampMs: Double, context: ReadableMap, promise: Promise) {
        nativeInstance.addError(message, source, stacktrace, timestampMs.toLong(), context.toHashMap())
        promise.resolve(null)
    }

    /**
     * Adds a specific timing in the active View. The timing duration will be computed as the difference between the time the View was started and the time this function was called.
     * @param name The name of the new custom timing attribute. Timings can be nested up to 8 levels deep. Names using more than 8 levels will be sanitized by SDK.
     */
    @ReactMethod
    fun addTiming(name: String, promise: Promise) {
        nativeInstance.addTiming(name)
        promise.resolve(null)
    }

}
