/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.utils.text

import android.content.res.Resources
import android.graphics.Typeface
import android.text.Spannable
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.util.DisplayMetrics
import android.widget.TextView
import com.datadog.android.api.InternalLogger
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.android.sessionreplay.recorder.MappingContext
import com.datadog.android.sessionreplay.recorder.SystemInformation
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.datadog.reactnative.sessionreplay.utils.formatAsRgba
import com.datadog.reactnative.sessionreplay.utils.text.TextViewUtils.Companion.MONOSPACE_FAMILY_NAME
import com.datadog.reactnative.tools.unit.forge.ForgeConfigurator
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerModule
import com.facebook.react.views.text.internal.span.CustomStyleSpan
import com.facebook.react.views.view.ReactViewBackgroundDrawable
import fr.xgouchet.elmyr.Forge
import fr.xgouchet.elmyr.annotation.Forgery
import fr.xgouchet.elmyr.annotation.IntForgery
import fr.xgouchet.elmyr.junit5.ForgeConfiguration
import fr.xgouchet.elmyr.junit5.ForgeExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.ArgumentMatchers.anyInt
import org.mockito.Mock
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.mock
import org.mockito.Mockito.spy
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.whenever
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
@ForgeConfiguration(ForgeConfigurator::class)
internal class TextViewUtilsTest {
    @Mock
    lateinit var mockReactContext: ReactContext

    @Mock
    lateinit var mockUiManagerModule: UIManagerModule

    @Mock
    lateinit var mockWireframe: MobileSegment.Wireframe.TextWireframe

    @Mock
    lateinit var mockTextView: TextView

    @Mock
    lateinit var mockReactViewBackgroundDrawable: ReactViewBackgroundDrawable

    @Mock
    lateinit var mockDrawableUtils: DrawableUtils

    @Forgery
    private lateinit var fakeWireframe: MobileSegment.Wireframe.TextWireframe

    @Mock
    private lateinit var mockLogger: InternalLogger

    @Mock
    private lateinit var mockMappingContext: MappingContext

    @Mock
    private lateinit var mockSystemInformation: SystemInformation

    @Mock
    private lateinit var mockResources: Resources

    @Mock
    private lateinit var mockDisplayMetrics: DisplayMetrics

    @Mock
    private lateinit var testedUtils: LegacyTextViewUtils

    @Mock
    private lateinit var fabricTestedUtils: FabricTextViewUtils

    @BeforeEach
    fun `set up`(forge: Forge) {
        whenever(mockResources.displayMetrics).thenReturn(mockDisplayMetrics)
        whenever(mockTextView.resources).thenReturn(mockResources)
        whenever(mockSystemInformation.screenDensity).thenReturn(0f)
        whenever(mockMappingContext.systemInformation).thenReturn(mockSystemInformation)
        whenever(mockTextView.text).thenReturn(forge.aString())
        // Typeface static constants (SANS_SERIF, MONOSPACE, SERIF) are all null in the JVM test
        // environment (Android framework statics are not initialised). Use a non-null Mockito mock
        // for the default typeface so it falls through to the "else → roboto/sans-serif" branch.
        whenever(mockTextView.typeface).thenReturn(mock(Typeface::class.java))
        whenever(mockTextView.currentTextColor).thenReturn(0xFF000000.toInt())
        whenever(mockTextView.textSize).thenReturn(16f)

        whenever(mockReactContext.hasActiveReactInstance()).thenReturn(true)

        val realUtils =
            LegacyTextViewUtils(
                mockReactContext,
                mockLogger,
                mockDrawableUtils
            )

        val realFabricUtils =
            FabricTextViewUtils(
                mockReactContext,
                mockLogger,
                mockDrawableUtils
            )

        testedUtils = spy(realUtils)
        fabricTestedUtils = spy(realFabricUtils)
    }

    @Test
    fun `M return wireframe W map() { even if not TextWireframeType }`(
        @Mock mockImageWireframe: MobileSegment.Wireframe.ImageWireframe
    ) {
        // When
        val result =
            testedUtils.mapTextViewToWireframes(
                wireframes = listOf(mockImageWireframe),
                view = mockTextView,
                mappingContext = mockMappingContext
            )

        // Then
        assertThat(result).contains(mockImageWireframe)
    }

