/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import fr.xgouchet.elmyr.junit5.ForgeExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
internal class ColorUtilsTest {

    @Test
    fun `M return without alpha W formatAsRgba { color without alpha }`() {
        // When
        val hexColor = formatAsRgba(16711680)

        // Then
        assertThat(hexColor).isEqualTo("#ff0000")
    }

    @Test
    fun `M resolve with alpha W formatAsRgba { color with alpha }`() {
        // When
        val hexColor = formatAsRgba(1717960806)

        // Then
        assertThat(hexColor).isEqualTo("#66006666")
    }
}
