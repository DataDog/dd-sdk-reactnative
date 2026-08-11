/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.res.Resources
import android.view.View
import android.view.ViewGroup
import com.datadog.android.heatmaps.CrossPlatformHeatmapActionData

/**
 * Resolves a React Native touch into [CrossPlatformHeatmapActionData] by walking the view
 * hierarchy to the nearest clickable-and-visible ancestor — matching Session Replay's own
 * `HeatmapIdentifierResolver` rule — and building its element path using the same convention, so
 * the resulting hash matches the `permanentId` SR assigned to that view's wireframe.
 */
internal class HeatmapTouchResolver(
    private val viewResolver: (Int) -> View? = { null },
    private val telemetry: DdTelemetry = DdTelemetry()
) {

    /** Returns null if [reactTag] doesn't resolve to a valid tap target. */
    fun resolveHeatmapActionData(
        reactTag: Int,
        positionX: Long,
        positionY: Long,
        viewUrl: String
    ): CrossPlatformHeatmapActionData? = runCatching {
        val view = viewResolver(reactTag)?.let { clickableVisibleAncestorOf(it) }
        val elementPath = view?.let { elementPathFromRootTo(it) }

        if (view != null && !elementPath.isNullOrEmpty()) {
            val density = view.resources?.displayMetrics?.density ?: 1f
            val targetWidth = (view.width / density).toLong().takeIf { it > 0 }
            val targetHeight = (view.height / density).toLong().takeIf { it > 0 }

            CrossPlatformHeatmapActionData(
                elementPath = elementPath,
                viewUrl = viewUrl,
                positionX = positionX,
                positionY = positionY,
                targetWidth = targetWidth,
                targetHeight = targetHeight
            )
        } else {
            null
        }
    }.onFailure {
        telemetry.telemetryError("Failed to resolve heatmap action data", it)
    }.getOrNull()

    // region Private helpers

    private fun clickableVisibleAncestorOf(view: View): View? {
        var current: View? = view
        while (current != null) {
            if (current.isClickable && current.visibility == View.VISIBLE) {
                return current
            }
            current = current.parent as? View
        }
        return null
    }

    private fun elementPathFromRootTo(view: View): List<String> {
        val path = mutableListOf<String>()
        var current: View? = view
        while (current != null) {
            val parent = current.parent as? ViewGroup
            val typeIndex = if (parent != null) computeTypeIndex(current, parent) else 0
            path.add(pathComponentFor(current, typeIndex))
            current = parent
        }
        path.reverse()
        return path
    }

    private fun computeTypeIndex(view: View, parent: ViewGroup): Int {
        val cls = view.javaClass
        var index = 0
        for (i in 0 until parent.childCount) {
            val child = parent.getChildAt(i) ?: continue
            if (child === view) break
            if (child.javaClass === cls) index++
        }
        return index
    }

    private fun pathComponentFor(view: View, typeIndex: Int): String {
        val viewId = view.id
        if (viewId != View.NO_ID) {
            try {
                @Suppress("UnsafeThirdPartyFunctionCall")
                val name = view.resources?.getResourceName(viewId)
                if (!name.isNullOrEmpty()) {
                    return "$name#$typeIndex"
                }
            } catch (_: Resources.NotFoundException) {
            }
        }
        return "cls:${view.javaClass.name}#$typeIndex"
    }

    // endregion
}
