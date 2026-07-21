/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.os.Handler
import android.os.Looper
import com.datadog.android.rum.RumActionType
import com.datadog.android.rum._RumInternalProxy
import com.facebook.react.bridge.ReadableMap

/**
 * Decides whether an `addAction` call is eligible for heatmap tracking and, if so, resolves and
 * attaches the heatmap data via [HeatmapTouchResolver]. Split into two steps so the caller can
 * resolve its own promise between them, before the heatmap work dispatches.
 */
class HeatmapActionHandler internal constructor(
    private val heatmapTouchResolver: HeatmapTouchResolver = HeatmapTouchResolver(),
    private val mainThreadExecutor: (() -> Unit) -> Unit = { action ->
        Handler(Looper.getMainLooper()).post(action)
    }
) {

    internal data class EligibleAction(
        val internalProxy: _RumInternalProxy,
        val viewUrl: String,
        val reactTag: Int,
        val positionX: Long,
        val positionY: Long
    )

    internal fun resolveEligibility(
        datadog: DatadogWrapper,
        type: String,
        touch: ReadableMap?
    ): EligibleAction? {
        if (!heatmapsEnabled || touch == null || !type.equals("tap", ignoreCase = true)) {
            return null
        }

        val internalProxy = datadog.getRumMonitor()._getInternal()
        // Read now — the view can transition asynchronously right after a tap.
        val viewUrl = internalProxy?.getCurrentViewUrl()
        val touchFields = touch.toTouchFieldsOrNull()

        return if (internalProxy != null && viewUrl != null && touchFields != null) {
            val (reactTag, positionX, positionY) = touchFields
            EligibleAction(internalProxy, viewUrl, reactTag, positionX, positionY)
        } else {
            null
        }
    }

    internal fun attachHeatmapData(
        eligibleAction: EligibleAction,
        name: String,
        attributes: Map<String, Any?>,
        fallback: () -> Unit
    ) {
        mainThreadExecutor {
            val heatmapData = heatmapTouchResolver.resolveHeatmapActionData(
                eligibleAction.reactTag,
                eligibleAction.positionX,
                eligibleAction.positionY,
                eligibleAction.viewUrl
            )
            if (heatmapData != null) {
                eligibleAction.internalProxy.addActionWithHeatmap(
                    type = RumActionType.TAP,
                    name = name,
                    crossPlatformHeatmapActionData = heatmapData,
                    attributes = attributes
                )
            } else {
                fallback()
            }
        }
    }

    private fun ReadableMap.toTouchFieldsOrNull(): Triple<Int, Long, Long>? {
        if (!hasKey("reactTag") || !hasKey("x") || !hasKey("y")) return null
        return runCatching {
            Triple(getInt("reactTag"), getDouble("x").toLong(), getDouble("y").toLong())
        }.getOrNull()
    }

    @Suppress("UndocumentedPublicClass")
    companion object {
        /**
         * Whether heatmap data should be attached to TAP actions. Set by
         * [com.datadog.reactnative.sessionreplay.DdSessionReplayImplementation.enable].
         */
        @Volatile
        var heatmapsEnabled: Boolean = false
    }
}