    @Test
    fun `M return textWireframe W map()`(
        @Mock mockTextWireframe: MobileSegment.Wireframe.TextWireframe
    ) {
        // Given
        doReturn(mockTextWireframe)
            .whenever(testedUtils)
            .addReactNativeProperties(
                originalWireframe = eq(mockTextWireframe),
                view = eq(mockTextView),
                pixelDensity = eq(0f)
            )

        // When
        val result =
            testedUtils.mapTextViewToWireframes(
                wireframes = listOf(mockTextWireframe),
                view = mockTextView,
                mappingContext = mockMappingContext
            )[0] as MobileSegment.Wireframe.TextWireframe

        // Then
        assertThat(result).isEqualTo(mockTextWireframe)
    }

    // region addReactNativeProperties

    @Test
    fun `M resolve text style from view W addReactNativeProperties() { no background drawable }`() {
        // Given
        whenever(mockTextView.background).thenReturn(null)
        whenever(mockTextView.currentTextColor).thenReturn(0xFF000000.toInt())
        whenever(mockTextView.textSize).thenReturn(16f)
        // Use a non-null Typeface mock so it falls to the default "roboto, sans-serif" branch.
        // (Typeface.SANS_SERIF is null on JVM, same as MONOSPACE, which would match the wrong branch.)
        whenever(mockTextView.typeface).thenReturn(mock(Typeface::class.java))

        // When
        val result = testedUtils.addReactNativeProperties(fakeWireframe, mockTextView, 1f)

        // Then — text properties are always resolved directly from the view
        assertThat(result.textStyle.color).isEqualTo(formatAsRgba(0xFF000000.toInt()))
        assertThat(result.textStyle.size).isEqualTo(16L)
        assertThat(result.textStyle.family).isEqualTo("roboto, sans-serif")
    }

    @Test
    fun `M add drawable properties W addReactNativeProperties() { has reactBackgroundDrawable }`
    (forge: Forge) {
        // Given
        val pixelDensity = 0f
        val fakeBorderRadius = forge.aPositiveFloat()
        val fakeBorderWidth = forge.aPositiveFloat()
        val fakeBorderColor = forge.aPositiveInt()
        whenever(mockTextView.background).thenReturn(mockReactViewBackgroundDrawable)
        whenever(
            mockDrawableUtils.getReactBackgroundFromDrawable(
                eq(mockTextView.background)
            )
        ).thenReturn(mockReactViewBackgroundDrawable)
        whenever(
            mockDrawableUtils.resolveShapeAndBorder(
                drawable = eq(mockReactViewBackgroundDrawable),
                opacity = eq(0f),
                pixelDensity = eq(0f)
            )
        ).thenReturn(
            MobileSegment.ShapeStyle(
                backgroundColor = formatAsRgba(fakeBorderColor),
                opacity = 0f,
                cornerRadius = fakeBorderRadius.toLong()
            ) to
                MobileSegment.ShapeBorder(
                    color = formatAsRgba(fakeBorderColor),
                    width = fakeBorderWidth.toLong()
                )
        )

        // When
        val result =
            testedUtils.addReactNativeProperties(
                fakeWireframe,
                mockTextView,
                pixelDensity
            )

        // Then
        assertThat(result.shapeStyle?.cornerRadius).isEqualTo(fakeBorderRadius.toLong())
        assertThat(result.border?.width).isEqualTo(fakeBorderWidth.toLong())
        assertThat(result.border?.color).isEqualTo(formatAsRgba(fakeBorderColor))
    }

    @Test
    fun `M resolve monospace font family W addReactNativeProperties() { typeface fallback }`() {
        // Given — non-RN fallback path: no CustomStyleSpan in text (plain String), typeface comparison used.
        // In the JVM test environment Typeface.MONOSPACE is null, so view.typeface == null matches
        // the MONOSPACE branch via null == null comparison.
        whenever(mockTextView.background).thenReturn(null)
        whenever(mockTextView.typeface).thenReturn(Typeface.MONOSPACE)
        // @BeforeEach sets view.text to a plain String (not Spanned) → resolveFontFamilyFromSpans returns null

        // When
        val result = testedUtils.addReactNativeProperties(fakeWireframe, mockTextView, 0f)

        // Then
        assertThat(result.textStyle.family).isEqualTo(MONOSPACE_FAMILY_NAME)
    }

