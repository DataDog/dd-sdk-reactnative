/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import android.view.Gravity
import android.widget.TextView
import androidx.annotation.VisibleForTesting
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.reactnative.sessionreplay.extensions.convertToDensityNormalized
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.datadog.reactnative.sessionreplay.utils.ReactViewBackgroundDrawableUtils
import com.datadog.reactnative.sessionreplay.utils.ReflectionUtils
import com.datadog.reactnative.sessionreplay.utils.formatAsRgba
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerModule
import com.facebook.react.views.text.TextAttributes
import com.facebook.react.views.view.ReactViewBackgroundDrawable
import java.util.Locale

internal class ReactTextPropertiesResolver(
    private val reactContext: ReactContext,
    private val uiManagerModule: UIManagerModule,
    private val reflectionUtils: ReflectionUtils = ReflectionUtils(),
    private val reactViewBackgroundDrawableUtils: ReactViewBackgroundDrawableUtils =
        ReactViewBackgroundDrawableUtils(),
    private val drawableUtils: DrawableUtils = DrawableUtils()
): TextPropertiesResolver {
    override fun addReactNativeProperties(
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

    private fun resolveTextStyleAndPosition(
        originalWireframe: MobileSegment.Wireframe.TextWireframe,
        view: TextView,
        pixelDensity: Float,
    ):
            Pair<MobileSegment.TextStyle, MobileSegment.TextPosition>? {
        val shadowNodeWrapper: ShadowNodeWrapper =
            ShadowNodeWrapper.getShadowNodeWrapper(
                reactContext = reactContext,
                uiManagerModule = uiManagerModule,
                reflectionUtils = reflectionUtils,
                viewId = view.id) ?: return null

        val textStyle = resolveTextStyle(originalWireframe, pixelDensity, shadowNodeWrapper)
        val alignment = resolveTextAlignment(view, originalWireframe)

        val textPosition = MobileSegment.TextPosition(
            alignment = alignment,
            padding = originalWireframe.textPosition?.padding
        )

        return textStyle to textPosition
    }

    private fun resolveShapeStyleAndBorder(
        view: TextView,
        pixelDensity: Float,
    ): Pair<MobileSegment.ShapeStyle?, MobileSegment.ShapeBorder?>? {
        val backgroundDrawable: ReactViewBackgroundDrawable =
            drawableUtils.getReactBackgroundFromDrawable(view.background) ?: return null

        // view.alpha is the value of the opacity prop on the js side
        val opacity = view.alpha

        val (shapeStyle, border) =
            reactViewBackgroundDrawableUtils
                .resolveShapeAndBorder(backgroundDrawable, opacity, pixelDensity)

        return shapeStyle to border
    }

    private fun resolveTextAlignment(
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

    private fun resolveTextStyle(
        textWireframe: MobileSegment.Wireframe.TextWireframe,
        pixelsDensity: Float,
        shadowNodeWrapper: ShadowNodeWrapper
    ): MobileSegment.TextStyle {
        val fontFamily = getFontFamily(shadowNodeWrapper)
            ?: textWireframe.textStyle.family
        val fontSize = getFontSize(shadowNodeWrapper)
            ?.convertToDensityNormalized(pixelsDensity)
            ?: textWireframe.textStyle.size
        val fontColor = getTextColor(shadowNodeWrapper)
            ?: textWireframe.textStyle.color

        return MobileSegment.TextStyle(
            family = fontFamily,
            size = fontSize,
            color = fontColor
        )
    }

    private fun getTextColor(shadowNodeWrapper: ShadowNodeWrapper): String? {
        val resolvedColor = shadowNodeWrapper
            .getDeclaredShadowNodeField(COLOR_FIELD_NAME) as Int?
        if (resolvedColor != null) {
            return formatAsRgba(resolvedColor)
        }

        return null
    }

    private fun getFontSize(shadowNodeWrapper: ShadowNodeWrapper): Long? {
        val textAttributes = shadowNodeWrapper
            .getDeclaredShadowNodeField(TEXT_ATTRIBUTES_FIELD_NAME) as? TextAttributes?
        if (textAttributes != null) {
            return textAttributes.effectiveFontSize.toLong()
        }

        return null
    }

    private fun getFontFamily(shadowNodeWrapper: ShadowNodeWrapper): String? {
        val fontFamily = shadowNodeWrapper
            .getDeclaredShadowNodeField(FONT_FAMILY_FIELD_NAME) as? String

        if (fontFamily != null) {
            return resolveFontFamily(fontFamily.lowercase(Locale.US))
        }

        return null
    }

    private fun resolveFontFamily(typefaceName: String): String =
        when (typefaceName) {
            ROBOTO_TYPEFACE_NAME -> SANS_SERIF_FAMILY_NAME
            MONOSPACE_FAMILY_NAME -> MONOSPACE_FAMILY_NAME
            SERIF_FAMILY_NAME -> SERIF_FAMILY_NAME
            else -> SANS_SERIF_FAMILY_NAME
        }

    @VisibleForTesting
    internal companion object {
        internal const val TEXT_ATTRIBUTES_FIELD_NAME = "mTextAttributes"
        internal const val FONT_FAMILY_FIELD_NAME = "mFontFamily"
        internal const val COLOR_FIELD_NAME = "mColor"

        private const val ROBOTO_TYPEFACE_NAME = "roboto"
        private const val SERIF_FAMILY_NAME = "serif"
        private const val SANS_SERIF_FAMILY_NAME = "roboto, sans-serif"
        internal const val MONOSPACE_FAMILY_NAME = "monospace"
    }
}
