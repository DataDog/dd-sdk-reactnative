/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.mappers

import android.content.res.Resources
import android.graphics.Typeface
import android.util.DisplayMetrics
import android.widget.TextView
import com.datadog.android.sessionreplay.internal.AsyncJobStatusCallback
import com.datadog.android.sessionreplay.internal.recorder.MappingContext
import com.datadog.android.sessionreplay.internal.recorder.SystemInformation
import com.datadog.android.sessionreplay.model.MobileSegment
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
import org.mockito.kotlin.spy
import org.mockito.kotlin.whenever
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
internal class ReactTextMapperTest {
    private lateinit var testedMapper: ReactTextMapper

    @Mock
    private lateinit var mockReactTextPropertiesResolver: ReactTextPropertiesResolver

    @Mock
    private lateinit var mockMappingContext: MappingContext

    @Mock
    private lateinit var mockAsyncJobStatusCallback: AsyncJobStatusCallback

    @Mock
    private lateinit var mockTextView: TextView

    @Mock
    private lateinit var mockSystemInformation: SystemInformation

    @Mock
    private lateinit var mockResources: Resources

    @Mock
    private lateinit var mockDisplayMetrics: DisplayMetrics

    @Mock
    private lateinit var mockTextWireframe: MobileSegment.Wireframe.TextWireframe

    @BeforeEach
    fun `set up`(forge: Forge) {
        whenever(mockResources.displayMetrics).thenReturn(mockDisplayMetrics)
        whenever(mockTextView.resources).thenReturn(mockResources)
        whenever(mockSystemInformation.screenDensity).thenReturn(0f)
        whenever(mockMappingContext.systemInformation).thenReturn(mockSystemInformation)
        whenever(mockTextView.text).thenReturn(forge.aString())
        whenever(mockTextView.typeface).thenReturn(Typeface.SANS_SERIF)

        whenever(
            mockReactTextPropertiesResolver.addReactNativeProperties(
                originalWireframe = eq(mockTextWireframe),
                view = eq(mockTextView),
                pixelDensity = eq(0f)
            )
        ).thenReturn(mockTextWireframe)

        testedMapper = spy(
            ReactTextMapper(
                reactTextPropertiesResolver = mockReactTextPropertiesResolver
            )
        )
    }

    @Test
    fun `M return wireframe W map() { even if not TextWireframeType }`(
        @Mock mockImageWireframe: MobileSegment.Wireframe.ImageWireframe
    ) {
        // Given
        whenever(
            testedMapper.mapOnSuperclass(
                textView = eq(mockTextView),
                mappingContext = eq(mockMappingContext),
                asyncJobStatusCallback = eq(mockAsyncJobStatusCallback)
            )
        ).thenReturn(
            listOf(mockImageWireframe)
        )

        // When
        val result = testedMapper.map(mockTextView, mockMappingContext, mockAsyncJobStatusCallback)

        // Then
        assertThat(result).contains(mockImageWireframe)
    }

    @Test
    fun `M return textWireframe W map()`() {
        // Given
        whenever(
            testedMapper.mapOnSuperclass(
                textView = eq(mockTextView),
                mappingContext = eq(mockMappingContext),
                asyncJobStatusCallback = eq(mockAsyncJobStatusCallback)
            )
        ).thenReturn(
            listOf(mockTextWireframe)
        )

        whenever(
            mockReactTextPropertiesResolver.addReactNativeProperties(
                originalWireframe = eq(mockTextWireframe),
                view = eq(mockTextView),
                pixelDensity = eq(0f)
            )
        ).thenReturn(mockTextWireframe)

        // When
        val result = testedMapper.map(
            mockTextView,
            mockMappingContext,
            mockAsyncJobStatusCallback
        )[0] as MobileSegment.Wireframe.TextWireframe

        // Then
        assertThat(result.text).isEqualTo(mockTextWireframe.text)
    }
}
