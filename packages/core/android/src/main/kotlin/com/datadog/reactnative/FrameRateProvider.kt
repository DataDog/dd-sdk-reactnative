/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.view.Choreographer

internal class FrameRateProvider(
    reactFrameRateCallback: ((Double) -> Unit),
    uiThreadExecutor: UiThreadExecutor
) {
    private val frameCallback: FpsFrameCallback = FpsFrameCallback(
        reactFrameRateCallback,
        uiThreadExecutor
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
    private val uiThreadExecutor: UiThreadExecutor
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

    fun start() {
        uiThreadExecutor.runOnUiThread {
            choreographer = Choreographer.getInstance()
            choreographer?.postFrameCallback(this@FpsFrameCallback)
        }
    }

    fun stop() {
        uiThreadExecutor.runOnUiThread {
            choreographer = Choreographer.getInstance()
            choreographer?.removeFrameCallback(this@FpsFrameCallback)
        }
    }

    fun reset() {
        lastFrameTime = -1L
    }
}
