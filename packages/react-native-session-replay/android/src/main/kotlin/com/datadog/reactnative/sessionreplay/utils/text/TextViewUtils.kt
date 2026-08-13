package com.datadog.reactnative.sessionreplay.utils.text

import ReactViewBackgroundDrawableUtils
import android.view.Gravity
import android.widget.TextView
import androidx.annotation.VisibleForTesting
import com.datadog.android.api.InternalLogger
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.android.sessionreplay.recorder.MappingContext
import com.datadog.reactnative.sessionreplay.BuildConfig
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.facebook.react.bridge.ReactContext

internal abstract class TextViewUtils(private val reactContext: ReactContext, private val drawableUtils: DrawableUtils) {
    fun mapTextViewToWireframes(
        wireframes: List<MobileSegment.Wireframe>,
        view: TextView,
        mappingContext: MappingContext,
    ): List<MobileSegment.Wireframe> {
        val result = mutableListOf<MobileSegment.Wireframe>()
        val pixelDensity = mappingContext.systemInformation.screenDensity

        for (originalWireframe in wireframes) {
            if (originalWireframe !is MobileSegment.Wireframe.TextWireframe) {
                result.add(originalWireframe)
            } else {
                result.add(addReactNativeProperties(
                    originalWireframe = originalWireframe,
                    view = view,
                    pixelDensity = pixelDensity,
                ))
            }
        }

        return result
    }

    fun addReactNativeProperties(
        originalWireframe: MobileSegment.Wireframe.TextWireframe,
        view: TextView,
        pixelDensity: Float,
    ): MobileSegment.Wireframe.TextWireframe {
        val (shapeStyle, border) = resolveShapeStyleAndBorder(view, pixelDensity)
            ?: (originalWireframe.shapeStyle to originalWireframe.border)

        val (textStyle, textPosition) = resolveTextStyleAndPosition(
            originalWireframe,
            view,
            pixelDensity
        ) ?: (originalWireframe.textStyle to originalWireframe.textPosition)

        // nothing changed, return the original wireframe
        @Suppress("ComplexCondition")
        if (shapeStyle == originalWireframe.shapeStyle
            && border == originalWireframe.border
            && textStyle == originalWireframe.textStyle
            && textPosition == originalWireframe.textPosition
        ) {
            return originalWireframe
        }

        return originalWireframe.copy(
            shapeStyle = shapeStyle,
            border = border,
            textStyle = textStyle,
            textPosition = textPosition
        )
    }


    protected fun resolveTextStyleAndPosition(
        originalWireframe: MobileSegment.Wireframe.TextWireframe,
        view: TextView,
        pixelDensity: Float
    ): Pair<MobileSegment.TextStyle, MobileSegment.TextPosition>? {
        if (!reactContext.hasActiveReactInstance()) {
            return null
        }

        val textStyle = resolveTextStyle(originalWireframe, pixelDensity, view) ?: return null
        val alignment = resolveTextAlignment(view, originalWireframe)

        val textPosition = MobileSegment.TextPosition(
            alignment = alignment,
            padding = originalWireframe.textPosition?.padding
        )

        return textStyle to textPosition
    }

    protected fun resolveShapeStyleAndBorder(
        view: TextView,
        pixelDensity: Float,
    ): Pair<MobileSegment.ShapeStyle?, MobileSegment.ShapeBorder?>? {
        val backgroundDrawable = drawableUtils
            .getReactBackgroundFromDrawable(view.background) ?: return null

        // view.alpha is the value of the opacity prop on the js side
        val opacity = view.alpha

        val (shapeStyle, border) =
            drawableUtils
                .resolveShapeAndBorder(backgroundDrawable, opacity, pixelDensity)

        return shapeStyle to border
    }

    protected fun resolveTextAlignment(
        view: TextView,
        textWireframe: MobileSegment.Wireframe.TextWireframe
    ): MobileSegment.Alignment {
        val gravity = view.gravity
        val horizontal = textWireframe.textPosition?.alignment?.horizontal
        val vertical =
            when (gravity.and(Gravity.VERTICAL_GRAVITY_MASK)) {
                Gravity.TOP -> MobileSegment.Vertical.TOP
                Gravity.CENTER_VERTICAL,
                Gravity.CENTER -> MobileSegment.Vertical.CENTER
                Gravity.BOTTOM -> MobileSegment.Vertical.BOTTOM
                else -> MobileSegment.Vertical.TOP
            }

        return MobileSegment.Alignment(
            horizontal = horizontal,
            vertical = vertical
        )
    }

    protected fun resolveFontFamily(typefaceName: String): String =
        when (typefaceName) {
            ROBOTO_TYPEFACE_NAME -> SANS_SERIF_FAMILY_NAME
            MONOSPACE_FAMILY_NAME -> MONOSPACE_FAMILY_NAME
            SERIF_FAMILY_NAME -> SERIF_FAMILY_NAME
            else -> SANS_SERIF_FAMILY_NAME
        }

    protected abstract fun resolveTextStyle( textWireframe: MobileSegment.Wireframe.TextWireframe,
                                   pixelsDensity: Float,
                                   view: TextView
    ): MobileSegment.TextStyle?

    @VisibleForTesting
    companion object {
        private const val ROBOTO_TYPEFACE_NAME = "roboto"
        private const val SERIF_FAMILY_NAME = "serif"
        private const val SANS_SERIF_FAMILY_NAME = "roboto, sans-serif"
        internal const val MONOSPACE_FAMILY_NAME = "monospace"

        fun create(reactContext: ReactContext, logger: InternalLogger): TextViewUtils {
            return when (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
                true -> FabricTextViewUtils(reactContext, ReactViewBackgroundDrawableUtils())
                false -> LegacyTextViewUtils(reactContext, logger, ReactViewBackgroundDrawableUtils())
            }
        }
    }

}
