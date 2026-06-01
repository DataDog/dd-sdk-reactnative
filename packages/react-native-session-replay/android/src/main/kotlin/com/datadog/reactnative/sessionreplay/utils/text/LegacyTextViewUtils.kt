package com.datadog.reactnative.sessionreplay.utils.text

import android.graphics.Color
import android.graphics.Typeface
import android.text.Spanned
import android.text.style.AbsoluteSizeSpan
import android.text.style.ForegroundColorSpan
import android.widget.TextView
import com.datadog.android.api.InternalLogger
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.datadog.reactnative.sessionreplay.utils.formatAsRgba
import com.facebook.react.bridge.ReactContext
import java.util.Locale

internal class LegacyTextViewUtils(
    reactContext: ReactContext,
    private val logger: InternalLogger,
    drawableUtils: DrawableUtils,
) : TextViewUtils(reactContext, drawableUtils) {

    override fun resolveTextStyle(
        textWireframe: MobileSegment.Wireframe.TextWireframe,
        pixelsDensity: Float,
        view: TextView,
    ): MobileSegment.TextStyle {
        val family = resolveFontFamilyFromTypeface(view)
        val sizeSp = resolveTextSize(view, pixelsDensity)
        val color = resolveTextColor(view)

        return MobileSegment.TextStyle(
            family = family,
            size = sizeSp,
            color = color,
        )
    }

    private fun resolveTextSize(view: TextView, pixelsDensity: Float): Long {
        val density = pixelsDensity.coerceAtLeast(1f)
        val spanned = view.text as? Spanned
        if (spanned != null) {
            val span = spanned.getSpans(0, spanned.length, AbsoluteSizeSpan::class.java)
                ?.firstOrNull()
            if (span != null) {
                return if (span.dip) span.size.toLong() else (span.size / density).toLong()
            }
        }
        return (view.textSize / density).toLong()
    }

    private fun resolveTextColor(view: TextView): String {
        val spanned = view.text as? Spanned ?: return formatAsRgba(RN_DEFAULT_TEXT_COLOR)

        val span = spanned.getSpans(0, spanned.length, ForegroundColorSpan::class.java)
            ?.firstOrNull()
        // If no ForegroundColorSpan is present, RN has not set an explicit color — fall back to
        // RN's default (opaque black). view.currentTextColor is not used because RN old arch never
        // calls setTextColor(); color is always applied via spans, so currentTextColor reflects
        // the Android theme default rather than the actual rendered color.
        return if (span != null) {
            formatAsRgba(span.foregroundColor)
        } else {
            formatAsRgba(RN_DEFAULT_TEXT_COLOR)
        }
    }

    private fun resolveFontFamilyFromTypeface(view: TextView): String {
        resolveFontFamilyFromSpans(view)?.let { return resolveFontFamily(it.lowercase(Locale.US)) }

        // Fallback for non-RN views. Typeface.familyName requires API 28, so we use identity
        // comparison against the standard singletons instead.
        return when (view.typeface) {
            Typeface.MONOSPACE -> MONOSPACE_FAMILY_NAME
            Typeface.SERIF -> resolveFontFamily("serif")
            else -> resolveFontFamily("roboto")
        }
    }

    private val customStyleSpanClass: Class<*>? by lazy {
        try {
            Class.forName(CUSTOM_STYLE_SPAN_CLASS_NAME)
        } catch (e: ClassNotFoundException) {
            logger.log(
                level = InternalLogger.Level.WARN,
                targets = listOf(InternalLogger.Target.MAINTAINER, InternalLogger.Target.TELEMETRY),
                messageBuilder = { CUSTOM_STYLE_SPAN_CLASS_NOT_FOUND_ERROR },
                throwable = e,
            )
            null
        }
    }

    // The class is loaded by name to avoid a hard compile-time dependency on an RN-internal type.
    // `spanClass as Class<Any>` is a generic (erased) cast — safe at runtime.
    private fun resolveFontFamilyFromSpans(view: TextView): String? {
        val spanned = view.text as? Spanned ?: return null
        val spanClass = customStyleSpanClass ?: return null

        @Suppress("UNCHECKED_CAST")
        val spans = spanned.getSpans(0, spanned.length, spanClass as Class<Any>) ?: return null
        val span = spans.firstOrNull() ?: return null

        return try {
            span.javaClass.getMethod(GET_FONT_FAMILY_METHOD).invoke(span) as? String
        } catch (@Suppress("TooGenericExceptionCaught") e: Exception) {
            logger.log(
                level = InternalLogger.Level.WARN,
                targets = listOf(InternalLogger.Target.MAINTAINER, InternalLogger.Target.TELEMETRY),
                messageBuilder = { RESOLVE_FONT_FAMILY_FROM_SPAN_ERROR },
                throwable = e,
            )
            null
        }
    }

    companion object {
        // RN old arch applies color exclusively via ForegroundColorSpan and never calls
        // setTextColor(), so view.currentTextColor returns the Android theme default rather than
        // the actual rendered color. When no span is present, fall back to RN's own default.
        internal val RN_DEFAULT_TEXT_COLOR = Color.BLACK

        private const val CUSTOM_STYLE_SPAN_CLASS_NAME =
            "com.facebook.react.views.text.internal.span.CustomStyleSpan"
        private const val GET_FONT_FAMILY_METHOD = "getFontFamily"

        internal const val CUSTOM_STYLE_SPAN_CLASS_NOT_FOUND_ERROR =
            "CustomStyleSpan class not found — font family will fall back to typeface comparison. " +
            "The class may have been moved or renamed in this version of React Native."
        internal const val RESOLVE_FONT_FAMILY_FROM_SPAN_ERROR =
            "Unable to resolve font family from CustomStyleSpan via reflection"
    }

}
