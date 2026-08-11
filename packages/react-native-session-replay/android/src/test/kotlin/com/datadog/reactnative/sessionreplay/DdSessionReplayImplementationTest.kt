/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import android.content.res.AssetManager
import com.datadog.android.sessionreplay.ImagePrivacy
import com.datadog.android.sessionreplay.SessionReplayConfiguration
import com.datadog.android.sessionreplay.SessionReplayPrivacy
import com.datadog.android.sessionreplay.TextAndInputPrivacy
import com.datadog.android.sessionreplay.TouchPrivacy
import com.datadog.reactnative.HeatmapActionHandler
import com.datadog.tools.unit.GenericAssert.Companion.assertThat
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerModule
import fr.xgouchet.elmyr.annotation.BoolForgery
import fr.xgouchet.elmyr.annotation.DoubleForgery
import fr.xgouchet.elmyr.annotation.StringForgery
import fr.xgouchet.elmyr.junit5.ForgeExtension
import java.io.IOException
import org.assertj.core.api.Assertions.assertThat as assertJThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertThrows
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
import org.mockito.kotlin.doThrow
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

    @Mock
    lateinit var mockAssetManager: AssetManager

    private val imagePrivacyMap = mapOf(
        "MASK_ALL" to ImagePrivacy.MASK_ALL,
        "MASK_NON_BUNDLED_ONLY" to ImagePrivacy.MASK_LARGE_ONLY,
        "MASK_NONE" to ImagePrivacy.MASK_NONE
    )

    private val touchPrivacyMap = mapOf(
        "SHOW" to TouchPrivacy.SHOW,
        "HIDE" to TouchPrivacy.HIDE
    )

    private val inputPrivacyMap = mapOf(
        "MASK_ALL" to TextAndInputPrivacy.MASK_ALL,
        "MASK_ALL_INPUTS" to TextAndInputPrivacy.MASK_ALL_INPUTS,
        "MASK_SENSITIVE_INPUTS" to TextAndInputPrivacy.MASK_SENSITIVE_INPUTS
    )

    @BeforeEach
    fun `set up`() {
        whenever(mockReactContext.getNativeModule(any<Class<NativeModule>>()))
            .doReturn(mockUiManagerModule)
        whenever(mockReactContext.assets).doReturn(mockAssetManager)
        whenever(mockAssetManager.open(any())).doThrow(IOException("No assets in test"))

        testedSessionReplay =
            DdSessionReplayImplementation(mockReactContext) { mockSessionReplay }
    }

    @AfterEach
    fun `tear down`() {
        // Reset global heatmaps flag to avoid leaking state between tests
        HeatmapActionHandler.heatmapsEnabled = false
    }

    @Test
    fun `M enable session replay W random privacy settings`(
        @DoubleForgery(min = 0.0, max = 100.0) replaySampleRate: Double,
        @StringForgery(regex = ".+") customEndpoint: String,
        @BoolForgery startRecordingImmediately: Boolean
    ) {
        val imagePrivacy = imagePrivacyMap.keys.random()
        val touchPrivacy = touchPrivacyMap.keys.random()
        val textAndInputPrivacy = inputPrivacyMap.keys.random()

        testSessionReplayEnable(
            replaySampleRate = replaySampleRate,
            customEndpoint = customEndpoint,
            imagePrivacy = imagePrivacy,
            touchPrivacy = touchPrivacy,
            textAndInputPrivacy = textAndInputPrivacy,
            startRecordingImmediately = startRecordingImmediately
        )
    }

    private fun testSessionReplayEnable(
        replaySampleRate: Double,
        customEndpoint: String,
        imagePrivacy: String,
        touchPrivacy: String,
        textAndInputPrivacy: String,
        startRecordingImmediately: Boolean
    ) {
        // Given
        val sessionReplayConfigCaptor = argumentCaptor<SessionReplayConfiguration>()

        // When
        testedSessionReplay.enable(
            replaySampleRate,
            customEndpoint,
            SessionReplayPrivacySettings(imagePrivacy, touchPrivacy, textAndInputPrivacy),
            startRecordingImmediately,
            false,
            mockPromise
        )

        // Then
        verify(mockSessionReplay).enable(sessionReplayConfigCaptor.capture(), any())
        assertThat(sessionReplayConfigCaptor.firstValue)
            .hasFieldEqualTo("sampleRate", replaySampleRate.toFloat())
            .hasFieldEqualTo("customEndpointUrl", customEndpoint)
            .hasFieldEqualTo("textAndInputPrivacy", inputPrivacyMap[textAndInputPrivacy])
            .hasFieldEqualTo("imagePrivacy", imagePrivacyMap[imagePrivacy])
            .hasFieldEqualTo("touchPrivacy", touchPrivacyMap[touchPrivacy])
    }

    @Test
    fun `M enable session replay without custom endpoint W empty string()`(
        @DoubleForgery(min = 0.0, max = 100.0) replaySampleRate: Double,
        @BoolForgery startRecordingImmediately: Boolean
    ) {
        // Given
        val imagePrivacy = imagePrivacyMap.keys.random()
        val touchPrivacy = touchPrivacyMap.keys.random()
        val textAndInputPrivacy = inputPrivacyMap.keys.random()
        val sessionReplayConfigCaptor = argumentCaptor<SessionReplayConfiguration>()

        // When
        testedSessionReplay.enable(
            replaySampleRate,
            "",
            SessionReplayPrivacySettings(
                imagePrivacyLevel = imagePrivacy,
                touchPrivacyLevel = touchPrivacy,
                textAndInputPrivacyLevel = textAndInputPrivacy
            ),
            startRecordingImmediately,
            false,
            mockPromise
        )

        // Then
        verify(mockSessionReplay).enable(sessionReplayConfigCaptor.capture(), any())
        assertThat(sessionReplayConfigCaptor.firstValue)
            .hasFieldEqualTo("sampleRate", replaySampleRate.toFloat())
            .hasFieldEqualTo("privacy", SessionReplayPrivacy.MASK)
            .hasFieldEqualTo("startRecordingImmediately", startRecordingImmediately)
            .doesNotHaveField("customEndpointUrl")
    }

    // region enableHeatmaps flag

    @Test
    fun `M set HeatmapActionHandler heatmapsEnabled to true W enable() with enableHeatmaps true`(
        @DoubleForgery(min = 0.0, max = 100.0) replaySampleRate: Double,
        @BoolForgery startRecordingImmediately: Boolean
    ) {
        // Given
        val imagePrivacy = imagePrivacyMap.keys.random()
        val touchPrivacy = touchPrivacyMap.keys.random()
        val textAndInputPrivacy = inputPrivacyMap.keys.random()

        // When
        testedSessionReplay.enable(
            replaySampleRate,
            "",
            SessionReplayPrivacySettings(imagePrivacy, touchPrivacy, textAndInputPrivacy),
            startRecordingImmediately,
            enableHeatmaps = true,
            mockPromise
        )

        // Then
        assertJThat(HeatmapActionHandler.heatmapsEnabled).isTrue()
    }

    @Test
    fun `M set HeatmapActionHandler heatmapsEnabled to false W enable() with enableHeatmaps false`(
        @DoubleForgery(min = 0.0, max = 100.0) replaySampleRate: Double,
        @BoolForgery startRecordingImmediately: Boolean
    ) {
        // Given — force the flag to true first to verify it gets set back to false
        HeatmapActionHandler.heatmapsEnabled = true
        val imagePrivacy = imagePrivacyMap.keys.random()
        val touchPrivacy = touchPrivacyMap.keys.random()
        val textAndInputPrivacy = inputPrivacyMap.keys.random()

        // When
        testedSessionReplay.enable(
            replaySampleRate,
            "",
            SessionReplayPrivacySettings(imagePrivacy, touchPrivacy, textAndInputPrivacy),
            startRecordingImmediately,
            enableHeatmaps = false,
            mockPromise
        )

        // Then
        assertJThat(HeatmapActionHandler.heatmapsEnabled).isFalse()
    }

    @Test
    fun `M build config with heatmapsEnabled true W enable() with enableHeatmaps true`(
        @DoubleForgery(min = 0.0, max = 100.0) replaySampleRate: Double,
        @BoolForgery startRecordingImmediately: Boolean
    ) {
        // Given
        val imagePrivacy = imagePrivacyMap.keys.random()
        val touchPrivacy = touchPrivacyMap.keys.random()
        val textAndInputPrivacy = inputPrivacyMap.keys.random()
        val sessionReplayConfigCaptor = argumentCaptor<SessionReplayConfiguration>()

        // When
        testedSessionReplay.enable(
            replaySampleRate,
            "",
            SessionReplayPrivacySettings(imagePrivacy, touchPrivacy, textAndInputPrivacy),
            startRecordingImmediately,
            enableHeatmaps = true,
            mockPromise
        )

        // Then — heatmapsEnabled is true in the built SessionReplayConfiguration
        verify(mockSessionReplay).enable(sessionReplayConfigCaptor.capture(), any())
        assertThat(sessionReplayConfigCaptor.firstValue)
            .hasFieldEqualTo("heatmapsEnabled", true)
    }

    @Test
    fun `M build config with heatmapsEnabled false W enable() with enableHeatmaps false`(
        @DoubleForgery(min = 0.0, max = 100.0) replaySampleRate: Double,
        @BoolForgery startRecordingImmediately: Boolean
    ) {
        // Given
        val imagePrivacy = imagePrivacyMap.keys.random()
        val touchPrivacy = touchPrivacyMap.keys.random()
        val textAndInputPrivacy = inputPrivacyMap.keys.random()
        val sessionReplayConfigCaptor = argumentCaptor<SessionReplayConfiguration>()

        // When
        testedSessionReplay.enable(
            replaySampleRate,
            "",
            SessionReplayPrivacySettings(imagePrivacy, touchPrivacy, textAndInputPrivacy),
            startRecordingImmediately,
            enableHeatmaps = false,
            mockPromise
        )

        // Then — heatmapsEnabled is false in the built SessionReplayConfiguration
        verify(mockSessionReplay).enable(sessionReplayConfigCaptor.capture(), any())
        assertThat(sessionReplayConfigCaptor.firstValue)
            .hasFieldEqualTo("heatmapsEnabled", false)
    }

    @Test
    fun `M not set HeatmapActionHandler heatmapsEnabled W enable() throws`(
        @DoubleForgery(min = 0.0, max = 100.0) replaySampleRate: Double,
        @BoolForgery startRecordingImmediately: Boolean
    ) {
        // Given — the underlying SR provider fails before the heatmaps flag would be set
        val imagePrivacy = imagePrivacyMap.keys.random()
        val touchPrivacy = touchPrivacyMap.keys.random()
        val textAndInputPrivacy = inputPrivacyMap.keys.random()
        whenever(mockSessionReplay.enable(any(), any())) doThrow IllegalStateException("boom")

        // When / Then
        assertThrows(IllegalStateException::class.java) {
            testedSessionReplay.enable(
                replaySampleRate,
                "",
                SessionReplayPrivacySettings(imagePrivacy, touchPrivacy, textAndInputPrivacy),
                startRecordingImmediately,
                enableHeatmaps = true,
                mockPromise
            )
        }

        // Then — heatmapsEnabled was never reached, so it stays at its default
        assertJThat(HeatmapActionHandler.heatmapsEnabled).isFalse()
    }

    // endregion
}