    @Test
    fun `M resolve monospace font family W addReactNativeProperties() { CustomStyleSpan }`() {
        // Given — primary path: RN old arch stores font family in CustomStyleSpan on the Spanned
        // text. view.typeface is always DEFAULT because RN never calls setTypeface().
        val mockSpanned = mock(Spanned::class.java)
        val mockCustomStyleSpan = mock(CustomStyleSpan::class.java)
        whenever(mockCustomStyleSpan.fontFamily).thenReturn("monospace")
        whenever(mockTextView.background).thenReturn(null)
        whenever(mockTextView.text).thenReturn(mockSpanned)
        whenever(mockSpanned.length).thenReturn(10)
        whenever(
            mockSpanned.getSpans(anyInt(), anyInt(), eq(ForegroundColorSpan::class.java))
        ).thenReturn(emptyArray())
        whenever(
            mockSpanned.getSpans(anyInt(), anyInt(), eq(CustomStyleSpan::class.java))
        ).thenReturn(arrayOf(mockCustomStyleSpan))

        // When
        val result = testedUtils.addReactNativeProperties(fakeWireframe, mockTextView, 0f)

        // Then
        assertThat(result.textStyle.family).isEqualTo(MONOSPACE_FAMILY_NAME)
    }

    @Test
    fun `M resolve serif font family W addReactNativeProperties() { CustomStyleSpan }`() {
        // Given
        val mockSpanned = mock(Spanned::class.java)
        val mockCustomStyleSpan = mock(CustomStyleSpan::class.java)
        whenever(mockCustomStyleSpan.fontFamily).thenReturn("serif")
        whenever(mockTextView.background).thenReturn(null)
        whenever(mockTextView.text).thenReturn(mockSpanned)
        whenever(mockSpanned.length).thenReturn(10)
        whenever(
            mockSpanned.getSpans(anyInt(), anyInt(), eq(ForegroundColorSpan::class.java))
        ).thenReturn(emptyArray())
        whenever(
            mockSpanned.getSpans(anyInt(), anyInt(), eq(CustomStyleSpan::class.java))
        ).thenReturn(arrayOf(mockCustomStyleSpan))

        // When
        val result = testedUtils.addReactNativeProperties(fakeWireframe, mockTextView, 0f)

        // Then
        assertThat(result.textStyle.family).isEqualTo("serif")
    }

    @Test
    fun `M fall back to sans-serif W addReactNativeProperties() { null fontFamily span }`() {
        // Given — CustomStyleSpan present but fontFamily is null: resolveFontFamilyFromSpans
        // returns null, falls through to typeface check → default → "roboto, sans-serif"
        val mockSpanned = mock(Spanned::class.java)
        val mockCustomStyleSpan = mock(CustomStyleSpan::class.java)
        whenever(mockCustomStyleSpan.fontFamily).thenReturn(null)
        whenever(mockTextView.background).thenReturn(null)
        whenever(mockTextView.text).thenReturn(mockSpanned)
        whenever(mockSpanned.length).thenReturn(10)
        whenever(mockTextView.typeface).thenReturn(mock(Typeface::class.java))
        whenever(
            mockSpanned.getSpans(anyInt(), anyInt(), eq(ForegroundColorSpan::class.java))
        ).thenReturn(emptyArray())
        whenever(
            mockSpanned.getSpans(anyInt(), anyInt(), eq(CustomStyleSpan::class.java))
        ).thenReturn(arrayOf(mockCustomStyleSpan))

        // When
        val result = testedUtils.addReactNativeProperties(fakeWireframe, mockTextView, 0f)

        // Then
        assertThat(result.textStyle.family).isEqualTo("roboto, sans-serif")
    }

    @Test
    fun `M resolve sans-serif font family W addReactNativeProperties() { default typeface }`() {
        // Given
        whenever(mockTextView.background).thenReturn(null)
        // Use a non-null Typeface mock (SANS_SERIF is null on JVM; MONOSPACE is also null, so
        // comparing null==null would incorrectly match the MONOSPACE branch).
        whenever(mockTextView.typeface).thenReturn(mock(Typeface::class.java))

        // When
        val result = testedUtils.addReactNativeProperties(fakeWireframe, mockTextView, 0f)

        // Then
        assertThat(result.textStyle.family).isEqualTo("roboto, sans-serif")
    }

