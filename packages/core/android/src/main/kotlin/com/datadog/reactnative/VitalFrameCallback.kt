/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.view.Choreographer
import java.util.concurrent.TimeUnit

/**
 * Reads the javascript framerate based on the [Choreographer.FrameCallback].
 */
internal class VitalFrameCallback(
    private val frameTimeCallback: (Double) -> Unit,
    private val errorHandler: (IllegalStateException) -> Unit,
    private val keepRunning: () -> Boolean
) : Choreographer.FrameCallback {

    internal var lastFrameTimestampNs: Long = 0L

    // region Choreographer.FrameCallback

    override fun doFrame(frameTimeNanos: Long) {
        if (lastFrameTimestampNs != 0L) {
            val durationNs = (frameTimeNanos - lastFrameTimestampNs).toDouble()
            frameTimeCallback(durationNs)
        }
        lastFrameTimestampNs = frameTimeNanos

        if (keepRunning()) {
            try {
                Choreographer.getInstance().postFrameCallback(this)
            } catch (e: IllegalStateException) {
                errorHandler(e)
            }
        }
    }

    // endregion
}
