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
        if (drawable is ReactViewBackgroundDrawable) {
            return drawable
        }

        if (drawable is InsetDrawable) {
            return getReactBackgroundFromDrawable(drawable.drawable)
        }

        if (drawable is LayerDrawable) {
            for (layerNumber in 0 until drawable.numberOfLayers) {
                val layer = drawable.getDrawable(layerNumber)
                if (layer is ReactViewBackgroundDrawable) {
                    return layer
                }
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
        ) as Int?
    }

    private companion object {
        private const val COLOR_FIELD_NAME = "mColor"
    }
}
