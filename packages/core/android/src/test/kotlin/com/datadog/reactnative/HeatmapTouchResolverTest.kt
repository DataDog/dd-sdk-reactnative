/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.res.Resources
import android.util.DisplayMetrics
import android.view.View
import android.view.ViewGroup
import com.datadog.tools.unit.forge.BaseConfigurator
import fr.xgouchet.elmyr.annotation.DoubleForgery
import fr.xgouchet.elmyr.annotation.IntForgery
import fr.xgouchet.elmyr.annotation.StringForgery
import fr.xgouchet.elmyr.junit5.ForgeConfiguration
import fr.xgouchet.elmyr.junit5.ForgeExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.any
import org.mockito.kotlin.doReturn
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
@ForgeConfiguration(BaseConfigurator::class)
internal class HeatmapTouchResolverTest {

    // region findTapTargetView

    @Test
    fun `M return data with view dimensions W resolve TAP and view is clickable and visible`(
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 300.0) fakeX: Double,
        @DoubleForgery(0.0, 300.0) fakeY: Double,
        @StringForgery fakeViewUrl: String
    ) {
        // Given
        val mockView = mock<View>()
        val mockResources = mock<Resources>()
        val fakeDisplayMetrics = DisplayMetrics().apply { density = 2.0f }
        whenever(mockView.isClickable) doReturn true
        whenever(mockView.visibility) doReturn View.VISIBLE
        whenever(mockView.id) doReturn View.NO_ID
        whenever(mockView.parent) doReturn null
        whenever(mockView.width) doReturn 120
        whenever(mockView.height) doReturn 60
        whenever(mockView.resources) doReturn mockResources
        whenever(mockResources.displayMetrics) doReturn fakeDisplayMetrics

        val resolver = HeatmapTouchResolver(viewResolver = { mockView })

        // When
        val result = resolver.resolveHeatmapActionData(
            fakeReactTag,
            fakeX.toLong(),
            fakeY.toLong(),
            fakeViewUrl
        )

        // Then
        assertThat(result).isNotNull()
        assertThat(result!!.targetWidth).isEqualTo(60L) // 120 / 2.0
        assertThat(result.targetHeight).isEqualTo(30L) // 60 / 2.0
        assertThat(result.positionX).isEqualTo(fakeX.toLong())
        assertThat(result.positionY).isEqualTo(fakeY.toLong())
        assertThat(result.viewUrl).isEqualTo(fakeViewUrl)
    }

    @Test
    fun `M return data with parent dimensions W resolve TAP view not clickable but parent is`(
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 100.0) fakeX: Double,
        @DoubleForgery(0.0, 100.0) fakeY: Double,
        @StringForgery fakeViewUrl: String
    ) {
        // Given
        val mockParent = mock<ViewGroup>()
        val mockParentResources = mock<Resources>()
        val fakeDisplayMetrics = DisplayMetrics().apply { density = 2.0f }
        whenever(mockParent.isClickable) doReturn true
        whenever(mockParent.visibility) doReturn View.VISIBLE
        whenever(mockParent.id) doReturn View.NO_ID
        whenever(mockParent.parent) doReturn null
        whenever(mockParent.width) doReturn 200
        whenever(mockParent.height) doReturn 80
        whenever(mockParent.resources) doReturn mockParentResources
        whenever(mockParentResources.displayMetrics) doReturn fakeDisplayMetrics

        val mockView = mock<View>()
        whenever(mockView.isClickable) doReturn false
        whenever(mockView.parent) doReturn mockParent

        val resolver = HeatmapTouchResolver(viewResolver = { mockView })

        // When
        val result = resolver.resolveHeatmapActionData(
            fakeReactTag,
            fakeX.toLong(),
            fakeY.toLong(),
            fakeViewUrl
        )

        // Then
        assertThat(result).isNotNull()
        assertThat(result!!.targetWidth).isEqualTo(100L) // 200 / 2.0
        assertThat(result.targetHeight).isEqualTo(40L) // 80 / 2.0
    }

    @Test
    fun `M return data with parent dimensions W resolve TAP view clickable but not visible`(
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 100.0) fakeX: Double,
        @DoubleForgery(0.0, 100.0) fakeY: Double,
        @StringForgery fakeViewUrl: String
    ) {
        // Given
        val mockParent = mock<ViewGroup>()
        val mockParentResources = mock<Resources>()
        val fakeDisplayMetrics = DisplayMetrics().apply { density = 2.0f }
        whenever(mockParent.isClickable) doReturn true
        whenever(mockParent.visibility) doReturn View.VISIBLE
        whenever(mockParent.id) doReturn View.NO_ID
        whenever(mockParent.parent) doReturn null
        whenever(mockParent.width) doReturn 160
        whenever(mockParent.height) doReturn 40
        whenever(mockParent.resources) doReturn mockParentResources
        whenever(mockParentResources.displayMetrics) doReturn fakeDisplayMetrics

        val mockView = mock<View>()
        whenever(mockView.isClickable) doReturn true
        whenever(mockView.visibility) doReturn View.INVISIBLE
        whenever(mockView.parent) doReturn mockParent

        val resolver = HeatmapTouchResolver(viewResolver = { mockView })

        // When
        val result = resolver.resolveHeatmapActionData(
            fakeReactTag,
            fakeX.toLong(),
            fakeY.toLong(),
            fakeViewUrl
        )

        // Then
        assertThat(result).isNotNull()
        assertThat(result!!.targetWidth).isEqualTo(80L) // 160 / 2.0
        assertThat(result.targetHeight).isEqualTo(20L) // 40 / 2.0
    }

    @Test
    fun `M return null W resolve TAP and view resolved but no clickable ancestor`(
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 100.0) fakeX: Double,
        @DoubleForgery(0.0, 100.0) fakeY: Double,
        @StringForgery fakeViewUrl: String
    ) {
        // Given
        val mockView = mock<View>()
        whenever(mockView.isClickable) doReturn false
        whenever(mockView.visibility) doReturn View.VISIBLE
        whenever(mockView.parent) doReturn null

        val resolver = HeatmapTouchResolver(viewResolver = { mockView })

        // When
        val result = resolver.resolveHeatmapActionData(
            fakeReactTag,
            fakeX.toLong(),
            fakeY.toLong(),
            fakeViewUrl
        )

        // Then
        assertThat(result).isNull()
    }

    @Test
    fun `M return null W resolve and viewResolver returns null`(
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 100.0) fakeX: Double,
        @DoubleForgery(0.0, 100.0) fakeY: Double,
        @StringForgery fakeViewUrl: String
    ) {
        val resolver = HeatmapTouchResolver(viewResolver = { null })

        val result = resolver.resolveHeatmapActionData(
            fakeReactTag,
            fakeX.toLong(),
            fakeY.toLong(),
            fakeViewUrl
        )

        assertThat(result).isNull()
    }

    @Test
    fun `M return null and report telemetry W resolve and view traversal throws`(
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 100.0) fakeX: Double,
        @DoubleForgery(0.0, 100.0) fakeY: Double,
        @StringForgery fakeViewUrl: String
    ) {
        // Given
        val mockView = mock<View>()
        val fakeException = RuntimeException("unexpected")
        val mockTelemetry = mock<DdTelemetry>()
        whenever(mockView.isClickable).thenThrow(fakeException)

        val resolver = HeatmapTouchResolver(viewResolver = { mockView }, telemetry = mockTelemetry)

        // When
        val result = resolver.resolveHeatmapActionData(
            fakeReactTag,
            fakeX.toLong(),
            fakeY.toLong(),
            fakeViewUrl
        )

        // Then
        assertThat(result).isNull()
        verify(mockTelemetry).telemetryError(any(), eq(fakeException))
    }

    @Test
    fun `M use default density W resolve and view has no resources`(
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 100.0) fakeX: Double,
        @DoubleForgery(0.0, 100.0) fakeY: Double,
        @StringForgery fakeViewUrl: String
    ) {
        // Given
        val mockView = mock<View>()
        whenever(mockView.isClickable) doReturn true
        whenever(mockView.visibility) doReturn View.VISIBLE
        whenever(mockView.id) doReturn View.NO_ID
        whenever(mockView.parent) doReturn null
        whenever(mockView.width) doReturn 100
        whenever(mockView.height) doReturn 50
        whenever(mockView.resources) doReturn null

        val resolver = HeatmapTouchResolver(viewResolver = { mockView })

        // When
        val result = resolver.resolveHeatmapActionData(
            fakeReactTag,
            fakeX.toLong(),
            fakeY.toLong(),
            fakeViewUrl
        )

        // Then
        assertThat(result).isNotNull()
        assertThat(result!!.targetWidth).isEqualTo(100L)
        assertThat(result.targetHeight).isEqualTo(50L)
    }

    @Test
    fun `M return null dimensions W resolve and view has zero width and height`(
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 100.0) fakeX: Double,
        @DoubleForgery(0.0, 100.0) fakeY: Double,
        @StringForgery fakeViewUrl: String
    ) {
        // Given
        val mockView = mock<View>()
        val mockResources = mock<Resources>()
        val fakeDisplayMetrics = DisplayMetrics().apply { density = 1.0f }
        whenever(mockView.isClickable) doReturn true
        whenever(mockView.visibility) doReturn View.VISIBLE
        whenever(mockView.id) doReturn View.NO_ID
        whenever(mockView.parent) doReturn null
        whenever(mockView.width) doReturn 0
        whenever(mockView.height) doReturn 0
        whenever(mockView.resources) doReturn mockResources
        whenever(mockResources.displayMetrics) doReturn fakeDisplayMetrics

        val resolver = HeatmapTouchResolver(viewResolver = { mockView })

        // When
        val result = resolver.resolveHeatmapActionData(
            fakeReactTag,
            fakeX.toLong(),
            fakeY.toLong(),
            fakeViewUrl
        )

        // Then
        assertThat(result).isNotNull()
        assertThat(result!!.targetWidth).isNull()
        assertThat(result.targetHeight).isNull()
    }

    // endregion

    // region buildElementPath / pathComponentFor / computeTypeIndex

    @Test
    fun `M elementPath is root-first W view inside parent`(
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 100.0) fakeX: Double,
        @DoubleForgery(0.0, 100.0) fakeY: Double,
        @StringForgery fakeViewUrl: String
    ) {
        // Given
        val fakeParentResourceId = 1
        val fakeParentResourceName = "com.example:id/parent_view"
        val fakeViewResourceId = 2
        val fakeViewResourceName = "com.example:id/child_view"

        val mockParent = mock<ViewGroup>()
        val mockParentResources = mock<Resources>()
        val fakeDisplayMetrics = DisplayMetrics().apply { density = 1.0f }
        whenever(mockParent.id) doReturn fakeParentResourceId
        whenever(mockParent.parent) doReturn null
        whenever(mockParent.isClickable) doReturn false
        whenever(mockParent.resources) doReturn mockParentResources
        whenever(mockParentResources.displayMetrics) doReturn fakeDisplayMetrics
        whenever(
            mockParentResources.getResourceName(fakeParentResourceId)
        ) doReturn fakeParentResourceName

        val mockView = mock<View>()
        val mockResources = mock<Resources>()
        whenever(mockView.isClickable) doReturn true
        whenever(mockView.visibility) doReturn View.VISIBLE
        whenever(mockView.id) doReturn fakeViewResourceId
        whenever(mockView.parent) doReturn mockParent
        whenever(mockView.width) doReturn 100
        whenever(mockView.height) doReturn 50
        whenever(mockView.resources) doReturn mockResources
        whenever(mockResources.displayMetrics) doReturn fakeDisplayMetrics
        whenever(mockResources.getResourceName(fakeViewResourceId)) doReturn fakeViewResourceName

        val resolver = HeatmapTouchResolver(viewResolver = { mockView })

        // When
        val result = resolver.resolveHeatmapActionData(
            fakeReactTag,
            fakeX.toLong(),
            fakeY.toLong(),
            fakeViewUrl
        )

        // Then
        assertThat(result).isNotNull()
        assertThat(result!!.elementPath).containsExactly(
            "$fakeParentResourceName#0",
            "$fakeViewResourceName#0"
        )
    }

    @Test
    fun `M elementPath uses resource name W view has valid resource id`(
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 100.0) fakeX: Double,
        @DoubleForgery(0.0, 100.0) fakeY: Double,
        @StringForgery fakeViewUrl: String
    ) {
        // Given
        val fakeResourceId = 42
        val fakeResourceName = "com.example:id/my_button"
        val mockView = mock<View>()
        val mockResources = mock<Resources>()
        val fakeDisplayMetrics = DisplayMetrics().apply { density = 1.0f }
        whenever(mockView.isClickable) doReturn true
        whenever(mockView.visibility) doReturn View.VISIBLE
        whenever(mockView.id) doReturn fakeResourceId
        whenever(mockView.parent) doReturn null
        whenever(mockView.width) doReturn 100
        whenever(mockView.height) doReturn 50
        whenever(mockView.resources) doReturn mockResources
        whenever(mockResources.displayMetrics) doReturn fakeDisplayMetrics
        whenever(mockResources.getResourceName(fakeResourceId)) doReturn fakeResourceName

        val resolver = HeatmapTouchResolver(viewResolver = { mockView })

        // When
        val result = resolver.resolveHeatmapActionData(
            fakeReactTag,
            fakeX.toLong(),
            fakeY.toLong(),
            fakeViewUrl
        )

        // Then
        assertThat(result).isNotNull()
        assertThat(result!!.elementPath.last()).isEqualTo("$fakeResourceName#0")
    }

    @Test
    fun `M elementPath uses cls prefix W view has NO_ID`(
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 100.0) fakeX: Double,
        @DoubleForgery(0.0, 100.0) fakeY: Double,
        @StringForgery fakeViewUrl: String
    ) {
        // Given
        val mockView = mock<View>()
        val mockResources = mock<Resources>()
        val fakeDisplayMetrics = DisplayMetrics().apply { density = 1.0f }
        whenever(mockView.isClickable) doReturn true
        whenever(mockView.visibility) doReturn View.VISIBLE
        whenever(mockView.id) doReturn View.NO_ID
        whenever(mockView.parent) doReturn null
        whenever(mockView.width) doReturn 100
        whenever(mockView.height) doReturn 50
        whenever(mockView.resources) doReturn mockResources
        whenever(mockResources.displayMetrics) doReturn fakeDisplayMetrics

        val resolver = HeatmapTouchResolver(viewResolver = { mockView })

        // When
        val result = resolver.resolveHeatmapActionData(
            fakeReactTag,
            fakeX.toLong(),
            fakeY.toLong(),
            fakeViewUrl
        )

        // Then
        assertThat(result).isNotNull()
        assertThat(result!!.elementPath.last()).startsWith("cls:")
        assertThat(result.elementPath.last()).endsWith("#0")
    }

    @Test
    fun `M elementPath uses cls prefix W getResourceName throws NotFoundException`(
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 100.0) fakeX: Double,
        @DoubleForgery(0.0, 100.0) fakeY: Double,
        @StringForgery fakeViewUrl: String
    ) {
        // Given
        val mockView = mock<View>()
        val mockResources = mock<Resources>()
        val fakeDisplayMetrics = DisplayMetrics().apply { density = 1.0f }
        whenever(mockView.isClickable) doReturn true
        whenever(mockView.visibility) doReturn View.VISIBLE
        whenever(mockView.id) doReturn 999
        whenever(mockView.parent) doReturn null
        whenever(mockView.width) doReturn 100
        whenever(mockView.height) doReturn 50
        whenever(mockView.resources) doReturn mockResources
        whenever(mockResources.displayMetrics) doReturn fakeDisplayMetrics
        whenever(mockResources.getResourceName(999)).thenThrow(
            Resources.NotFoundException("not found")
        )

        val resolver = HeatmapTouchResolver(viewResolver = { mockView })

        // When
        val result = resolver.resolveHeatmapActionData(
            fakeReactTag,
            fakeX.toLong(),
            fakeY.toLong(),
            fakeViewUrl
        )

        // Then
        assertThat(result).isNotNull()
        assertThat(result!!.elementPath.last()).startsWith("cls:")
    }

    @Test
    fun `M elementPath type index counts same-class siblings W computeTypeIndex`(
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 100.0) fakeX: Double,
        @DoubleForgery(0.0, 100.0) fakeY: Double,
        @StringForgery fakeViewUrl: String
    ) {
        // Given
        val mockParent = mock<ViewGroup>()
        val mockParentResources = mock<Resources>()
        val fakeDisplayMetrics = DisplayMetrics().apply { density = 1.0f }
        whenever(mockParent.id) doReturn View.NO_ID
        whenever(mockParent.parent) doReturn null
        whenever(mockParent.isClickable) doReturn false
        whenever(mockParent.resources) doReturn mockParentResources
        whenever(mockParentResources.displayMetrics) doReturn fakeDisplayMetrics

        val mockSibling1 = mock<View>()
        val mockSibling2 = mock<View>()
        val mockView = mock<View>()
        // All three are the same Mockito proxy class → computeTypeIndex counts 2 before mockView
        whenever(mockParent.childCount) doReturn 3
        whenever(mockParent.getChildAt(0)) doReturn mockSibling1
        whenever(mockParent.getChildAt(1)) doReturn mockSibling2
        whenever(mockParent.getChildAt(2)) doReturn mockView

        val mockResources = mock<Resources>()
        whenever(mockView.isClickable) doReturn true
        whenever(mockView.visibility) doReturn View.VISIBLE
        whenever(mockView.id) doReturn View.NO_ID
        whenever(mockView.parent) doReturn mockParent
        whenever(mockView.width) doReturn 100
        whenever(mockView.height) doReturn 50
        whenever(mockView.resources) doReturn mockResources
        whenever(mockResources.displayMetrics) doReturn fakeDisplayMetrics

        val resolver = HeatmapTouchResolver(viewResolver = { mockView })

        // When
        val result = resolver.resolveHeatmapActionData(
            fakeReactTag,
            fakeX.toLong(),
            fakeY.toLong(),
            fakeViewUrl
        )

        // Then
        assertThat(result).isNotNull()
        assertThat(result!!.elementPath.last()).endsWith("#2")
    }

    // endregion
}
