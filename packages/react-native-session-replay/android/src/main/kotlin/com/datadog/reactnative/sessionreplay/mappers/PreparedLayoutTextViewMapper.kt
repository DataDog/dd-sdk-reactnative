/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.mappers

import ReactViewBackgroundDrawableUtils
import android.graphics.Typeface
import android.text.Layout
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.view.View
import android.view.ViewGroup
import com.datadog.android.api.InternalLogger
import com.datadog.android.sessionreplay.TextAndInputPrivacy
import com.datadog.android.sessionreplay.internal.recorder.obfuscator.StringObfuscator
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.android.sessionreplay.recorder.MappingContext
import com.datadog.android.sessionreplay.recorder.mapper.TraverseAllChildrenMapper
import com.datadog.android.sessionreplay.utils.AsyncJobStatusCallback
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.datadog.reactnative.sessionreplay.utils.formatAsRgba
import java.lang.reflect.Method
import java.util.Locale

/** Maps the ViewGroup-based text implementation introduced in RN 0.89. */
internal class PreparedLayoutTextViewMapper(
    private val layoutReader: (View, InternalLogger) -> PreparedTextLayout? = PreparedTextLayoutReader()::read,
    drawableUtils: DrawableUtils = ReactViewBackgroundDrawableUtils(),
    private val obfuscator: StringObfuscator = StringObfuscator.getStringObfuscator()
) : DefaultMapper<ViewGroup>(drawableUtils), TraverseAllChildrenMapper<ViewGroup> {

    private val fontFamilyMethod: Method? by lazy {
        try {
            Class.forName(
                "com.facebook.react.views.text.internal.span.CustomStyleSpan",
                false,
                PreparedLayoutTextViewMapper::class.java.classLoader
            ).getMethod("getFontFamily")
        } catch (_: ReflectiveOperationException) {
            null
        } catch (_: LinkageError) {
            null
        } catch (_: SecurityException) {
            null
        }
    }

    override fun map(
        view: ViewGroup,
        mappingContext: MappingContext,
        asyncJobStatusCallback: AsyncJobStatusCallback,
        internalLogger: InternalLogger
    ): List<MobileSegment.Wireframe> {
        val background = super.map(view, mappingContext, asyncJobStatusCallback, internalLogger)
            .first() as MobileSegment.Wireframe.ShapeWireframe
        val prepared = layoutReader(view, internalLogger) ?: return listOf(background)
        val density = mappingContext.systemInformation.screenDensity.coerceAtLeast(1f)
        return listOf(
            MobileSegment.Wireframe.TextWireframe(
                id = background.id,
                x = background.x,
                y = background.y,
                width = background.width,
                height = background.height,
                shapeStyle = background.shapeStyle,
                border = background.border,
                // Layout text includes ellipsis; source text is retained only for style spans.
                text = capturedText(prepared.layout.text, mappingContext),
                textStyle = textStyle(prepared, density),
                textPosition = textPosition(view, prepared, density)
            )
        )
    }

    private fun capturedText(text: CharSequence, context: MappingContext): String {
        val original = text.toString()
        return when (context.textAndInputPrivacy) {
            TextAndInputPrivacy.MASK_ALL -> if (context.hasOptionSelectorParent) {
                INPUT_MASK
            } else {
                obfuscator.obfuscate(original)
            }
            TextAndInputPrivacy.MASK_ALL_INPUTS -> if (context.hasOptionSelectorParent) {
                INPUT_MASK
            } else {
                original
            }
            TextAndInputPrivacy.MASK_SENSITIVE_INPUTS -> original
        }
    }

    private fun textStyle(prepared: PreparedTextLayout, density: Float): MobileSegment.TextStyle {
        val paint = prepared.layout.paint
        val spanColor = (prepared.sourceText as? Spanned)
            ?.getSpans(0, prepared.sourceText.length, ForegroundColorSpan::class.java)
            ?.firstOrNull()?.foregroundColor
        val family = fontFamilyFromSpans(prepared.sourceText) ?: when (paint.typeface) {
            Typeface.MONOSPACE -> MONOSPACE_FAMILY_NAME
            Typeface.SERIF -> SERIF_FAMILY_NAME
            else -> SANS_SERIF_FAMILY_NAME
        }
        return MobileSegment.TextStyle(
            family = when (family.lowercase(Locale.US)) {
                MONOSPACE_FAMILY_NAME -> MONOSPACE_FAMILY_NAME
                SERIF_FAMILY_NAME -> SERIF_FAMILY_NAME
                else -> SANS_SERIF_FAMILY_NAME
            },
            size = (paint.textSize / density).toLong(),
            color = formatAsRgba(spanColor ?: paint.color),
            truncationMode = truncationMode(prepared.layout)
        )
    }

    private fun fontFamilyFromSpans(text: CharSequence): String? {
        val spanned = text as? Spanned ?: return null
        val method = fontFamilyMethod ?: return null
        val span = spanned.getSpans(0, spanned.length, method.declaringClass)
            ?.firstOrNull() ?: return null
        return try {
            method.invoke(span) as? String
        } catch (_: ReflectiveOperationException) {
            null
        } catch (_: SecurityException) {
            null
        }
    }

    private fun textPosition(
        view: View,
        prepared: PreparedTextLayout,
        density: Float
    ): MobileSegment.TextPosition {
        val layout = prepared.layout
        val rtl = layout.lineCount > 0 && layout.getParagraphDirection(0) < 0
        val horizontal = when (layout.alignment) {
            Layout.Alignment.ALIGN_CENTER -> MobileSegment.Horizontal.CENTER
            Layout.Alignment.ALIGN_OPPOSITE -> if (rtl) MobileSegment.Horizontal.LEFT else MobileSegment.Horizontal.RIGHT
            else -> if (rtl) MobileSegment.Horizontal.RIGHT else MobileSegment.Horizontal.LEFT
        }
        return MobileSegment.TextPosition(
            padding = MobileSegment.Padding(
                top = ((view.paddingTop + prepared.verticalOffset) / density).toLong(),
                bottom = (view.paddingBottom / density).toLong(),
                left = (view.paddingLeft / density).toLong(),
                right = (view.paddingRight / density).toLong()
            ),
            alignment = MobileSegment.Alignment(horizontal, MobileSegment.Vertical.TOP)
        )
    }

    private fun truncationMode(layout: Layout): MobileSegment.TruncationMode? {
        for (line in 0 until layout.lineCount) {
            val count = layout.getEllipsisCount(line)
            if (count > 0) {
                val start = layout.getEllipsisStart(line)
                return when {
                    line == 0 && start == 0 -> MobileSegment.TruncationMode.HEAD
                    start + count < layout.getLineEnd(line) - layout.getLineStart(line) -> MobileSegment.TruncationMode.MIDDLE
                    else -> MobileSegment.TruncationMode.TAIL
                }
            }
        }
        return null
    }

    internal companion object {
        private const val INPUT_MASK: String = "***"
        private const val MONOSPACE_FAMILY_NAME: String = "monospace"
        private const val SERIF_FAMILY_NAME: String = "serif"
        private const val SANS_SERIF_FAMILY_NAME: String = "roboto, sans-serif"

        /** Missing classes are expected on RN versions before prepared text was introduced. */
        fun resolveViewClass(): Class<out ViewGroup>? {
            return try {
                Class.forName(
                    "com.facebook.react.views.text.PreparedLayoutTextView",
                    false,
                    PreparedLayoutTextViewMapper::class.java.classLoader
                ).asSubclass(ViewGroup::class.java)
            } catch (_: ClassNotFoundException) {
                null
            } catch (_: LinkageError) {
                null
            } catch (_: ClassCastException) {
                null
            } catch (_: SecurityException) {
                null
            }
        }
    }
}
