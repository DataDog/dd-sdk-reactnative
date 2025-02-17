/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.utils.text

import android.content.res.Resources
import android.graphics.Typeface
import android.text.Spannable
import android.text.style.ForegroundColorSpan
import android.util.DisplayMetrics
import android.widget.TextView
import com.datadog.android.api.InternalLogger
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.android.sessionreplay.recorder.MappingContext
import com.datadog.android.sessionreplay.recorder.SystemInformation
import com.datadog.reactnative.sessionreplay.ShadowNodeWrapper
import com.datadog.reactnative.sessionreplay.ShadowNodeWrapper.Companion.UI_IMPLEMENTATION_FIELD_NAME
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.datadog.reactnative.sessionreplay.utils.ReflectionUtils
import com.datadog.reactnative.sessionreplay.utils.formatAsRgba
import com.datadog.reactnative.sessionreplay.utils.text.TextViewUtils.Companion.COLOR_FIELD_NAME
import com.datadog.reactnative.sessionreplay.utils.text.TextViewUtils.Companion.FONT_FAMILY_FIELD_NAME
import com.datadog.reactnative.sessionreplay.utils.text.TextViewUtils.Companion.IS_COLOR_SET_FIELD_NAME
import com.datadog.reactnative.sessionreplay.utils.text.TextViewUtils.Companion.MONOSPACE_FAMILY_NAME
import com.datadog.reactnative.sessionreplay.utils.text.TextViewUtils.Companion.TEXT_ATTRIBUTES_FIELD_NAME
import com.datadog.reactnative.tools.unit.forge.ForgeConfigurator
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.ReactShadowNode
import com.facebook.react.uimanager.UIImplementation
import com.facebook.react.uimanager.UIManagerModule
import com.facebook.react.views.text.TextAttributes
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

    @Mock
    lateinit var mockShadowNodeWrapper: ShadowNodeWrapper

    @Mock
    lateinit var mockReflectionUtils: ReflectionUtils

    @Forgery
    private lateinit var fakeWireframe: MobileSegment.Wireframe.TextWireframe

    @Mock
    private lateinit var mockUiImplementation: UIImplementation

    @Mock
    private lateinit var mockShadowNode: ReactShadowNode<out ReactShadowNode<*>>

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
        whenever(mockTextView.typeface).thenReturn(Typeface.SANS_SERIF)

        whenever(mockReactContext.getNativeModule(UIManagerModule::class.java))
            .thenReturn(mockUiManagerModule)

        whenever(
            mockReflectionUtils.getDeclaredField(
                eq(mockUiManagerModule),
                eq(UI_IMPLEMENTATION_FIELD_NAME)
            )
        ).thenReturn(mockUiImplementation)

        whenever(
            mockUiImplementation.resolveShadowNode(
                eq(mockTextView.id)
            )
        ).thenReturn(mockShadowNode)

        whenever(mockReactContext.runOnNativeModulesQueueThread(any())).thenAnswer {
            (it.arguments[0] as Runnable).run()
        }
        whenever(mockReactContext.hasActiveReactInstance()).thenReturn(true)

        val realUtils =
            LegacyTextViewUtils(
                mockReactContext,
                mockLogger,
                mockReflectionUtils,
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
    fun `M get original wireframe W addReactNativeProperties() { no react properties }`() {
        // Given
        whenever(mockTextView.background).thenReturn(null)
        whenever(mockUiImplementation.resolveShadowNode(any())).thenReturn(null)

        // When
        val result = testedUtils.addReactNativeProperties(mockWireframe, mockTextView, 0f)

        // Then
        assertThat(result).isEqualTo(mockWireframe)
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
    fun `M resolve font family W addReactNativeProperties()`() {
        // Given
        whenever(mockReflectionUtils.getDeclaredField(mockShadowNode, FONT_FAMILY_FIELD_NAME))
            .thenReturn(MONOSPACE_FAMILY_NAME)

        whenever(mockTextView.background).thenReturn(null)

        // When
        val result =
            testedUtils
                .addReactNativeProperties(fakeWireframe, mockTextView, 0f)

        // Then
        assertThat(result.textStyle.family)
            .isEqualTo(MONOSPACE_FAMILY_NAME)
    }

    @Test
    fun `M fallback W addReactNativeProperties() { cannot resolve fontFamily }`() {
        // Given
        whenever(mockTextView.background).thenReturn(null)
        whenever(mockShadowNodeWrapper.getDeclaredShadowNodeField(FONT_FAMILY_FIELD_NAME))
            .thenReturn(null)

        // When
        val result = testedUtils.addReactNativeProperties(fakeWireframe, mockTextView, 0f)

        // Then
        assertThat(result.textStyle.family).isEqualTo(fakeWireframe.textStyle.family)
    }

    @Test
    fun `M resolve font size W addReactNativeProperties()`(
        @Mock mockTextAttributes: TextAttributes,
        @IntForgery fakeTextSize: Int
    ) {
        // Given
        whenever(mockReflectionUtils.getDeclaredField(mockShadowNode, TEXT_ATTRIBUTES_FIELD_NAME))
            .thenReturn(mockTextAttributes)
        whenever(mockTextView.background).thenReturn(null)
        whenever(mockTextAttributes.effectiveFontSize).thenReturn(fakeTextSize)

        // When
        val result = testedUtils.addReactNativeProperties(fakeWireframe, mockTextView, 0f)

        // Then
        assertThat(result.textStyle.size).isEqualTo(fakeTextSize.toLong())
    }

    @Test
    fun `M fallback W addReactNativeProperties() { cannot resolve fontSize }`(
        @Mock mockTextAttributes: TextAttributes
    ) {
        // Given
        whenever(mockTextView.background).thenReturn(null)
        whenever(mockShadowNodeWrapper.getDeclaredShadowNodeField(TEXT_ATTRIBUTES_FIELD_NAME))
            .thenReturn(null)

        // When
        val result = testedUtils.addReactNativeProperties(fakeWireframe, mockTextView, 0f)

        // Then
        assertThat(result.textStyle.size).isEqualTo(fakeWireframe.textStyle.size)
    }

    @Test
    fun `M resolve font color W addReactNativeProperties() { color is defined by developer }`(
        @IntForgery fakeTextColor: Int
    ) {
        // Given
        whenever(mockTextView.background).thenReturn(null)
        whenever(mockReflectionUtils.getDeclaredField(mockShadowNode, IS_COLOR_SET_FIELD_NAME))
            .thenReturn(true)
        whenever(mockReflectionUtils.getDeclaredField(mockShadowNode, COLOR_FIELD_NAME))
            .thenReturn(fakeTextColor)

        // When
        val result = testedUtils.addReactNativeProperties(fakeWireframe, mockTextView, 0f)

        // Then
        assertThat(result.textStyle.color).isEqualTo(formatAsRgba(fakeTextColor))
    }

    @Test
    fun `M resolve font color W addReactNativeProperties() { color is not defined by developer }`(
        @IntForgery fakeTextColor: Int
    ) {
        // Given
        whenever(mockTextView.background).thenReturn(null)
        whenever(mockReflectionUtils.getDeclaredField(mockShadowNode, IS_COLOR_SET_FIELD_NAME))
            .thenReturn(false)
        whenever(mockReflectionUtils.getDeclaredField(mockShadowNode, COLOR_FIELD_NAME))
            .thenReturn(fakeTextColor)

        // When
        val result = testedUtils.addReactNativeProperties(fakeWireframe, mockTextView, 0f)

        // Then
        assertThat(result.textStyle.color).isEqualTo("#000000FF")
    }

    @Test
    fun `M fallback W addReactNativeProperties() { cannot resolve fontColor }`() {
        // Given
        whenever(mockTextView.background).thenReturn(null)
        whenever(mockReflectionUtils.getDeclaredField(mockShadowNode, IS_COLOR_SET_FIELD_NAME))
            .thenReturn(true)
        whenever(mockShadowNodeWrapper.getDeclaredShadowNodeField(COLOR_FIELD_NAME))
            .thenReturn(null)

        // When
        val result = testedUtils.addReactNativeProperties(fakeWireframe, mockTextView, 0f)

        // Then
        assertThat(result.textStyle.color).isEqualTo(fakeWireframe.textStyle.color)
    }

    @Test
    fun `M return legacy textStyle W addReactNativeProperties() { no valid react context }`() {
        // Given
        whenever(mockReactContext.hasActiveReactInstance()).thenReturn(false)
        whenever(mockReflectionUtils.getDeclaredField(mockShadowNode, FONT_FAMILY_FIELD_NAME))
            .thenReturn(MONOSPACE_FAMILY_NAME)

        // When
        val result = testedUtils.addReactNativeProperties(fakeWireframe, mockTextView, 0f)

        // Then
        assertThat(result.textStyle.family).isNotEqualTo(MONOSPACE_FAMILY_NAME)
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
