/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.bridge.DdBridge
import com.datadog.android.bridge.DdTrace as SDKDdTrace
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

/**
 * The entry point to use Datadog's Trace feature.
 */
class DdTrace(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val nativeInstance: SDKDdTrace = DdBridge.getDdTrace(reactContext)

    override fun getName(): String = "DdTrace"

    /**
     * Start a span, and returns a unique identifier for the span.
     * @param operation The operation name of the span.
     * @param timestamp The timestamp when the operation started.
     * @param context The additional context to send.
     */
    @ReactMethod
    fun startSpan(operation: String, timestamp: Double, context: ReadableMap, promise: Promise) {
        val result = nativeInstance.startSpan(operation, timestamp.toLong(), context.toHashMap())
        promise.resolve(result)
    }

    /**
     * Finish a started span.
     * @param spanId The unique identifier of the span.
     * @param timestamp The timestamp when the operation stopped.
     * @param context The additional context to send.
     */
    @ReactMethod
    fun finishSpan(spanId: String, timestamp: Double, context: ReadableMap, promise: Promise) {
        nativeInstance.finishSpan(spanId, timestamp.toLong(), context.toHashMap())
        promise.resolve(null)
    }

}
