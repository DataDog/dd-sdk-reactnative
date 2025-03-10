/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.mappers

import ReactViewBackgroundDrawableUtils
import android.view.View
import com.datadog.android.api.InternalLogger
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.android.sessionreplay.recorder.MappingContext
import com.datadog.android.sessionreplay.recorder.mapper.BaseAsyncBackgroundWireframeMapper
import com.datadog.android.sessionreplay.recorder.mapper.EditTextMapper
import com.datadog.android.sessionreplay.utils.AsyncJobStatusCallback
import com.datadog.android.sessionreplay.utils.DefaultColorStringFormatter
import com.datadog.android.sessionreplay.utils.DefaultViewBoundsResolver
import com.datadog.android.sessionreplay.utils.DefaultViewIdentifierResolver
import com.datadog.android.sessionreplay.utils.DrawableToColorMapper
import com.datadog.android.sessionreplay.utils.GlobalBounds
import com.datadog.reactnative.sessionreplay.utils.text.TextViewUtils
import com.facebook.react.views.textinput.ReactEditText

internal class ReactEditTextMapper(
    private val textViewUtils: TextViewUtils
) : BaseAsyncBackgroundWireframeMapper<ReactEditText>(
    viewIdentifierResolver = DefaultViewIdentifierResolver,
    colorStringFormatter = DefaultColorStringFormatter,
    viewBoundsResolver = DefaultViewBoundsResolver,
    drawableToColorMapper = DrawableToColorMapper.getDefault(),
) {
    private val drawableUtils = ReactViewBackgroundDrawableUtils()

    private val editTextMapper = EditTextMapper(
        viewIdentifierResolver = viewIdentifierResolver,
        colorStringFormatter = colorStringFormatter,
        viewBoundsResolver = viewBoundsResolver,
        drawableToColorMapper = drawableToColorMapper,
    )

    override fun map(
        view: ReactEditText,
        mappingContext: MappingContext,
        asyncJobStatusCallback: AsyncJobStatusCallback,
        internalLogger: InternalLogger
    ): List<MobileSegment.Wireframe> {
        val backgroundWireframes = mutableListOf<MobileSegment.Wireframe>().apply {
            addAll(
                super.map(
                    view,
                    mappingContext,
                    asyncJobStatusCallback,
                    internalLogger
                )
            )
        }

        backgroundWireframes += editTextMapper.map(
            view = view,
            mappingContext = mappingContext,
            asyncJobStatusCallback = asyncJobStatusCallback,
            internalLogger = internalLogger
        ).filterNot {
            it is MobileSegment.Wireframe.ImageWireframe ||
                    it is MobileSegment.Wireframe.PlaceholderWireframe
        }

        return textViewUtils.mapTextViewToWireframes(
            wireframes = backgroundWireframes,
            view = view,
            mappingContext = mappingContext,
        )
    }

    @Suppress("FunctionMaxLength")
    override fun resolveBackgroundAsImageWireframe(
        view: View,
        bounds: GlobalBounds,
        width: Int,
        height: Int,
        mappingContext: MappingContext,
        asyncJobStatusCallback: AsyncJobStatusCallback
    ): MobileSegment.Wireframe? {
        if (view !is ReactEditText) {
            return super.resolveBackgroundAsImageWireframe(
                view,
                bounds,
                width,
                height,
                mappingContext,
                asyncJobStatusCallback
            )
        }

        val backgroundDrawable = drawableUtils.getReactBackgroundFromDrawable(view.background)
            ?: return null

        val density = mappingContext.systemInformation.screenDensity

        val identifier = viewIdentifierResolver.resolveChildUniqueIdentifier(
            view,
            "drawable0"
        ) ?: return null

        val globalBounds = viewBoundsResolver.resolveViewGlobalBounds(
            view,
            density
        )

        val (shape, border) = drawableUtils.resolveShapeAndBorder(
            backgroundDrawable,
            view.alpha,
            mappingContext.systemInformation.screenDensity
        )

        return MobileSegment.Wireframe.ShapeWireframe(
            identifier,
            globalBounds.x,
            globalBounds.y,
            globalBounds.width,
            globalBounds.height,
            border = border,
            shapeStyle = shape
        )
    }
}