    @Test
    fun `M resolve font size from view W addReactNativeProperties()`(
        @IntForgery(min = 10, max = 100) fakeTextSizePx: Int
    ) {
        // Given
        whenever(mockTextView.background).thenReturn(null)
        whenever(mockTextView.textSize).thenReturn(fakeTextSizePx.toFloat())

        // When — pixelDensity = 1f so size should equal fakeTextSizePx
        val result = testedUtils.addReactNativeProperties(fakeWireframe, mockTextView, 1f)

        // Then
        assertThat(result.textStyle.size).isEqualTo(fakeTextSizePx.toLong())
    }

    @Test
    fun `M resolve color from ForegroundColorSpan W addReactNativeProperties() { Spanned }`(
        @IntForgery fakeSpanColor: Int
    ) {
        // Given — RN old arch stores text as SpannedString (implements Spanned, not Spannable).
        // Color is encoded as a ForegroundColorSpan; it is NOT set via TextView.setTextColor().
        whenever(mockTextView.background).thenReturn(null)
        val spanned = mock(Spanned::class.java)
        val colorSpan = mock(ForegroundColorSpan::class.java)
        whenever(colorSpan.foregroundColor).thenReturn(fakeSpanColor)
        whenever(mockTextView.text).thenReturn(spanned)
        whenever(spanned.length).thenReturn(10)
        whenever(
            spanned.getSpans(anyInt(), anyInt(), eq(ForegroundColorSpan::class.java))
        ).thenReturn(arrayOf(colorSpan))

        // When
        val result = testedUtils.addReactNativeProperties(fakeWireframe, mockTextView, 0f)

        // Then — color must come from the span, not from currentTextColor
        assertThat(result.textStyle.color).isEqualTo(formatAsRgba(fakeSpanColor))
    }

    @Test
    fun `M fall back to currentTextColor W addReactNativeProperties() { no color span }`(
        @IntForgery fakeTextColor: Int
    ) {
        // Given — plain String text (not Spanned): no span → fallback to currentTextColor
        whenever(mockTextView.background).thenReturn(null)
        whenever(mockTextView.currentTextColor).thenReturn(fakeTextColor)
        // mockTextView.text already returns a plain String from the @BeforeEach setup

        // When
        val result = testedUtils.addReactNativeProperties(fakeWireframe, mockTextView, 0f)

        // Then
        assertThat(result.textStyle.color).isEqualTo(formatAsRgba(fakeTextColor))
    }

    @Test
    fun `M return original wireframe W addReactNativeProperties() { no valid react context }`() {
        // Given
        whenever(mockReactContext.hasActiveReactInstance()).thenReturn(false)

        // When
        val result = testedUtils.addReactNativeProperties(fakeWireframe, mockTextView, 0f)

        // Then
        assertThat(result).isEqualTo(fakeWireframe)
    }

    @Test
    fun `M return fabric textStyle (color) W addReactNativeProperties`() {
        val mockForegroundColorSpan = mock(ForegroundColorSpan::class.java)
        whenever(mockForegroundColorSpan.foregroundColor).thenReturn(-1)

        val spannable = mock(Spannable::class.java)
        doReturn(spannable).whenever(fabricTestedUtils).getFieldFromView(any(), any())

        whenever(spannable.getSpans(anyInt(), anyInt(), eq(ForegroundColorSpan::class.java)))
            .thenReturn(
                arrayOf(mockForegroundColorSpan)
            )

        val result = fabricTestedUtils.addReactNativeProperties(fakeWireframe, mockTextView, 0f)
        assertThat(result.textStyle.color).isEqualTo("#ffffffff")
    }

    // endregion

    // region getUiManagerModule
    @Test
    fun `M return null W getUiManagerModule() { cannot get uiManagerModule }`() {
        // Given
        whenever(mockReactContext.getNativeModule(any<Class<NativeModule>>()))
            .thenThrow(IllegalStateException())

        // When
        val uiManagerModule = testedUtils.getUiManagerModule()

        // Then
        assertThat(uiManagerModule).isNull()
    }

    // endregion
}
