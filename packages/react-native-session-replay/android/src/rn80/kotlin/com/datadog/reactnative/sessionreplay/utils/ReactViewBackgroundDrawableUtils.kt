/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorFilter
import android.graphics.PixelFormat
import android.graphics.drawable.Drawable
import android.graphics.drawable.InsetDrawable
import android.graphics.drawable.LayerDrawable
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.reactnative.sessionreplay.extensions.getAverage
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.datadog.reactnative.sessionreplay.utils.formatAsRgba
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.uimanager.Spacing
import com.facebook.react.uimanager.drawable.CSSBackgroundDrawable
import com.facebook.react.uimanager.style.ComputedBorderRadius

internal class ReactViewBackgroundDrawableUtils : DrawableUtils() {
    /**
     * Used to wrap instances of internal class:
     * com.facebook.react.uimanager.drawable.BackgroundDrawable
     */
    class BackgroundDrawableWrapper(
        val backgroundColor: String,
        val cornerRadius: Float
    ) : Drawable() {
        override fun draw(p0: Canvas) {}
        override fun setAlpha(p0: Int) {}
        override fun setColorFilter(p0: ColorFilter?) {}
        @Suppress("OVERRIDE_DEPRECATION")
        override fun getOpacity(): Int { return PixelFormat.OPAQUE }
    }

    @OptIn(UnstableReactNativeAPI::class)
    override fun resolveShapeAndBorder(
        drawable: Drawable,
        opacity: Float,
        pixelDensity: Float
    ): Pair<MobileSegment.ShapeStyle?, MobileSegment.ShapeBorder?> {
        if (drawable is BackgroundDrawableWrapper) {
            return MobileSegment.ShapeStyle(
                drawable.backgroundColor,
                opacity,
                drawable.cornerRadius
            ) to null
        } else if (drawable is CSSBackgroundDrawable) {
            val borderProps = resolveBorder(drawable, pixelDensity)
            val backgroundColor = getCSSBackgroundColor(drawable)
            val colorHexString = if (backgroundColor != null) {
                formatAsRgba(backgroundColor)
            } else {
                return null to borderProps
            }

            return MobileSegment.ShapeStyle(
                colorHexString,
                opacity,
                getCSSComputedBorderRadius(drawable)?.getAverage() ?: 0f
            ) to borderProps
        }

        return null to null
    }

    @OptIn(UnstableReactNativeAPI::class)
    override fun getReactBackgroundFromDrawable(drawable: Drawable?): Drawable? {
        return when(drawable) {
            is CSSBackgroundDrawable -> drawable
            is InsetDrawable -> getReactBackgroundFromDrawable(drawable.drawable)
            is LayerDrawable -> getDrawableFromLayerDrawable(drawable)
            else -> null
        }
    }

    @OptIn(UnstableReactNativeAPI::class)
    private fun getDrawableFromLayerDrawable(layerDrawable: LayerDrawable): Drawable? {
        for (layerNumber in 0 until layerDrawable.numberOfLayers) {
            val layer = layerDrawable.getDrawable(layerNumber)
            if (layer is CSSBackgroundDrawable) {
                return layer
            } else if (layer != null) {
                if (layer.javaClass.name == "com.facebook.react.uimanager.drawable.BackgroundDrawable") {
                    val backgroundColor = getBackgroundColor(layer) ?: Color.TRANSPARENT
                    val cornerRadius = getComputedBorderRadius(layer)?.getAverage() ?: 0f
                    return BackgroundDrawableWrapper(
                        backgroundColor = formatAsRgba(backgroundColor),
                        cornerRadius = cornerRadius,
                    )
                }
            }
        }
        return null
    }

    @OptIn(UnstableReactNativeAPI::class)
    private fun getCSSComputedBorderRadius(
        drawable: CSSBackgroundDrawable
    ): ComputedBorderRadius? {
        return reflectionUtils.getDeclaredField(
            drawable,
            CSS_COMPUTED_BORDER_RADIUS_FIELD_NAME
        ) as? ComputedBorderRadius
    }

    private fun getComputedBorderRadius(
        drawable: Any
    ): ComputedBorderRadius? {
        return reflectionUtils.getDeclaredField(
            drawable,
            COMPUTED_BORDER_RADIUS_FIELD_NAME
        ) as? ComputedBorderRadius
    }

    @OptIn(UnstableReactNativeAPI::class)
    private fun getCSSBackgroundColor(
        backgroundDrawable: CSSBackgroundDrawable
    ): Int? {
        return reflectionUtils.getDeclaredField(
            backgroundDrawable,
            CSS_BACKGROUND_COLOR_FIELD_NAME
        ) as? Int
    }

    private fun getBackgroundColor(
        backgroundDrawable: Any
    ): Int? {
        return reflectionUtils.getDeclaredField(
            backgroundDrawable,
            BACKGROUND_COLOR_FIELD_NAME
        ) as? Int
    }

    @OptIn(UnstableReactNativeAPI::class)
    private fun resolveBorder(
        backgroundDrawable: CSSBackgroundDrawable,
        pixelDensity: Float
    ): MobileSegment.ShapeBorder {
        val borderWidth = (backgroundDrawable.fullBorderWidth / pixelDensity).toLong()
        val borderColor = formatAsRgba(backgroundDrawable.getBorderColor(Spacing.ALL))

        return MobileSegment.ShapeBorder(
            color = borderColor,
            width = borderWidth
        )
    }

    private companion object {
        private const val CSS_BACKGROUND_COLOR_FIELD_NAME = "mColor"
        private const val CSS_COMPUTED_BORDER_RADIUS_FIELD_NAME = "mComputedBorderRadius"
        private const val COMPUTED_BORDER_RADIUS_FIELD_NAME = "computedBorderRadius"
        private const val BACKGROUND_COLOR_FIELD_NAME = "backgroundColor"
    }
}
