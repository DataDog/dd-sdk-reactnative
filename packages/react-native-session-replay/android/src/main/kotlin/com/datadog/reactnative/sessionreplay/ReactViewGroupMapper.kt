/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import android.annotation.SuppressLint
import com.datadog.android.sessionreplay.internal.AsyncJobStatusCallback
import com.datadog.android.sessionreplay.internal.recorder.MappingContext
import com.datadog.android.sessionreplay.internal.recorder.mapper.BaseWireframeMapper
import com.datadog.android.sessionreplay.internal.recorder.mapper.TraverseAllChildrenMapper
import com.datadog.android.sessionreplay.model.MobileSegment
import com.facebook.react.uimanager.Spacing
import com.facebook.react.views.view.ReactViewBackgroundDrawable
import com.facebook.react.views.view.ReactViewGroup

internal class ReactViewGroupMapper :
    BaseWireframeMapper<ReactViewGroup, MobileSegment.Wireframe>(),
    TraverseAllChildrenMapper<ReactViewGroup, MobileSegment.Wireframe> {

    override fun map(
        view: ReactViewGroup,
        mappingContext: MappingContext,
        asyncJobStatusCallback: AsyncJobStatusCallback
    ): List<MobileSegment.Wireframe> {
        val pixelDensity = mappingContext.systemInformation.screenDensity

        val viewGlobalBounds = resolveViewGlobalBounds(
            view,
            pixelDensity
        )

        val backgroundDrawable = view.background

        // view.alpha is the value of the opacity prop on the js side
        val opacity = view.alpha

        val (shapeStyle, border) =
            if (backgroundDrawable is ReactViewBackgroundDrawable) {
                resolveRNShapeStyleAndBorder(
                    view = view,
                    backgroundDrawable = backgroundDrawable,
                    opacity = opacity,
                    pixelDensity = pixelDensity
                )
        } else {
            backgroundDrawable?.resolveShapeStyleAndBorder(opacity) ?: (null to null)
        }

        return listOf(
            MobileSegment.Wireframe.ShapeWireframe(
                resolveViewId(view),
                viewGlobalBounds.x,
                viewGlobalBounds.y,
                viewGlobalBounds.width,
                viewGlobalBounds.height,
                shapeStyle = shapeStyle,
                border = border
            )
        )
    }

    @SuppressLint("VisibleForTests")
    private fun resolveRNShapeStyleAndBorder(
        view: ReactViewGroup,
        backgroundDrawable: ReactViewBackgroundDrawable,
        opacity: Float,
        pixelDensity: Float
    ): Pair<MobileSegment.ShapeStyle, MobileSegment.ShapeBorder> {
        val backgroundColor = view.backgroundColor
        val colorHexString = formatAsRgba(backgroundColor)
        val cornerRadius = backgroundDrawable.fullBorderRadius.toLong().convertToDensityNormalized(pixelDensity)
        val borderWidth = backgroundDrawable.fullBorderWidth.toLong().convertToDensityNormalized(pixelDensity)
        val borderColor = formatAsRgba(backgroundDrawable.getBorderColor(Spacing.ALL))

        return MobileSegment.ShapeStyle(
            backgroundColor = colorHexString,
            opacity = opacity,
            cornerRadius = cornerRadius
        ) to MobileSegment.ShapeBorder(
            color = borderColor,
            width = borderWidth
        )
    }
}
