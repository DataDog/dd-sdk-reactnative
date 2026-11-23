/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.mappers

import android.graphics.Typeface
import android.text.Layout
import android.text.Spanned
import android.text.TextPaint
import android.text.style.ForegroundColorSpan
import android.view.ViewGroup
import com.datadog.android.api.InternalLogger
import com.datadog.android.sessionreplay.TextAndInputPrivacy
import com.datadog.android.sessionreplay.internal.recorder.obfuscator.StringObfuscator
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.android.sessionreplay.recorder.MappingContext
import com.datadog.android.sessionreplay.recorder.SystemInformation
import com.datadog.android.sessionreplay.utils.AsyncJobStatusCallback
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.facebook.react.views.text.internal.span.CustomStyleSpan
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.CsvSource
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.mockito.quality.Strictness

@ExtendWith(MockitoExtension::class)
@MockitoSettings(strictness = Strictness.LENIENT)
internal class PreparedLayoutTextViewMapperTest {
    private val view: ViewGroup = mock()
    private val context: MappingContext = mock()
    private val system: SystemInformation = mock()
    private val layout: Layout = mock()
    private val paint: TextPaint = mock()
    private val logger: InternalLogger = mock()
    private val callback: AsyncJobStatusCallback = mock()
    private val drawableUtils: DrawableUtils = mock()
    private val obfuscator: StringObfuscator = mock()
    private lateinit var mapper: PreparedLayoutTextViewMapper

    @BeforeEach
    fun `set up`() {
        whenever(context.systemInformation).thenReturn(system)
        whenever(system.screenDensity).thenReturn(2f)
        whenever(context.textAndInputPrivacy).thenReturn(TextAndInputPrivacy.MASK_SENSITIVE_INPUTS)
        whenever(layout.text).thenReturn("hello")
        whenever(layout.paint).thenReturn(paint)
        whenever(paint.typeface).thenReturn(mock<Typeface>())
        whenever(paint.textSize).thenReturn(28f)
        whenever(paint.color).thenReturn(0xff000000.toInt())
        whenever(layout.alignment).thenReturn(Layout.Alignment.ALIGN_NORMAL)
        whenever(layout.lineCount).thenReturn(1)
        whenever(layout.getParagraphDirection(0)).thenReturn(1)
        mapper = PreparedLayoutTextViewMapper(
            layoutReader = { _, _ -> PreparedTextLayout(layout, "hello", 0f) },
            drawableUtils = drawableUtils,
            obfuscator = obfuscator
        )
    }

    @Test
    fun `M capture prepared text and layout style W map()`() {
        val result = mapText()

        assertThat(result.text).isEqualTo("hello")
        assertThat(result.textStyle.size).isEqualTo(14)
        assertThat(result.textStyle.color).isEqualTo("#000000ff")
        assertThat(result.textPosition?.alignment?.horizontal).isEqualTo(
            MobileSegment.Horizontal.LEFT
        )
        assertThat(result.textPosition?.alignment?.vertical).isEqualTo(
            MobileSegment.Vertical.TOP
        )
    }

    @Test
    fun `M mask all text W map()`() {
        whenever(context.textAndInputPrivacy).thenReturn(TextAndInputPrivacy.MASK_ALL)
        whenever(obfuscator.obfuscate("hello")).thenReturn("xxxxx")

        assertThat(mapText().text).isEqualTo("xxxxx")
        verify(obfuscator).obfuscate("hello")
    }

    @Test
    fun `M mask option text W map() { mask all inputs }`() {
        whenever(context.textAndInputPrivacy).thenReturn(TextAndInputPrivacy.MASK_ALL_INPUTS)
        whenever(context.hasOptionSelectorParent).thenReturn(true)

        assertThat(mapText().text).isEqualTo("***")
    }

    @Test
    fun `M mask option text W map() { mask all }`() {
        whenever(context.textAndInputPrivacy).thenReturn(TextAndInputPrivacy.MASK_ALL)
        whenever(context.hasOptionSelectorParent).thenReturn(true)

        assertThat(mapText().text).isEqualTo("***")
    }

    @Test
    fun `M retain ordinary text W map() { mask all inputs }`() {
        whenever(context.textAndInputPrivacy).thenReturn(TextAndInputPrivacy.MASK_ALL_INPUTS)

        assertThat(mapText().text).isEqualTo("hello")
    }

    @Test
    fun `M retain background only W map() { layout unavailable }`() {
        mapper = PreparedLayoutTextViewMapper(
            layoutReader = { _, _ -> null },
            drawableUtils = drawableUtils,
            obfuscator = obfuscator
        )

        val result = mapper.map(view, context, callback, logger)

        assertThat(result).hasSize(1)
        assertThat(result[0]).isInstanceOf(MobileSegment.Wireframe.ShapeWireframe::class.java)
    }

    @Test
    fun `M preserve RTL alignment W map()`() {
        whenever(layout.getParagraphDirection(0)).thenReturn(-1)

        assertThat(mapText().textPosition?.alignment?.horizontal).isEqualTo(
            MobileSegment.Horizontal.RIGHT
        )
    }

