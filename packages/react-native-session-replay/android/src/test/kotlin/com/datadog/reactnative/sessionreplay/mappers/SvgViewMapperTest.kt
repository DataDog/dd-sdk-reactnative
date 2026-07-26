/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.mappers

import android.view.View
import com.datadog.android.api.InternalLogger
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.android.sessionreplay.recorder.MappingContext
import com.datadog.android.sessionreplay.recorder.SystemInformation
import com.datadog.android.sessionreplay.recorder.mapper.TraverseAllChildrenMapper
import com.datadog.android.sessionreplay.utils.AsyncJobStatusCallback
import com.datadog.reactnative.sessionreplay.ReactNativeInternalCallback
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.datadog.reactnative.sessionreplay.views.DdPrivacyView
import fr.xgouchet.elmyr.junit5.ForgeExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.whenever
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
internal class SvgViewMapperTest {

    private lateinit var testedMapper: SvgViewMapper<DdPrivacyView>

    @Mock
    private lateinit var mockDrawableUtils: DrawableUtils

    @Mock
    private lateinit var mockInternalCallback: ReactNativeInternalCallback

    @Mock
    private lateinit var mockDdPrivacyView: DdPrivacyView

    @Mock
    private lateinit var mockChildView: View

    @Mock
    private lateinit var mockMappingContext: MappingContext

    @Mock
    private lateinit var mockSystemInformation: SystemInformation

    @Mock
    private lateinit var mockAsyncJobStatusCallback: AsyncJobStatusCallback

    @Mock
    private lateinit var mockInternalLogger: InternalLogger

    @BeforeEach
    fun `set up`() {
        whenever(mockMappingContext.systemInformation).thenReturn(mockSystemInformation)
        whenever(mockSystemInformation.screenDensity).thenReturn(0f)
        whenever(mockDrawableUtils.getReactBackgroundFromDrawable(null)).thenReturn(null)

        testedMapper = SvgViewMapper(
            internalCallback = mockInternalCallback,
            drawableUtils = mockDrawableUtils
        )
    }

    @Test
    fun `M implement TraverseAllChildrenMapper W class declaration`() {
        assertThat(testedMapper).isInstanceOf(TraverseAllChildrenMapper::class.java)
    }

    @Test
    fun `M return ShapeWireframe W map() { DdPrivacyView without attributes }`() {
        // Given
        whenever(mockDdPrivacyView.attributes).thenReturn(null)

        // When
        val result = testedMapper.map(
            view = mockDdPrivacyView,
            mappingContext = mockMappingContext,
            asyncJobStatusCallback = mockAsyncJobStatusCallback,
            internalLogger = mockInternalLogger
        )

        // Then
        assertThat(result).hasSize(1)
        assertThat(result[0]).isInstanceOf(MobileSegment.Wireframe.ShapeWireframe::class.java)
    }

    @Test
    fun `M return ShapeWireframe W map() { DdPrivacyView with empty attributes map }`() {
        // Given
        whenever(mockDdPrivacyView.attributes).thenReturn(emptyMap())

        // When
        val result = testedMapper.map(
            view = mockDdPrivacyView,
            mappingContext = mockMappingContext,
            asyncJobStatusCallback = mockAsyncJobStatusCallback,
            internalLogger = mockInternalLogger
        )

        // Then
        assertThat(result).hasSize(1)
        assertThat(result[0]).isInstanceOf(MobileSegment.Wireframe.ShapeWireframe::class.java)
    }

    @Test
    fun `M return ShapeWireframe and ImageWireframe W map() { DdPrivacyView with SVG hash }`() {
        // Given
        val hash = "svg-resource-hash"
        val svgBytes = "<svg width=\"32\" height=\"32\"></svg>".toByteArray(Charsets.UTF_8)
        whenever(mockDdPrivacyView.attributes).thenReturn(
            mapOf("hash" to hash, "width" to "32", "height" to "32")
        )
        whenever(mockDdPrivacyView.getChildAt(0)).thenReturn(mockChildView)
        whenever(mockInternalCallback.getEntryData(hash)).thenReturn(svgBytes)

        // When
        val result = testedMapper.map(
            view = mockDdPrivacyView,
            mappingContext = mockMappingContext,
            asyncJobStatusCallback = mockAsyncJobStatusCallback,
            internalLogger = mockInternalLogger
        )

        // Then
        assertThat(result).hasSize(2)
        assertThat(result[0]).isInstanceOf(MobileSegment.Wireframe.ShapeWireframe::class.java)
        assertThat(result[1]).isInstanceOf(MobileSegment.Wireframe.ImageWireframe::class.java)
        val shapeWireframe = result[0] as MobileSegment.Wireframe.ShapeWireframe
        val imageWireframe = result[1] as MobileSegment.Wireframe.ImageWireframe
        assertThat(imageWireframe.resourceId).isEqualTo(hash)
        assertThat(imageWireframe.mimeType).isEqualTo("svg+xml")
        // ImageWireframe must have a distinct ID from the container and from the child view,
        // since TraverseAllChildrenMapper causes the child to be independently mapped.
        assertThat(imageWireframe.id).isNotEqualTo(shapeWireframe.id)
        assertThat(imageWireframe.id).isNotEqualTo(System.identityHashCode(mockChildView).toLong())
    }

    @Test
    fun `M return ShapeWireframe W map() { DdPrivacyView with hash but no entry data }`() {
        // Given
        val hash = "missing-entry-hash"
        whenever(mockDdPrivacyView.attributes).thenReturn(mapOf("hash" to hash))
        whenever(mockInternalCallback.getEntryData(hash)).thenReturn(null)

        // When
        val result = testedMapper.map(
            view = mockDdPrivacyView,
            mappingContext = mockMappingContext,
            asyncJobStatusCallback = mockAsyncJobStatusCallback,
            internalLogger = mockInternalLogger
        )

        // Then
        assertThat(result).hasSize(1)
        assertThat(result[0]).isInstanceOf(MobileSegment.Wireframe.ShapeWireframe::class.java)
    }

    @Test
    fun `M return ShapeWireframe W map() { DdPrivacyView with hash but no child view }`() {
        // Given
        val hash = "no-child-hash"
        val svgBytes = "<svg></svg>".toByteArray(Charsets.UTF_8)
        whenever(mockDdPrivacyView.attributes).thenReturn(mapOf("hash" to hash))
        whenever(mockInternalCallback.getEntryData(hash)).thenReturn(svgBytes)
        whenever(mockDdPrivacyView.getChildAt(0)).thenReturn(null)

        // When
        val result = testedMapper.map(
            view = mockDdPrivacyView,
            mappingContext = mockMappingContext,
            asyncJobStatusCallback = mockAsyncJobStatusCallback,
            internalLogger = mockInternalLogger
        )

        // Then
        assertThat(result).hasSize(1)
        assertThat(result[0]).isInstanceOf(MobileSegment.Wireframe.ShapeWireframe::class.java)
    }
}
