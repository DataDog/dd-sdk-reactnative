/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.facebook.fbreact.specs.NativeDdTraceSpec
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

/**
 * The entry point to use Datadog's Trace feature.
 */
class DdTrace(
    reactContext: ReactApplicationContext,
) : NativeDdTraceSpec(reactContext) {

    private val implementation = DdTraceImplementation()

    override fun getName(): String = DdTraceImplementation.NAME

    /**
     * Start a span, and returns a unique identifier for the span.
     * @param operation The operation name of the span.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the operation started (in milliseconds).
     * If not provided, current timestamp will be used.
     */
    @ReactMethod
    override fun startSpan(operation: String, context: ReadableMap, timestampMs: Double, promise: Promise) {
        implementation.startSpan(operation, context, timestampMs, promise)
    }

    /**
     * Finish a started span.
     * @param spanId The unique identifier of the span.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the operation stopped (in milliseconds).
     * If not provided, current timestamp will be used.
     */
    @ReactMethod
    override fun finishSpan(spanId: String, context: ReadableMap, timestampMs: Double, promise: Promise) {
        implementation.finishSpan(spanId, context, timestampMs, promise)
    }
}
