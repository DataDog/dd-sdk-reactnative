/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.util.Log
import android.view.Choreographer
import java.util.concurrent.TimeUnit
import kotlin.math.max
import kotlin.math.min

/**
 * This files copies internal classes from the dd-android-sdk to be able to use them
 * in the React Native SDK.
 */

internal interface VitalObserver {
    fun onNewSample(value: Double)
}

/**
 * Reads the UI framerate based on the [Choreographer.FrameCallback] and notify a [VitalObserver].
 */
internal class VitalFrameCallback(
    private val observer: VitalObserver,
    private val keepRunning: () -> Boolean
) : Choreographer.FrameCallback {

    internal var lastFrameTimestampNs: Long = 0L

    // region Choreographer.FrameCallback

    override fun doFrame(frameTimeNanos: Long) {
        if (lastFrameTimestampNs != 0L) {
            val durationNs = (frameTimeNanos - lastFrameTimestampNs).toDouble()
            if (durationNs > 0.0) {
                val frameRate = ONE_SECOND_NS / durationNs
                if (frameRate in VALID_FPS_RANGE) {
                    observer.onNewSample(frameRate)
                }
            }
        }
        lastFrameTimestampNs = frameTimeNanos

        @Suppress("UnsafeThirdPartyFunctionCall") // internal safe call
        if (keepRunning()) {
            try {
                // TODO: Check if we need to run this on the RN thread as well
                Choreographer.getInstance().postFrameCallback(this)
            } catch (e: IllegalStateException) {
            }
        }
    }

    // endregion

    companion object {
        val ONE_SECOND_NS: Double = TimeUnit.SECONDS.toNanos(1).toDouble()

        private const val MIN_FPS: Double = 1.0
        private const val MAX_FPS: Double = 240.0
        val VALID_FPS_RANGE = MIN_FPS.rangeTo(MAX_FPS)
    }
}

internal interface VitalListener {
    fun onVitalUpdate(info: VitalInfo)
}

internal interface VitalMonitor : VitalObserver {
    fun getLastSample(): Double

    fun register(listener: VitalListener)

    fun unregister(listener: VitalListener)
}

internal data class VitalInfo(
    val sampleCount: Int,
    val minValue: Double,
    val maxValue: Double,
    val meanValue: Double
) {
    companion object {
        val EMPTY = VitalInfo(0, Double.MAX_VALUE, -Double.MAX_VALUE, 0.0)
    }
}

internal class AggregatingVitalMonitor : VitalMonitor {

    private var lastKnownSample: Double = Double.NaN

    private val listeners: MutableMap<VitalListener, VitalInfo> = mutableMapOf()

    // region VitalObserver

    override fun onNewSample(value: Double) {
        lastKnownSample = value
        notifyListeners(value)
    }

    // endregion

    // region VitalMonitor

    override fun getLastSample(): Double {
        return lastKnownSample
    }

    override fun register(listener: VitalListener) {
        val value = lastKnownSample
        synchronized(listeners) {
            listeners[listener] = VitalInfo.EMPTY
        }
        if (!value.isNaN()) {
            notifyListener(listener, value)
        }
    }

    override fun unregister(listener: VitalListener) {
        synchronized(listeners) {
            listeners.remove(listener)
        }
    }

    // endregion

    // region Internal

    private fun notifyListeners(value: Double) {
        synchronized(listeners) {
            for (listener in listeners.keys) {
                notifyListener(listener, value)
            }
        }
    }

    private fun notifyListener(listener: VitalListener, value: Double) {
        val vitalInfo = listeners[listener] ?: VitalInfo.EMPTY
        val newSampleCount = vitalInfo.sampleCount + 1

        // Assuming M(n) is the mean value of the first n samples
        // M(n) = ∑ sample(n) / n
        // n⨉M(n) = ∑ sample(n)
        // M(n+1) = ∑ sample(n+1) / (n+1)
        //        = [ sample(n+1) + ∑ sample(n) ] / (n+1)
        //        = (sample(n+1) + n⨉M(n)) / (n+1)
        val meanValue = (value + (vitalInfo.sampleCount * vitalInfo.meanValue)) / newSampleCount

        val updatedInfo = VitalInfo(
            newSampleCount,
            min(value, vitalInfo.minValue),
            max(value, vitalInfo.maxValue),
            meanValue
        )
        listener.onVitalUpdate(updatedInfo)
        synchronized(listeners) {
            listeners[listener] = updatedInfo
        }
    }

    // endregion
}