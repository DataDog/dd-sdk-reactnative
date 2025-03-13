import android.graphics.Color
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
        return when(drawable) {
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
        val borderColor = formatAsRgba(getBorderColor(backgroundDrawable))

        return MobileSegment.ShapeBorder(
            color = borderColor,
            width = borderWidth
        )
    }

    private fun getBorderColor(backgroundDrawable: ReactViewBackgroundDrawable): Int {
        val borderRgb = reflectionUtils.getDeclaredField(
            backgroundDrawable,
            BORDER_RGB_FIELD_NAME
        ) as? Spacing

        val borderAlpha = reflectionUtils.getDeclaredField(
            backgroundDrawable,
            BORDER_ALPHA_FIELD_NAME
        ) as? Spacing

        val rgb = borderRgb?.get(Spacing.ALL) ?: DEFAULT_BORDER_RGB
        val alpha = borderAlpha?.get(Spacing.ALL) ?: DEFAULT_BORDER_ALPHA

        val rgbComponent = 0x00FFFFFF and rgb.toInt()
        val alphaComponent = -0x1000000 and ((alpha.toInt()) shl 24)

        return rgbComponent or alphaComponent
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
        private const val BORDER_RGB_FIELD_NAME = "mBorderRGB"
        private const val BORDER_ALPHA_FIELD_NAME = "mBorderAlpha"
        private const val DEFAULT_BORDER_RGB: Int = 0x00FFFFFF and Color.BLACK
        private const val DEFAULT_BORDER_ALPHA: Int = -0x1000000 and Color.BLACK
    }
}
