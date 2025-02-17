package com.datadog.reactnative.sessionreplay.utils.text

import android.text.Spannable
import android.text.style.ForegroundColorSpan
import android.view.View
import android.widget.TextView
import com.datadog.android.api.InternalLogger
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.datadog.reactnative.sessionreplay.utils.formatAsRgba
import com.facebook.react.bridge.ReactContext
import java.util.Locale

internal class FabricTextViewUtils(private val reactContext: ReactContext, private val logger: InternalLogger, drawableUtils: DrawableUtils): TextViewUtils(reactContext, drawableUtils) {

    override fun resolveTextStyle(
        textWireframe: MobileSegment.Wireframe.TextWireframe,
        pixelsDensity: Float,
        view: TextView
    ): MobileSegment.TextStyle {

        val fontColor = getTextColor(view, textWireframe)
        val fontSize = getFontSize(view, pixelsDensity)
        val fontFamily = getFontFamily(textWireframe)

        return MobileSegment.TextStyle(
            family = fontFamily,
            size = fontSize,
            color = fontColor
        )
    }

    private fun getTextColor(view: TextView, textWireframe: MobileSegment.Wireframe.TextWireframe): String {
        val spanned = getFieldFromView(view, SPANNED_FIELD_NAME) as? Spannable
        val spans = spanned?.getSpans(0, spanned.length, ForegroundColorSpan::class.java)
        val fontColor = spans?.firstOrNull()?.foregroundColor?.let { formatAsRgba(it) } ?: textWireframe.textStyle.color

        return fontColor
    }

    private fun getFontSize(view: TextView, pixelsDensity: Float): Long {
        val fontSize = (view.textSize / pixelsDensity).toLong()
        return fontSize
    }

    private fun getFontFamily(textWireframe: MobileSegment.Wireframe.TextWireframe): String {
        val fontFamily = textWireframe.textStyle.family
        return resolveFontFamily(fontFamily.lowercase(Locale.US))
    }

    internal fun getFieldFromView(view: View, value: String): Any? {
        try {
            val field = view.javaClass.getDeclaredField(value)
            field.isAccessible = true
            return field.get(view)
        } catch (@Suppress("TooGenericExceptionCaught") e: Exception) {
            when (e) {
                is NoSuchFieldException -> handleError(e, RESOLVE_FABRICFIELD_ERROR)
                is NullPointerException -> handleError(e, NULL_FABRICFIELD_ERROR)
                else -> handleError(e, RESOLVE_FABRICFIELD_ERROR)
            }
            return null
        }
    }

    private fun handleError(e: Exception, message: String) {
        logger.log(
            level = InternalLogger.Level.WARN,
            targets = listOf(InternalLogger.Target.MAINTAINER, InternalLogger.Target.TELEMETRY),
            messageBuilder = { message },
            throwable = e
        )
    }
}