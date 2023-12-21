/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.utils

import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.reactnative.sessionreplay.extensions.convertToDensityNormalized
import com.facebook.react.uimanager.Spacing
import com.facebook.react.views.view.ReactViewBackgroundDrawable

internal class ReactViewBackgroundDrawableUtils(
    private val reflectionUtils: ReflectionUtils = ReflectionUtils()
) {
    internal fun resolveShapeAndBorder(
        drawable: ReactViewBackgroundDrawable,
        opacity: Float,
        pixelDensity: Float
    ): Pair<MobileSegment.ShapeStyle?, MobileSegment.ShapeBorder?> {
        val borderProps = resolveBorder(drawable, pixelDensity)
        val backgroundColor = getBackgroundColor(drawable)
        val colorHexString = if (backgroundColor != null) {
            formatAsRgba(backgroundColor)
        } else {
            return null to borderProps
        }

        val cornerRadius =
            drawable.fullBorderRadius.toLong().convertToDensityNormalized(pixelDensity)

        return MobileSegment.ShapeStyle(
            colorHexString,
            opacity,
            cornerRadius
        ) to borderProps
    }

    private fun getBackgroundColor(
        backgroundDrawable: ReactViewBackgroundDrawable,
    ): Int? {
        return reflectionUtils.getDeclaredField(
            backgroundDrawable,
            COLOR_FIELD_NAME
        ) as Int?
    }

    private fun resolveBorder(
        backgroundDrawable: ReactViewBackgroundDrawable,
        pixelDensity: Float
    ): MobileSegment.ShapeBorder {
        val borderWidth =
            backgroundDrawable.fullBorderWidth.toLong().convertToDensityNormalized(pixelDensity)
        val borderColor = formatAsRgba(backgroundDrawable.getBorderColor(Spacing.ALL))

        return MobileSegment.ShapeBorder(
            color = borderColor,
            width = borderWidth
        )
    }

    private companion object {
        private const val COLOR_FIELD_NAME = "mColor"
    }
}