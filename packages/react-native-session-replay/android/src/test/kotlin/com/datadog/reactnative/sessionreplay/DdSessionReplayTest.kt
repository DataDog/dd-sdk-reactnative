/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import android.content.res.AssetManager
import com.datadog.android.sessionreplay.ImagePrivacy
import com.datadog.android.sessionreplay.SessionReplay
import com.datadog.android.sessionreplay.SessionReplayConfiguration
import com.datadog.android.sessionreplay.TextAndInputPrivacy
import com.datadog.android.sessionreplay.TouchPrivacy
import com.datadog.reactnative.HeatmapActionHandler
import com.datadog.tools.unit.GenericAssert.Companion.assertThat
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.UIManagerModule
import java.io.IOException
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.mockito.Mock
import org.mockito.Mockito.mockStatic
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.doReturn
import org.mockito.kotlin.doThrow
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.mockito.quality.Strictness

@ExtendWith(MockitoExtension::class)
@MockitoSettings(strictness = Strictness.LENIENT)
internal class DdSessionReplayTest {

    @Mock
    lateinit var mockReactContext: ReactApplicationContext

    @Mock
    lateinit var mockPromise: Promise

    @Mock
    lateinit var mockUiManagerModule: UIManagerModule

    @Mock
    lateinit var mockAssetManager: AssetManager

    @BeforeEach
    fun `set up`() {
        whenever(mockReactContext.getNativeModule(any<Class<NativeModule>>()))
            .doReturn(mockUiManagerModule)
        whenever(mockReactContext.assets).doReturn(mockAssetManager)
        whenever(mockAssetManager.open(any())).doThrow(IOException("No assets in test"))
    }

    @AfterEach
    fun `tear down`() {
        HeatmapActionHandler.heatmapsEnabled = false
    }

    // This test runs against whichever bridge (old or new architecture) is selected by Gradle.
    @ParameterizedTest
    @ValueSource(booleans = [true, false])
    fun `M forward adaptive capture scheduling to native SDK W enable on bridge`(
        adaptiveCaptureSchedulingEnabled: Boolean
    ) {
        val configurationCaptor = argumentCaptor<SessionReplayConfiguration>()
        val otherOptionsEnabled = !adaptiveCaptureSchedulingEnabled

        mockStatic(SessionReplay::class.java).use { sessionReplay ->
            // Positional arguments mirror the JavaScript/TurboModule contract.
            // Opposite values for other options detect swapped boolean arguments.
            DdSessionReplay(mockReactContext).enable(
                37.0, // replaySampleRate
                "https://session-replay.example.com", // customEndpoint
                "MASK_NONE", // imagePrivacyLevel
                "SHOW", // touchPrivacyLevel
                "MASK_ALL_INPUTS", // textAndInputPrivacyLevel
                otherOptionsEnabled, // startRecordingImmediately
                otherOptionsEnabled, // enableHeatmaps
                otherOptionsEnabled, // enableCompositionTreeRecording
                adaptiveCaptureSchedulingEnabled,
                mockPromise // promise
            )

            sessionReplay.verify { SessionReplay.enable(configurationCaptor.capture(), any()) }
            assertThat(configurationCaptor.firstValue)
                .hasFieldEqualTo(
                    "adaptiveCaptureSchedulingEnabled",
                    adaptiveCaptureSchedulingEnabled
                )
                .hasFieldEqualTo("dynamicOptimizationEnabled", true)
                .hasFieldEqualTo("sampleRate", 37.0f)
                .hasFieldEqualTo("customEndpointUrl", "https://session-replay.example.com")
                .hasFieldEqualTo("imagePrivacy", ImagePrivacy.MASK_NONE)
                .hasFieldEqualTo("touchPrivacy", TouchPrivacy.SHOW)
                .hasFieldEqualTo("textAndInputPrivacy", TextAndInputPrivacy.MASK_ALL_INPUTS)
                .hasFieldEqualTo("startRecordingImmediately", otherOptionsEnabled)
                .hasFieldEqualTo("heatmapsEnabled", otherOptionsEnabled)
            verify(mockPromise).resolve(null)
        }
    }
}
