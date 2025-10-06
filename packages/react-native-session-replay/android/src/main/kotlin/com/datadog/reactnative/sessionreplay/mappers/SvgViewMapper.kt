package com.datadog.reactnative.sessionreplay.mappers

import ReactViewBackgroundDrawableUtils
import android.view.View
import com.datadog.android.api.InternalLogger
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
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.datadog.reactnative.sessionreplay.views.DdPrivacyView
import java.util.Collections

internal open class SvgViewMapper<T: View>(
    private val internalCallback: ReactNativeInternalCallback,
    private val drawableUtils: DrawableUtils =
        ReactViewBackgroundDrawableUtils()
): BaseWireframeMapper<T>(
    viewIdentifierResolver = DefaultViewIdentifierResolver,
    colorStringFormatter = DefaultColorStringFormatter,
    viewBoundsResolver = DefaultViewBoundsResolver,
    drawableToColorMapper = DrawableToColorMapper.getDefault()
) {
    private val queuedResourceIds = Collections.synchronizedSet(HashSet<String>())

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
            val hash = view.attributes?.get("hash") ?: return wireframes

            val entryData = internalCallback.getEntryData(hash)
                ?: return wireframes

            // This is always guaranteed to be true due to how the babel plugin transformed the data
            val subView = view.getChildAt(0) ?: return wireframes

            wireframes.add(MobileSegment.Wireframe.ShapeWireframe(
                    resolveViewId(view),
                    viewGlobalBounds.x,
                    viewGlobalBounds.y,
                    viewGlobalBounds.width,
                    viewGlobalBounds.height,
                    shapeStyle = shapeStyle,
                    border = border
                ))

            val imageBounds = resolveViewGlobalBounds(subView, pixelDensity)
            val imgWireframe = MobileSegment.Wireframe.ImageWireframe(
                resolveViewId(subView),
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
}
