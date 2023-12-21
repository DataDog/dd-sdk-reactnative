/*
 *
 *  * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 *  * This product includes software developed at Datadog (https://www.datadoghq.com/).
 *  * Copyright 2016-Present Datadog, Inc.
 *
 */

package com.datadog.reactnative.sessionreplay.mappers

import android.graphics.drawable.ColorDrawable
import com.datadog.android.sessionreplay.internal.AsyncJobStatusCallback
import com.datadog.android.sessionreplay.internal.recorder.MappingContext
import com.datadog.android.sessionreplay.internal.recorder.SystemInformation
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.datadog.reactnative.sessionreplay.utils.ReactViewBackgroundDrawableUtils
import com.facebook.react.views.view.ReactViewBackgroundDrawable
import com.facebook.react.views.view.ReactViewGroup
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
internal class ReactViewGroupMapperTest {
    private lateinit var testedMapper: ReactViewGroupMapper

    @Mock
    private lateinit var mockReactViewBackgroundDrawableUtils: ReactViewBackgroundDrawableUtils

    @Mock
    private lateinit var mockReactViewGroup: ReactViewGroup

    @Mock
    private lateinit var mockMappingContext: MappingContext

    @Mock
    private lateinit var mockAsyncJobStatusCallback: AsyncJobStatusCallback

    @Mock
    private lateinit var mockSystemInformation: SystemInformation

    @Mock
    private lateinit var mockDrawableUtils: DrawableUtils

    @Mock
    private lateinit var mockReactViewBackgroundDrawable: ReactViewBackgroundDrawable

    @Mock
    private lateinit var mockShapeStyle: MobileSegment.ShapeStyle

    @Mock
    private lateinit var mockShapeBorder: MobileSegment.ShapeBorder

    @BeforeEach
    fun `set up`() {
        whenever(mockMappingContext.systemInformation).thenReturn(mockSystemInformation)
        whenever(mockSystemInformation.screenDensity).thenReturn(0f)

        testedMapper = ReactViewGroupMapper(
            reactViewBackgroundDrawableUtils = mockReactViewBackgroundDrawableUtils,
            drawableUtils = mockDrawableUtils
        )
    }

    @Test
    fun `M return null shapestyle + border W map() { other drawable }`(
        @Mock mockColorDrawable: ColorDrawable
    ) {
        // Given
        whenever(mockReactViewGroup.background).thenReturn(mockColorDrawable)
        whenever(
            mockDrawableUtils.getReactBackgroundFromDrawable(
                drawable = eq(mockColorDrawable)
            )
        ).thenReturn(null)

        // When
        val result = testedMapper.map(
            view = mockReactViewGroup,
            mappingContext = mockMappingContext,
            asyncJobStatusCallback = mockAsyncJobStatusCallback
        )[0] as MobileSegment.Wireframe.ShapeWireframe

        // Then
        assertThat(result.shapeStyle).isNull()
        assertThat(result.border).isNull()
    }

    @Test
    fun `M return shapestyle + border W map() { ReactViewBackgroundDrawable }`() {
        // Given
        whenever(mockReactViewGroup.background).thenReturn(mockReactViewBackgroundDrawable)
        whenever(
            mockDrawableUtils.getReactBackgroundFromDrawable(
                drawable = eq(mockReactViewBackgroundDrawable)
            )
        ).thenReturn(mockReactViewBackgroundDrawable)
        whenever(
            mockReactViewBackgroundDrawableUtils.resolveShapeAndBorder(
                drawable = eq(mockReactViewBackgroundDrawable),
                pixelDensity = eq(0f),
                opacity = eq(0f)
            )
        ).thenReturn(mockShapeStyle to mockShapeBorder)

        // When
        val result = testedMapper.map(
            view = mockReactViewGroup,
            mappingContext = mockMappingContext,
            asyncJobStatusCallback = mockAsyncJobStatusCallback
        )[0] as MobileSegment.Wireframe.ShapeWireframe

        // Then
        assertThat(result.shapeStyle).isEqualTo(mockShapeStyle)
        assertThat(result.border).isEqualTo(mockShapeBorder)
    }
}
