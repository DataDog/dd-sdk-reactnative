/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.mappers

import ReactViewBackgroundDrawableUtils
import android.graphics.Color
import android.graphics.Rect
import android.graphics.drawable.ColorDrawable
import android.view.View
import com.datadog.android.api.InternalLogger
import com.datadog.android.internal.utils.ImageViewUtils
import com.datadog.android.internal.utils.densityNormalized
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.android.sessionreplay.recorder.MappingContext
import com.datadog.android.sessionreplay.recorder.mapper.BaseWireframeMapper
import com.datadog.android.sessionreplay.utils.AsyncJobStatusCallback
import com.datadog.android.sessionreplay.utils.DefaultColorStringFormatter
import com.datadog.android.sessionreplay.utils.DefaultViewBoundsResolver
import com.datadog.android.sessionreplay.utils.DefaultViewBoundsResolver.resolveViewGlobalBounds
import com.datadog.android.sessionreplay.utils.DefaultViewIdentifierResolver
import com.datadog.android.sessionreplay.utils.DrawableToColorMapper
import com.datadog.reactnative.sessionreplay.ReactNativeInternalCallback
import com.datadog.reactnative.sessionreplay.extensions.getScaleTypeDrawable
import com.datadog.reactnative.sessionreplay.extensions.imageViewScaleType
import com.datadog.reactnative.sessionreplay.resources.ReactDrawableCopier
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.datadog.reactnative.sessionreplay.utils.SRCache
import com.facebook.drawee.drawable.FadeDrawable
import com.facebook.react.views.image.ReactImageView


data class SvgData(
    val width: Int?,
    val height: Int?,
    val file: String
)


internal open class DefaultMapper<T: View>(
    private val drawableUtils: DrawableUtils =
        ReactViewBackgroundDrawableUtils(),
    private val internalCallback: ReactNativeInternalCallback
): BaseWireframeMapper<T>(
    viewIdentifierResolver = DefaultViewIdentifierResolver,
    colorStringFormatter = DefaultColorStringFormatter,
    viewBoundsResolver = DefaultViewBoundsResolver,
    drawableToColorMapper = DrawableToColorMapper.getDefault()
) {
    override fun map(
        view: T,
        mappingContext: MappingContext,
        asyncJobStatusCallback: AsyncJobStatusCallback,
        internalLogger: InternalLogger
    ): List<MobileSegment.Wireframe> {
        val pixelDensity = mappingContext.systemInformation.screenDensity
        val viewGlobalBounds = resolveViewGlobalBounds(view, pixelDensity)
        val backgroundDrawable = drawableUtils.getReactBackgroundFromDrawable(view.background)

        if ("com.horcrux.svg.SvgView" == view.javaClass.name) {
            println("** view class name: ${view.javaClass.name} **")
           val nativeID = view.getTag(com.facebook.react.R.id.view_tag_native_id)
            println("** nativeID: $nativeID")

            if (nativeID != null) {

                val wireframes = mutableListOf<MobileSegment.Wireframe>()
                val parentRect = ImageViewUtils.resolveParentRectAbsPosition(view)
                val contentRect = Rect(
                    parentRect.left,
                    parentRect.top,
                    parentRect.right,
                    parentRect.bottom
                )
                val contentXPosInDp = contentRect.left.densityNormalized(pixelDensity).toLong()
                val contentYPosInDp = contentRect.top.densityNormalized(pixelDensity).toLong()
                val contentWidthPx = contentRect.width()
                val contentHeightPx = contentRect.height()

//                val base64 = SRCache.get("svgs")?.get(nativeID);
//                val svgData = SRCache.get("svgs")?.get(nativeID);

                val rawSvgData = SRCache.get("svgs")?.get(nativeID)

                println("RawSvgData: $rawSvgData")
                val svgData = if (rawSvgData is Map<*, *>) {
                    SvgData(
                        width = (rawSvgData["width"] as? String)?.toInt(),
                        height = (rawSvgData["height"] as? String)?.toInt(),
                        file = rawSvgData["file"] as? String ?: ""
                    )
                } else {
                    null
                }
                println("*** svgData: $svgData ***")
                val imgWireframe = MobileSegment.Wireframe.ImageWireframe(
                    resolveViewId(view),
                    contentXPosInDp,
                    contentYPosInDp,
                    svgData?.width?.toLong() ?: contentWidthPx.toLong(),
                    svgData?.height?.toLong() ?: contentHeightPx.toLong(),
                    null,
                    null,
                    null,
                    svgData?.file,
                    nativeID.toString(),
//                    "image/svg+xml",
                    "svg+xml",
                    false
                )
                wireframes.add(imgWireframe)
                println("wireframes: $wireframes")
                if (svgData?.file != null)  {
                    internalCallback.addResourceItem(nativeID.toString(), svgData.file.toByteArray())
                }
                return wireframes

            }
        }
        // view.alpha is the value of the opacity prop on the js side
        val opacity = view.alpha

        val (shapeStyle, border) =
            if (backgroundDrawable != null) {
                drawableUtils
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
