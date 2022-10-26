/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.view.Choreographer
import com.datadog.android.rum.GlobalRum
import com.datadog.android.rum.RumPerformanceMetric
import java.util.concurrent.TimeUnit

/**
 * Reads the javascript framerate based on the [Choreographer.FrameCallback].
 */
internal class VitalFrameCallback(
    private val monitorJsRefreshRate: Boolean,
    private val keepRunning: () -> Boolean
) : Choreographer.FrameCallback {

    internal var lastFrameTimestampNs: Long = 0L
    internal val longTaskThresholdNS = TimeUnit.MILLISECONDS.toNanos(100L)

    // region Choreographer.FrameCallback

    override fun doFrame(frameTimeNanos: Long) {
        if (lastFrameTimestampNs != 0L) {
            val durationNs = (frameTimeNanos - lastFrameTimestampNs).toDouble()
            if (monitorJsRefreshRate && durationNs > 0.0) {
                GlobalRum.get()._getInternal()?.updatePerformanceMetric(RumPerformanceMetric.JS_FRAME_TIME, durationNs)
            }
            if (durationNs > longTaskThresholdNS) {
                // TODO: report long task
            }
        }
        lastFrameTimestampNs = frameTimeNanos

        if (keepRunning()) {
            try {
                Choreographer.getInstance().postFrameCallback(this)
            } catch (e: IllegalStateException) {
                // TODO: log error here
            }
        }
    }

    // endregion
}
