/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.mappers

import ReactViewBackgroundDrawableUtils
import android.view.ViewGroup
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
import com.datadog.reactnative.sessionreplay.ReactNativeInternalCallback
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.datadog.reactnative.sessionreplay.views.DdPrivacyView
import java.util.Collections

internal open class SvgViewMapper<T: ViewGroup>(
    private val internalCallback: ReactNativeInternalCallback,
    private val drawableUtils: DrawableUtils =
        ReactViewBackgroundDrawableUtils()
): BaseWireframeMapper<T>(
    viewIdentifierResolver = DefaultViewIdentifierResolver,
    colorStringFormatter = DefaultColorStringFormatter,
    viewBoundsResolver = DefaultViewBoundsResolver,
    drawableToColorMapper = DrawableToColorMapper.getDefault()
), TraverseAllChildrenMapper<T> {
    private val queuedResourceIds = Collections.synchronizedSet(HashSet<String>())

    @Suppress("LongMethod", "ComplexMethod")
    override fun map(
        view: T,
        mappingContext: MappingContext,
        asyncJobStatusCallback: AsyncJobStatusCallback,
        internalLogger: InternalLogger
    ): List<MobileSegment.Wireframe> {
        val pixelDensity = mappingContext.systemInformation.screenDensity
        val viewGlobalBounds = resolveViewGlobalBounds(view, pixelDensity)
        val backgroundDrawable = drawableUtils.getReactBackgroundFromDrawable(view.background)

        val opacity = view.alpha

        val (shapeStyle, border) =
            if (backgroundDrawable != null) {
                drawableUtils
                    .resolveShapeAndBorder(backgroundDrawable, opacity, pixelDensity)
            } else {
                null to null
            }

        val wireframes = mutableListOf<MobileSegment.Wireframe>()

        if (view is DdPrivacyView) {
            val hash = view.attributes?.get("hash") ?: return listOf(
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
            val width = view.attributes?.get("width")
            val height = view.attributes?.get("height")

            var entryData = internalCallback.getEntryData(hash)
                ?: return wireframes

            // This is always guaranteed to be true due to how the babel plugin transformed the data
            val subView = view.getChildAt(0) ?: return wireframes
            val imageBounds = resolveViewGlobalBounds(subView, pixelDensity)
            var entryStr: String? = null

            if (width == null) {
                entryStr = injectSvgDimensions(entryData.toString(Charsets.UTF_8), imageBounds.width.toInt(), null)
            }

            if (height == null) {
                entryStr = injectSvgDimensions(entryStr ?: entryData.toString(Charsets.UTF_8), null, imageBounds.height.toInt())
            }

            if (entryStr != null) {
                // Here we update the svg content but keep the original hash without these values
                // The goal is to save some time, as it won't matter since the hash is used as an identifier
                entryData = entryStr.toByteArray(Charsets.UTF_8);
            }

            wireframes.add(MobileSegment.Wireframe.ShapeWireframe(
                    resolveViewId(view),
                    viewGlobalBounds.x,
                    viewGlobalBounds.y,
                    viewGlobalBounds.width,
                    viewGlobalBounds.height,
                    shapeStyle = shapeStyle,
                    border = border
                ))

            val imageWireframeId = viewIdentifierResolver.resolveChildUniqueIdentifier(view, "svg") ?: return wireframes
            val imgWireframe = MobileSegment.Wireframe.ImageWireframe(
                imageWireframeId,
                imageBounds.x,
                imageBounds.y,
                imageBounds.width,
                imageBounds.height,
                null,
                null,
                null,
                null,
                hash,
                "svg+xml",
                false
            )
            wireframes.add(imgWireframe)

            if (!queuedResourceIds.contains(hash)) {
                queuedResourceIds.add(hash)
                internalCallback.addResourceItem(
                    hash,
                    entryData,
                    "image/svg+xml"
                )
            }
        }

        return wireframes
    }

    fun injectSvgDimensions(
        svgData: String,
        width: Int? = null,
        height: Int? = null
    ): String? {
        val attrs = mutableListOf<String>()
        width?.let { attrs.add("""width="$it"""") }
        height?.let { attrs.add("""height="$it"""") }

        if (attrs.isEmpty()) return svgData

        val insertIndex = svgData.indexOf("<svg")
        if (insertIndex == -1) return svgData

        val tagEndIndex = svgData.indexOf(">", startIndex = insertIndex)
        if (tagEndIndex == -1) return svgData

        val dimensions = " " + attrs.joinToString(" ")

        val builder = StringBuilder(svgData)
        builder.insert(tagEndIndex, dimensions)

        return builder.toString()
    }
}
