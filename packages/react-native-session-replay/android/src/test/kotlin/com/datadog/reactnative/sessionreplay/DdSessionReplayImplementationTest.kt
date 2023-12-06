/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import com.datadog.android.sessionreplay.SessionReplayConfiguration
import com.datadog.android.sessionreplay.SessionReplayPrivacy
import com.datadog.tools.unit.GenericAssert.Companion.assertThat
import com.facebook.react.bridge.Promise
import fr.xgouchet.elmyr.annotation.DoubleForgery
import fr.xgouchet.elmyr.annotation.Forgery
import fr.xgouchet.elmyr.annotation.StringForgery
import fr.xgouchet.elmyr.junit5.ForgeExtension
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.verify
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
internal class DdSessionReplayImplementationTest {

    lateinit var testedSessionReplay: DdSessionReplayImplementation

    @Mock
    lateinit var mockPromise: Promise

    @Mock
    lateinit var mockSessionReplay: SessionReplayWrapper

    @BeforeEach
    fun `set up`() {
        testedSessionReplay = DdSessionReplayImplementation { mockSessionReplay }
    }

    @AfterEach
    fun `tear down`() {
    }

    @Test
    fun `M enable session replay W enable()`(
        @DoubleForgery(min = 0.0, max = 100.0) replaySampleRate: Double,
        @Forgery privacy: SessionReplayPrivacy
    ) {
        // Given
        val sessionReplayConfigCaptor = argumentCaptor<SessionReplayConfiguration>()

        // When
        testedSessionReplay.enable(replaySampleRate, privacy.toString(), mockPromise)

        // Then
        verify(mockSessionReplay).enable(sessionReplayConfigCaptor.capture())
        assertThat(sessionReplayConfigCaptor.firstValue)
            .hasFieldEqualTo("sampleRate", replaySampleRate.toFloat())
            .hasFieldEqualTo("privacy", privacy)
    }

    @Test
    fun `M enable session replay with mask W enable with bad privacy option()`(
        @DoubleForgery(min = 0.0, max = 100.0) replaySampleRate: Double,
        // Not ALLOW nor MASK_USER_INPUT
        @StringForgery(regex = "^/(?!ALLOW|MASK_USER_INPUT)([a-z0-9]+)$/i") privacy: String
    ) {
        // Given
        val sessionReplayConfigCaptor = argumentCaptor<SessionReplayConfiguration>()

        // When
        testedSessionReplay.enable(replaySampleRate, privacy, mockPromise)

        // Then
        verify(mockSessionReplay).enable(sessionReplayConfigCaptor.capture())
        assertThat(sessionReplayConfigCaptor.firstValue)
            .hasFieldEqualTo("sampleRate", replaySampleRate.toFloat())
            .hasFieldEqualTo("privacy", SessionReplayPrivacy.MASK)
    }
}
