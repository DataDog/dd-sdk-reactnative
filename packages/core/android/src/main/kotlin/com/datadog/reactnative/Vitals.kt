/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.view.Choreographer

/**
 * Reads the javascript framerate based on the [Choreographer.FrameCallback].
 */
internal class VitalFrameCallback(
    private val keepRunning: () -> Boolean
) : Choreographer.FrameCallback {

    internal var lastFrameTimestampNs: Long = 0L

    // region Choreographer.FrameCallback

    override fun doFrame(frameTimeNanos: Long) {
        if (lastFrameTimestampNs != 0L) {
            val durationNs = (frameTimeNanos - lastFrameTimestampNs).toDouble()
            if (durationNs > 0.0) {
                // TODO: call native SDK to report frame time
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
