package com.datadog.reactnative.sessionreplay.utils.text

import android.text.style.ForegroundColorSpan
import android.widget.TextView
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.datadog.reactnative.sessionreplay.utils.formatAsRgba
import com.facebook.react.bridge.ReactContext
import com.facebook.react.views.text.ReactTextView
import java.util.Locale

internal class FabricTextViewUtils(reactContext: ReactContext, drawableUtils: DrawableUtils): TextViewUtils(reactContext, drawableUtils) {

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
        // Use the public accessor so R8 can rewrite the reference when it obfuscates ReactTextView.
        // Looking up the private mSpanned field by name breaks in minified applications.
        val spanned = (view as? ReactTextView)?.spanned
        val spans = spanned?.getSpans(0, spanned.length, ForegroundColorSpan::class.java)
        val fontColor = spans?.firstOrNull()?.foregroundColor?.let { formatAsRgba(it) } ?: textWireframe.textStyle.color

        return fontColor
    }

    private fun getFontSize(view: TextView, pixelsDensity: Float): Long {
        val density = pixelsDensity.coerceAtLeast(1f)
        return (view.textSize / density).toLong()
    }

    private fun getFontFamily(textWireframe: MobileSegment.Wireframe.TextWireframe): String {
        val fontFamily = textWireframe.textStyle.family
        return resolveFontFamily(fontFamily.lowercase(Locale.US))
    }
}
