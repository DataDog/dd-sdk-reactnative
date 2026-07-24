/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.profiling

import android.os.Build
import com.datadog.android.api.feature.FeatureSdkCore
import com.datadog.android.profiling.ExperimentalProfilingApi
import com.datadog.android.profiling.ProfilingConfiguration
import com.datadog.tools.unit.GenericAssert.Companion.assertThat
import com.facebook.react.bridge.Promise
import fr.xgouchet.elmyr.annotation.DoubleForgery
import fr.xgouchet.elmyr.annotation.StringForgery
import fr.xgouchet.elmyr.junit5.ForgeExtension
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.verify
import org.mockito.kotlin.verifyNoInteractions
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
internal class DdProfilingImplementationTest {

    lateinit var testedProfiling: DdProfilingImplementation

    @Mock
    lateinit var mockPromise: Promise

    @Mock
    lateinit var mockProfilingWrapper: ProfilingWrapper

    @BeforeEach
    fun `set up`() {
        testedProfiling = DdProfilingImplementation(
            sdkVersionProvider = { Build.VERSION_CODES.VANILLA_ICE_CREAM },
            profilingProvider = { mockProfilingWrapper }
        )
    }

    @OptIn(ExperimentalProfilingApi::class)
    @Test
    fun `M enable profiling W random sample rates`(
        @DoubleForgery(min = 0.0, max = 100.0) applicationLaunchSampleRate: Double,
        @DoubleForgery(min = 0.0, max = 100.0) continuousSampleRate: Double,
        @StringForgery(regex = "https://.+") customEndpoint: String
    ) {
        // Given
        val profilingConfigCaptor = argumentCaptor<ProfilingConfiguration>()

        // When
        testedProfiling.enable(
            applicationLaunchSampleRate,
            continuousSampleRate,
            customEndpoint,
            mockPromise
        )

        // Then
        verify(mockProfilingWrapper).enable(profilingConfigCaptor.capture(), any<FeatureSdkCore>())
        assertThat(profilingConfigCaptor.firstValue)
            .hasFieldEqualTo("applicationLaunchSampleRate", applicationLaunchSampleRate.toFloat())
            .hasFieldEqualTo("continuousSampleRate", continuousSampleRate.toFloat())
            .hasFieldEqualTo("customEndpointUrl", customEndpoint)
        verify(mockPromise).resolve(null)
    }

    @OptIn(ExperimentalProfilingApi::class)
    @Test
    fun `M enable profiling without custom endpoint W empty string`(
        @DoubleForgery(min = 0.0, max = 100.0) applicationLaunchSampleRate: Double,
        @DoubleForgery(min = 0.0, max = 100.0) continuousSampleRate: Double
    ) {
        // Given
        val profilingConfigCaptor = argumentCaptor<ProfilingConfiguration>()

        // When
        testedProfiling.enable(
            applicationLaunchSampleRate,
            continuousSampleRate,
            "",
            mockPromise
        )

        // Then
        verify(mockProfilingWrapper).enable(profilingConfigCaptor.capture(), any<FeatureSdkCore>())
        assertThat(profilingConfigCaptor.firstValue)
            .hasFieldEqualTo("applicationLaunchSampleRate", applicationLaunchSampleRate.toFloat())
            .hasFieldEqualTo("continuousSampleRate", continuousSampleRate.toFloat())
            .hasFieldEqualTo("customEndpointUrl", null)
        verify(mockPromise).resolve(null)
    }

    @Test
    fun `M no-op W enable called on unsupported API level`(
        @DoubleForgery(min = 0.0, max = 100.0) applicationLaunchSampleRate: Double,
        @DoubleForgery(min = 0.0, max = 100.0) continuousSampleRate: Double,
        @StringForgery(regex = "https://.+") customEndpoint: String
    ) {
        // Given
        testedProfiling = DdProfilingImplementation(
            sdkVersionProvider = { Build.VERSION_CODES.VANILLA_ICE_CREAM - 1 },
            profilingProvider = { mockProfilingWrapper }
        )

        // When
        testedProfiling.enable(
            applicationLaunchSampleRate,
            continuousSampleRate,
            customEndpoint,
            mockPromise
        )

        // Then
        verifyNoInteractions(mockProfilingWrapper)
        verify(mockPromise).resolve(null)
    }
}
