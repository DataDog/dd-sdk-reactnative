/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import com.datadog.android.sessionreplay.ImagePrivacy
import com.datadog.android.sessionreplay.SessionReplayConfiguration
import com.datadog.android.sessionreplay.SessionReplayPrivacy
import com.datadog.android.sessionreplay.TextAndInputPrivacy
import com.datadog.android.sessionreplay.TouchPrivacy
import com.datadog.tools.unit.GenericAssert.Companion.assertThat
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerModule
import fr.xgouchet.elmyr.annotation.DoubleForgery
import fr.xgouchet.elmyr.annotation.StringForgery
import fr.xgouchet.elmyr.junit5.ForgeExtension
import java.util.Locale
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.doReturn
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
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
    lateinit var mockReactContext: ReactContext

    @Mock
    lateinit var mockSessionReplay: SessionReplayWrapper

    @Mock
    lateinit var mockUiManagerModule: UIManagerModule

    @BeforeEach
    fun `set up`() {
        whenever(mockReactContext.getNativeModule(any<Class<NativeModule>>()))
            .doReturn(mockUiManagerModule)

        testedSessionReplay =
            DdSessionReplayImplementation(mockReactContext) { mockSessionReplay }
    }

    @AfterEach
    fun `tear down`() {
    }

    @Test
    fun `M enable session replay W privacy = ALLOW`(
        @DoubleForgery(min = 0.0, max = 100.0) replaySampleRate: Double,
        @StringForgery(regex = ".+") customEndpoint: String
    ) {
        testSessionReplayEnable("ALLOW", replaySampleRate, customEndpoint)
    }

    @Test
    fun `M enable session replay W privacy = MASK`(
        @DoubleForgery(min = 0.0, max = 100.0) replaySampleRate: Double,
        @StringForgery(regex = ".+") customEndpoint: String
    ) {
        testSessionReplayEnable("MASK", replaySampleRate, customEndpoint)
    }

    @Test
    fun `M enable session replay W privacy = MASK_USER_INPUT`(
        @DoubleForgery(min = 0.0, max = 100.0) replaySampleRate: Double,
        @StringForgery(regex = ".+") customEndpoint: String
    ) {
        testSessionReplayEnable("MASK_USER_INPUT", replaySampleRate, customEndpoint)
    }

    private fun testSessionReplayEnable(
        privacy: String,
        replaySampleRate: Double,
        customEndpoint: String
    ) {
        // Given
        val sessionReplayConfigCaptor = argumentCaptor<SessionReplayConfiguration>()

        // When
        testedSessionReplay.enable(
            replaySampleRate,
            privacy,
            customEndpoint,
            mockPromise
        )

        // Then
        verify(mockSessionReplay).enable(sessionReplayConfigCaptor.capture(), any())
        assertThat(sessionReplayConfigCaptor.firstValue)
            .hasFieldEqualTo("sampleRate", replaySampleRate.toFloat())
            .hasFieldEqualTo("customEndpointUrl", customEndpoint)

        when (privacy.lowercase(Locale.US)) {
            "mask_user_input" -> {
                assertThat(sessionReplayConfigCaptor.firstValue)
                    .hasFieldEqualTo("textAndInputPrivacy", TextAndInputPrivacy.MASK_ALL_INPUTS)
                    .hasFieldEqualTo("imagePrivacy", ImagePrivacy.MASK_NONE)
                    .hasFieldEqualTo("touchPrivacy", TouchPrivacy.HIDE)
            }
            "allow" -> {
                assertThat(sessionReplayConfigCaptor.firstValue)
                    .hasFieldEqualTo(
                        "textAndInputPrivacy",
                        TextAndInputPrivacy.MASK_SENSITIVE_INPUTS
                    )
                    .hasFieldEqualTo("imagePrivacy", ImagePrivacy.MASK_NONE)
                    .hasFieldEqualTo("touchPrivacy", TouchPrivacy.SHOW)
            }
            else -> {
                assertThat(sessionReplayConfigCaptor.firstValue)
                    .hasFieldEqualTo("textAndInputPrivacy", TextAndInputPrivacy.MASK_ALL)
                    .hasFieldEqualTo("imagePrivacy", ImagePrivacy.MASK_ALL)
                    .hasFieldEqualTo("touchPrivacy", TouchPrivacy.HIDE)
            }
        }
    }

    @Test
    fun `M enable session replay without custom endpoint W empty string()`(
        @DoubleForgery(min = 0.0, max = 100.0) replaySampleRate: Double,
        // Not ALLOW nor MASK_USER_INPUT
        @StringForgery(regex = "^/(?!ALLOW|MASK_USER_INPUT)([a-z0-9]+)$/i") privacy: String
    ) {
        // Given
        val sessionReplayConfigCaptor = argumentCaptor<SessionReplayConfiguration>()

        // When
        testedSessionReplay.enable(replaySampleRate, privacy, "", mockPromise)

        // Then
        verify(mockSessionReplay).enable(sessionReplayConfigCaptor.capture(), any())
        assertThat(sessionReplayConfigCaptor.firstValue)
            .hasFieldEqualTo("sampleRate", replaySampleRate.toFloat())
            .hasFieldEqualTo("privacy", SessionReplayPrivacy.MASK)
            .doesNotHaveField("customEndpointUrl")
    }
}
