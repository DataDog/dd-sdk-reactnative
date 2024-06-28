/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.mappers

import com.datadog.android.api.InternalLogger
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.android.sessionreplay.recorder.MappingContext
import com.datadog.android.sessionreplay.recorder.mapper.BaseWireframeMapper
import com.datadog.android.sessionreplay.recorder.mapper.TraverseAllChildrenMapper
import com.datadog.android.sessionreplay.utils.AsyncJobStatusCallback
import com.datadog.android.sessionreplay.utils.DefaultColorStringFormatter
import com.datadog.android.sessionreplay.utils.DefaultViewBoundsResolver
import com.datadog.android.sessionreplay.utils.DefaultViewBoundsResolver.resolveViewGlobalBounds
import com.datadog.android.sessionreplay.utils.DefaultViewIdentifierResolver
import com.datadog.android.sessionreplay.utils.DrawableToColorMapper
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.datadog.reactnative.sessionreplay.utils.ReactViewBackgroundDrawableUtils
import com.facebook.react.views.view.ReactViewGroup

internal class ReactViewGroupMapper(
    private val reactViewBackgroundDrawableUtils: ReactViewBackgroundDrawableUtils =
        ReactViewBackgroundDrawableUtils(),
    private val drawableUtils: DrawableUtils = DrawableUtils()
) :
    BaseWireframeMapper<ReactViewGroup>(
        viewIdentifierResolver = DefaultViewIdentifierResolver,
        colorStringFormatter = DefaultColorStringFormatter,
        viewBoundsResolver = DefaultViewBoundsResolver,
        drawableToColorMapper = DrawableToColorMapper.getDefault()
    ),
    TraverseAllChildrenMapper<ReactViewGroup> {

    override fun map(
        view: ReactViewGroup,
        mappingContext: MappingContext,
        asyncJobStatusCallback: AsyncJobStatusCallback,
        internalLogger: InternalLogger
    ): List<MobileSegment.Wireframe> {
        val pixelDensity = mappingContext.systemInformation.screenDensity
        val viewGlobalBounds = resolveViewGlobalBounds(view, pixelDensity)
        val backgroundDrawable = drawableUtils.getReactBackgroundFromDrawable(view.background)

        // view.alpha is the value of the opacity prop on the js side
        val opacity = view.alpha

        val (shapeStyle, border) =
            if (backgroundDrawable != null) {
                reactViewBackgroundDrawableUtils
                    .resolveShapeAndBorder(backgroundDrawable, opacity, pixelDensity)
            } else {
                null to null
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
}
