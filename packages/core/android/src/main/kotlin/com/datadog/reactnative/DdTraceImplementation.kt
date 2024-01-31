/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.trace.AndroidTracer
import com.datadog.android.trace.Trace
import com.datadog.android.trace.TraceConfiguration
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import io.opentracing.Scope
import io.opentracing.Span
import io.opentracing.Tracer
import io.opentracing.util.GlobalTracer
import java.util.concurrent.TimeUnit

/**
 * The entry point to use Datadog's Trace feature.
 */
class DdTraceImplementation(
    private val tracerProvider: () -> Tracer = {
        val tracer = AndroidTracer.Builder().build()
        GlobalTracer.registerIfAbsent(tracer)

        GlobalTracer.get()
    }
) {
    private val spanMap: MutableMap<String, Span> = mutableMapOf()
    private val scopeMap: MutableMap<String, Scope> = mutableMapOf()

    // lazy here is on purpose. The thing is that this class will be instantiated even
    // before Sdk.initialize is called, but Tracer can be created only after SDK is initialized.
    private val tracer by lazy { tracerProvider.invoke() }

    /**
     * Start a span, and returns a unique identifier for the span.
     * @param operation The operation name of the span.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the operation started (in milliseconds). If not provided, current timestamp will be used.
     */
    fun startSpan(operation: String, context: ReadableMap, timestampMs: Double, promise: Promise) {
        val span = tracer.buildSpan(operation)
            .withStartTimestamp(TimeUnit.MILLISECONDS.toMicros(timestampMs.toLong()))
            .start()
        
        // This is required for traces to be able to be bundled with logs.
        val scope = tracer.scopeManager().activate(span)

        val spanContext = span.context()

        span.setTags(context.toHashMap())
        span.setTags(GlobalState.globalAttributes)
        val spanId = spanContext.toSpanId()
        spanMap[spanId] = span
        scopeMap[spanId] = scope

        promise.resolve(spanId)
    }

    /**
     * Finish a started span.
     * @param spanId The unique identifier of the span.
     * @param context The additional context to send.
     * @param timestampMs The timestamp when the operation stopped (in milliseconds). If not provided, current timestamp will be used.
     */
    fun finishSpan(spanId: String, context: ReadableMap, timestampMs: Double, promise: Promise) {
        val scope = scopeMap.remove(spanId)
        scope?.close()

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
        for ((key, value) in tags) {
            when (value) {
                is Boolean -> setTag(key, value)
                is Number -> setTag(key, value)
                is String -> setTag(key, value)
                else -> setTag(key, value?.toString())
            }
        }
    }

    companion object {
        internal const val NAME = "DdTrace"
    }
}
