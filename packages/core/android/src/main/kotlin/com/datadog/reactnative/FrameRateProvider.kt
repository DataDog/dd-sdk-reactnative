/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.view.Choreographer

internal class FrameRateProvider(
    reactFrameRateCallback: ((Double) -> Unit),
    jsThreadExecutor: JsThreadExecutor
) {
    private val frameCallback: FpsFrameCallback = FpsFrameCallback(
        reactFrameRateCallback,
        jsThreadExecutor
    )

    fun start() {
        frameCallback.reset()
        frameCallback.start()
    }

    fun stop() {
        frameCallback.stop()
    }
}

internal class FpsFrameCallback(
    private val reactFrameRateCallback: ((Double) -> Unit),
    private val jsThreadExecutor: JsThreadExecutor
) : Choreographer.FrameCallback {

    private var choreographer: Choreographer? = null
    private var lastFrameTime = -1L

    override fun doFrame(time: Long) {
        if (lastFrameTime != -1L) {
            reactFrameRateCallback((time - lastFrameTime).toDouble())
        }
        lastFrameTime = time
        choreographer?.postFrameCallback(this)
    }

    @Suppress("SwallowedException")
    fun start() {
        // Choreographer is thread-local: we register on the JS thread so frame callbacks
        // measure JS frame timings, matching the iOS CADisplayLink-on-JS-RunLoop approach.
        jsThreadExecutor.runOnJsThread {
            try {
                val instance = Choreographer.getInstance()
                instance.removeFrameCallback(this@FpsFrameCallback)
                choreographer = instance
                instance.postFrameCallback(this@FpsFrameCallback)
            } catch (e: IllegalStateException) {
                // Choreographer requires a Looper; guard defensively in case the JS thread lacks one.
            }
        }
    }

    fun stop() {
        jsThreadExecutor.runOnJsThread {
            choreographer?.removeFrameCallback(this@FpsFrameCallback)
        }
    }

    fun reset() {
        lastFrameTime = -1L
    }
}
