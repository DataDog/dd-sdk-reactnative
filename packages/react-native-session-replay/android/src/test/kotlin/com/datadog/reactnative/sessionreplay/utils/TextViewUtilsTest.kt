/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.utils

import android.content.res.Resources
import android.graphics.Typeface
import android.util.DisplayMetrics
import android.widget.TextView
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.android.sessionreplay.recorder.MappingContext
import com.datadog.android.sessionreplay.recorder.SystemInformation
import com.datadog.reactnative.sessionreplay.ReactTextPropertiesResolver
import fr.xgouchet.elmyr.Forge
import fr.xgouchet.elmyr.junit5.ForgeExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.eq
import org.mockito.kotlin.whenever
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
internal class TextViewUtilsTest {
    private lateinit var testedUtils: TextViewUtils

    @Mock
    private lateinit var mockReactTextPropertiesResolver: ReactTextPropertiesResolver

    @Mock
    private lateinit var mockMappingContext: MappingContext

    @Mock
    private lateinit var mockTextView: TextView

    @Mock
    private lateinit var mockSystemInformation: SystemInformation

    @Mock
    private lateinit var mockResources: Resources

    @Mock
    private lateinit var mockDisplayMetrics: DisplayMetrics

    @BeforeEach
    fun `set up`(forge: Forge) {
        whenever(mockResources.displayMetrics).thenReturn(mockDisplayMetrics)
        whenever(mockTextView.resources).thenReturn(mockResources)
        whenever(mockSystemInformation.screenDensity).thenReturn(0f)
        whenever(mockMappingContext.systemInformation).thenReturn(mockSystemInformation)
        whenever(mockTextView.text).thenReturn(forge.aString())
        whenever(mockTextView.typeface).thenReturn(Typeface.SANS_SERIF)

        testedUtils = TextViewUtils()
    }

    @Test
    fun `M return wireframe W map() { even if not TextWireframeType }`(
        @Mock mockImageWireframe: MobileSegment.Wireframe.ImageWireframe
    ) {
        // When
        val result = testedUtils.mapTextViewToWireframes(
            wireframes = listOf(mockImageWireframe),
            view = mockTextView,
            mappingContext = mockMappingContext,
            reactTextPropertiesResolver = mockReactTextPropertiesResolver
        )

        // Then
        assertThat(result).contains(mockImageWireframe)
    }

    @Test
    fun `M return textWireframe W map()`(
        @Mock mockTextWireframe: MobileSegment.Wireframe.TextWireframe
    ) {
        // Given
        whenever(
            mockReactTextPropertiesResolver.addReactNativeProperties(
                originalWireframe = eq(mockTextWireframe),
                view = eq(mockTextView),
                pixelDensity = eq(0f)
            )
        ).thenReturn(mockTextWireframe)

        // When
        val result = testedUtils.mapTextViewToWireframes(
            wireframes = listOf(mockTextWireframe),
            view = mockTextView,
            mappingContext = mockMappingContext,
            reactTextPropertiesResolver = mockReactTextPropertiesResolver
        )[0] as MobileSegment.Wireframe.TextWireframe

        // Then
        assertThat(result).isEqualTo(mockTextWireframe)
    }
}
