/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.tracing.AndroidTracer
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import io.opentracing.Span
import io.opentracing.Tracer
import java.util.concurrent.TimeUnit


/**
 * The entry point to use Datadog's Trace feature.
 */
class DdTrace(reactContext: ReactApplicationContext, private val tracerProvider: () -> Tracer = { AndroidTracer.Builder().build() }) : ReactContextBaseJavaModule(reactContext) {

    private val spanMap: MutableMap<String, Span> = mutableMapOf()

    // lazy here is on purpose. The thing is that this class will be instantiated even
    // before Sdk.initialize is called, but Tracer can be created only after SDK is initialized.
    private val tracer by lazy { tracerProvider.invoke() }

    override fun getName(): String = "DdTrace"

    /**
     * Start a span, and returns a unique identifier for the span.
     * @param operation The operation name of the span.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the operation started (in milliseconds). If not provided, current timestamp will be used.
     */
    @ReactMethod
    fun startSpan(operation: String, context: ReadableMap, timestampMs: Long, promise: Promise) {
        val span = tracer.buildSpan(operation)
            .withStartTimestamp(TimeUnit.MILLISECONDS.toMicros(timestampMs.toLong()))
            .start()
        val spanContext = span.context()

        span.setTags(context.toHashMap())
        span.setTags(GlobalState.globalAttributes)
        val spanId = spanContext.toSpanId()
        spanMap[spanId] = span

        promise.resolve(spanId)
    }

    /**
     * Finish a started span.
     * @param spanId The unique identifier of the span.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the operation stopped (in milliseconds). If not provided, current timestamp will be used.
     */
    @ReactMethod
    fun finishSpan(spanId: String, context: ReadableMap, timestampMs: Long, promise: Promise) {
        val span = spanMap.remove(spanId)
        if (span == null) {
            promise.resolve(null)
            return
        }
        span.setTags(context.toHashMap())
        span.setTags(GlobalState.globalAttributes)
        span.finish(TimeUnit.MILLISECONDS.toMicros(timestampMs.toLong()))

        promise.resolve(null)
    }

    private fun Span.setTags(tags: Map<String, Any?>) {
        tags.forEach { (key, value) ->
            when (value) {
                is Boolean -> setTag(key, value)
                is Number -> setTag(key, value)
                is String -> setTag(key, value)
                else -> setTag(key, value?.toString())
            }
        }
    }
}
