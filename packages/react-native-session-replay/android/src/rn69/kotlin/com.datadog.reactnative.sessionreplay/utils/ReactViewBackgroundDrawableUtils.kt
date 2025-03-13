/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import android.graphics.drawable.Drawable
import android.graphics.drawable.InsetDrawable
import android.graphics.drawable.LayerDrawable
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.datadog.reactnative.sessionreplay.utils.formatAsRgba
import com.facebook.react.uimanager.Spacing
import com.facebook.react.views.view.ReactViewBackgroundDrawable

internal class ReactViewBackgroundDrawableUtils() : DrawableUtils() {
    override fun resolveShapeAndBorder(
        drawable: Drawable,
        opacity: Float,
        pixelDensity: Float
    ): Pair<MobileSegment.ShapeStyle?, MobileSegment.ShapeBorder?> {
        if (drawable !is ReactViewBackgroundDrawable) {
            return null to null
        }

        val borderProps = resolveBorder(drawable, pixelDensity)
        val cornerRadius = (drawable.fullBorderRadius / pixelDensity).toLong()

        val backgroundColor = getBackgroundColor(drawable)
        val colorHexString = if (backgroundColor != null) {
            formatAsRgba(backgroundColor)
        } else {
            return null to borderProps
        }

        return MobileSegment.ShapeStyle(
            colorHexString,
            opacity,
            cornerRadius
        ) to borderProps
    }

    override fun getReactBackgroundFromDrawable(drawable: Drawable?): Drawable? {
        return when (drawable) {
            is ReactViewBackgroundDrawable -> drawable
            is InsetDrawable -> getReactBackgroundFromDrawable(drawable.drawable)
            is LayerDrawable -> getDrawableFromLayerDrawable(drawable)
            else -> null
        }
    }

    private fun getDrawableFromLayerDrawable(layerDrawable: LayerDrawable): Drawable? {
        for (layerNumber in 0 until layerDrawable.numberOfLayers) {
            val layer = layerDrawable.getDrawable(layerNumber)
            if (layer is ReactViewBackgroundDrawable) {
                return layer
            }
        }
        return null
    }

    private fun resolveBorder(
        backgroundDrawable: ReactViewBackgroundDrawable,
        pixelDensity: Float
    ): MobileSegment.ShapeBorder {
        val borderWidth = (backgroundDrawable.fullBorderWidth / pixelDensity).toLong()
        val borderColor = formatAsRgba(backgroundDrawable.getBorderColor(Spacing.ALL))

        return MobileSegment.ShapeBorder(
            color = borderColor,
            width = borderWidth
        )
    }

    private fun getBackgroundColor(
        backgroundDrawable: ReactViewBackgroundDrawable
    ): Int? {
        return reflectionUtils.getDeclaredField(
            backgroundDrawable,
            COLOR_FIELD_NAME
        ) as? Int
    }

    private companion object {
        private const val COLOR_FIELD_NAME = "mColor"
    }
}
