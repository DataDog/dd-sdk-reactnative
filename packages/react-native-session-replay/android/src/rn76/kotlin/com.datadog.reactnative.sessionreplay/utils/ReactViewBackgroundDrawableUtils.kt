import android.graphics.drawable.Drawable
import android.graphics.drawable.InsetDrawable
import android.graphics.drawable.LayerDrawable
import com.datadog.android.internal.utils.densityNormalized
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.reactnative.sessionreplay.extensions.getRadius
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.datadog.reactnative.sessionreplay.utils.formatAsRgba
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.uimanager.Spacing
import com.facebook.react.uimanager.drawable.CSSBackgroundDrawable

internal class ReactViewBackgroundDrawableUtils : DrawableUtils() {
    @OptIn(UnstableReactNativeAPI::class)
    override fun resolveShapeAndBorder(
        drawable: Drawable,
        opacity: Float,
        pixelDensity: Float
    ): Pair<MobileSegment.ShapeStyle?, MobileSegment.ShapeBorder?> {
        if (drawable !is CSSBackgroundDrawable) {
            return null to null
        }

        val borderProps = resolveBorder(drawable, pixelDensity)
        val backgroundColor = getBackgroundColor(drawable)
        val colorHexString = if (backgroundColor != null) {
            formatAsRgba(backgroundColor)
        } else {
            return null to borderProps
        }

        return MobileSegment.ShapeStyle(
            colorHexString,
            opacity,
            getBorderRadius(drawable)
        ) to borderProps
    }

    @OptIn(UnstableReactNativeAPI::class)
    override fun getReactBackgroundFromDrawable(drawable: Drawable?): Drawable? {
        if (drawable is CSSBackgroundDrawable) {
            return drawable
        }

        if (drawable is InsetDrawable) {
            return getReactBackgroundFromDrawable(drawable.drawable)
        }

        if (drawable is LayerDrawable) {
            for (layerNumber in 0 until drawable.numberOfLayers) {
                val layer = drawable.getDrawable(layerNumber)
                if (layer is CSSBackgroundDrawable) {
                    return layer
                }
            }
        }

        return null
    }

    @OptIn(UnstableReactNativeAPI::class)
    private fun getBorderRadius(drawable: CSSBackgroundDrawable): Float {
        val width = drawable.intrinsicWidth.toFloat()
        val height = drawable.intrinsicHeight.toFloat()
        return drawable.borderRadius.uniform?.getRadius(width, height) ?: 0f
    }

    @OptIn(UnstableReactNativeAPI::class)
    private fun getBackgroundColor(
        backgroundDrawable: CSSBackgroundDrawable
    ): Int? {
        return reflectionUtils.getDeclaredField(
            backgroundDrawable,
            COLOR_FIELD_NAME
        ) as Int?
    }

    @OptIn(UnstableReactNativeAPI::class)
    private fun resolveBorder(
        backgroundDrawable: CSSBackgroundDrawable,
        pixelDensity: Float
    ): MobileSegment.ShapeBorder {
        val borderWidth =
            backgroundDrawable.fullBorderWidth.toLong().densityNormalized(pixelDensity)
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