    @Test
    fun `M preserve center alignment W map()`() {
        whenever(layout.alignment).thenReturn(Layout.Alignment.ALIGN_CENTER)

        assertThat(mapText().textPosition?.alignment?.horizontal).isEqualTo(
            MobileSegment.Horizontal.CENTER
        )
    }

    @Test
    fun `M describe tail truncation W map()`() {
        whenever(layout.getEllipsisCount(0)).thenReturn(3)
        whenever(layout.getEllipsisStart(0)).thenReturn(2)
        whenever(layout.getLineEnd(0)).thenReturn(5)

        assertThat(mapText().textStyle.truncationMode).isEqualTo(MobileSegment.TruncationMode.TAIL)
    }

    @Test
    fun `M retain span alpha W map()`() {
        val text: Spanned = mock()
        val span: ForegroundColorSpan = mock()
        whenever(text.toString()).thenReturn("hello")
        whenever(text.length).thenReturn(5)
        whenever(text.getSpans(0, 5, ForegroundColorSpan::class.java)).thenReturn(arrayOf(span))
        whenever(span.foregroundColor).thenReturn(0x66000000)
        mapper = PreparedLayoutTextViewMapper(
            layoutReader = { _, _ -> PreparedTextLayout(layout, text, 0f) },
            drawableUtils = drawableUtils,
            obfuscator = obfuscator
        )

        assertThat(mapText().textStyle.color).isEqualTo("#00000066")
    }

    @ParameterizedTest
    @CsvSource(
        "monospace, monospace",
        "serif, serif",
        "SERIF, serif",
        "roboto, 'roboto, sans-serif'",
        "custom-font, 'roboto, sans-serif'",
        ", 'roboto, sans-serif'"
    )
    fun `M resolve font family from source spans W map()`(fontFamily: String?, expected: String) {
        val text: Spanned = mock()
        val span: CustomStyleSpan = mock()
        whenever(text.length).thenReturn(5)
        whenever(text.getSpans(0, 5, CustomStyleSpan::class.java)).thenReturn(arrayOf(span))
        whenever(span.fontFamily).thenReturn(fontFamily)
        mapper = PreparedLayoutTextViewMapper(
            layoutReader = { _, _ -> PreparedTextLayout(layout, text, 0f) },
            drawableUtils = drawableUtils,
            obfuscator = obfuscator
        )

        assertThat(mapText().textStyle.family).isEqualTo(expected)
    }

    @Test
    fun `M retain default font W map() { no style span }`() {
        assertThat(mapText().textStyle.family).isEqualTo("roboto, sans-serif")
    }

    @Test
    fun `M retain default font W map() { font accessor throws }`() {
        val text: Spanned = mock()
        val span: CustomStyleSpan = mock()
        whenever(text.length).thenReturn(5)
        whenever(text.getSpans(0, 5, CustomStyleSpan::class.java)).thenReturn(arrayOf(span))
        whenever(span.fontFamily).thenThrow(IllegalStateException("Unavailable font family"))
        mapper = PreparedLayoutTextViewMapper(
            layoutReader = { _, _ -> PreparedTextLayout(layout, text, 0f) },
            drawableUtils = drawableUtils,
            obfuscator = obfuscator
        )

        assertThat(mapText().textStyle.family).isEqualTo("roboto, sans-serif")
        assertThat(mapText().text).isEqualTo("hello")
    }

    @Test
    fun `M retain typeface fallback W map() { no style span }`() {
        whenever(paint.typeface).thenReturn(Typeface.MONOSPACE)

        assertThat(mapText().textStyle.family).isEqualTo("monospace")
    }

    @Test
    fun `M capture displayed text W map() { ellipsized layout }`() {
        whenever(layout.text).thenReturn("he\u2026")

        assertThat(mapText().text).isEqualTo("he\u2026")
    }

    @Test
    fun `M mask displayed text W map() { ellipsized layout }`() {
        whenever(layout.text).thenReturn("he\u2026")
        whenever(context.textAndInputPrivacy).thenReturn(TextAndInputPrivacy.MASK_ALL)
        whenever(obfuscator.obfuscate("he\u2026")).thenReturn("xxx")

        assertThat(mapText().text).isEqualTo("xxx")
        verify(obfuscator).obfuscate("he\u2026")
    }

    @Test
    fun `M normalize padding and layout offset W map()`() {
        whenever(view.paddingTop).thenReturn(8)
        whenever(view.paddingBottom).thenReturn(20)
        whenever(view.paddingLeft).thenReturn(10)
        whenever(view.paddingRight).thenReturn(40)
        mapper = PreparedLayoutTextViewMapper(
            layoutReader = { _, _ -> PreparedTextLayout(layout, "hello", 4f) },
            drawableUtils = drawableUtils,
            obfuscator = obfuscator
        )

        assertThat(mapText().textPosition?.padding).isEqualTo(
            MobileSegment.Padding(top = 6, bottom = 10, left = 5, right = 20)
        )
    }

    private fun mapText(): MobileSegment.Wireframe.TextWireframe {
        return mapper.map(view, context, callback, logger)
            .single() as MobileSegment.Wireframe.TextWireframe
    }
}
