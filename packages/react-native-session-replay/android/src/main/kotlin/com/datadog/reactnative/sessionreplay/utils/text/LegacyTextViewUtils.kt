package com.datadog.reactnative.sessionreplay.utils.text

import android.widget.TextView
import androidx.annotation.VisibleForTesting
import com.datadog.android.api.InternalLogger
import com.datadog.android.internal.utils.densityNormalized
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.reactnative.sessionreplay.ShadowNodeWrapper
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.datadog.reactnative.sessionreplay.utils.ReflectionUtils
import com.datadog.reactnative.sessionreplay.utils.formatAsRgba
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerModule
import com.facebook.react.views.text.TextAttributes
import java.util.Locale

internal class LegacyTextViewUtils(
    private val reactContext: ReactContext,
    private val logger: InternalLogger,
    private val reflectionUtils: ReflectionUtils,
    drawableUtils: DrawableUtils,
) : TextViewUtils(reactContext, drawableUtils) {

    private val uiManager: UIManagerModule? by lazy {
        getUiManagerModule()
    }

    override fun resolveTextStyle(
        textWireframe: MobileSegment.Wireframe.TextWireframe,
        pixelsDensity: Float,
        view: TextView,
    ): MobileSegment.TextStyle? {
        val shadowNodeWrapper: ShadowNodeWrapper =
            ShadowNodeWrapper.getShadowNodeWrapper(
                reactContext = reactContext,
                uiManagerModule = uiManager,
                reflectionUtils = reflectionUtils,
                viewId = view.id,
            ) ?: return null

        val fontFamily = getFontFamily(shadowNodeWrapper) ?: textWireframe.textStyle.family

        val fontSize = getFontSize(shadowNodeWrapper)?.densityNormalized(pixelsDensity) ?: textWireframe.textStyle.size

        val fontColor = getTextColor(shadowNodeWrapper) ?: textWireframe.textStyle.color

        return MobileSegment.TextStyle(
            family = fontFamily,
            size = fontSize,
            color = fontColor,
        )
    }

    private fun getTextColor(shadowNodeWrapper: ShadowNodeWrapper?): String? {
        if (shadowNodeWrapper == null) return null

        val isColorSet =
            shadowNodeWrapper
                .getDeclaredShadowNodeField(IS_COLOR_SET_FIELD_NAME) as Boolean?

        if (isColorSet != true) {
            // Improvement: get default text color if different from black
            return "#000000FF"
        }
        val resolvedColor =
            shadowNodeWrapper
                .getDeclaredShadowNodeField(COLOR_FIELD_NAME) as? Int
        if (resolvedColor != null) {
            return formatAsRgba(resolvedColor)
        }

        return null
    }

    private fun getFontSize(shadowNodeWrapper: ShadowNodeWrapper?): Long? {
        if (shadowNodeWrapper == null) return null

        val textAttributes =
            shadowNodeWrapper
                .getDeclaredShadowNodeField(TEXT_ATTRIBUTES_FIELD_NAME) as? TextAttributes?
        if (textAttributes != null) {
            return textAttributes.effectiveFontSize.toLong()
        }

        return null
    }

    private fun getFontFamily(shadowNodeWrapper: ShadowNodeWrapper?): String? {
        if (shadowNodeWrapper == null) return null

        val fontFamily =
            shadowNodeWrapper
                .getDeclaredShadowNodeField(FONT_FAMILY_FIELD_NAME) as? String

        if (fontFamily != null) {
            return resolveFontFamily(fontFamily.lowercase(Locale.US))
        }

        return null
    }

    // store to avoid calling it multiple times
    @VisibleForTesting
    internal fun getUiManagerModule(): UIManagerModule? {
        return try {
            reactContext.getNativeModule(UIManagerModule::class.java)
        } catch (e: IllegalStateException) {
            logger.log(
                level = InternalLogger.Level.WARN,
                targets = listOf(InternalLogger.Target.MAINTAINER, InternalLogger.Target.TELEMETRY),
                messageBuilder = { RESOLVE_UIMANAGERMODULE_ERROR },
                throwable = e,
            )
            return null
        }
    }
}
