/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.utils

import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.InsetDrawable
import android.graphics.drawable.LayerDrawable
import com.facebook.react.views.view.ReactViewBackgroundDrawable
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
internal class DrawableUtilsTest {
    private lateinit var testedDrawableUtils: DrawableUtils

    @Mock
    private lateinit var mockReactViewBackgroundDrawable: ReactViewBackgroundDrawable

    @Mock
    private lateinit var mockInsetDrawable: InsetDrawable

    @Mock
    private lateinit var mockLayerDrawable: LayerDrawable

    @Mock
    private lateinit var mockColorDrawable: ColorDrawable

    @BeforeEach
    fun `set up`() {
        whenever(mockLayerDrawable.numberOfLayers).thenReturn(3)
        whenever(mockLayerDrawable.getDrawable(0)).thenReturn(mockReactViewBackgroundDrawable)

        testedDrawableUtils = DrawableUtils()
    }

    @Test
    fun `M return drawable W getReactBackgroundFromDrawable { ReactViewBackgroundDrawable }`() {
        // When
        val result = testedDrawableUtils
            .getReactBackgroundFromDrawable(mockReactViewBackgroundDrawable)

        // Then
        assertThat(result).isEqualTo(mockReactViewBackgroundDrawable)
    }

    @Test
    fun `M return drawable W getReactBackgroundFromDrawable { InsetDrawable }`() {
        // Given
        whenever(mockInsetDrawable.drawable).thenReturn(mockReactViewBackgroundDrawable)

        // When
        val result = testedDrawableUtils.getReactBackgroundFromDrawable(mockInsetDrawable)

        // Then
        assertThat(result).isEqualTo(mockReactViewBackgroundDrawable)
    }

    @Test
    fun `M return drawable W getReactBackgroundFromDrawable { LayerDrawable }`() {
        // When
        val result = testedDrawableUtils.getReactBackgroundFromDrawable(mockLayerDrawable)

        // Then
        assertThat(result).isEqualTo(mockReactViewBackgroundDrawable)
    }

    @Test
    fun `M return null W getReactBackgroundFromDrawable { drawable is not supported }`() {
        // When
        val result = testedDrawableUtils.getReactBackgroundFromDrawable(mockColorDrawable)

        // Then
        assertThat(result).isNull()
    }

    @Test
    fun `M return null W getReactBackgroundFromDrawable { null drawable }`() {
        // When
        val result = testedDrawableUtils.getReactBackgroundFromDrawable(null)

        // Then
        assertThat(result).isNull()
    }
}
