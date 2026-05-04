/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.any
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.quality.Strictness

/**
 * Reproduction tests for RUMS-5852.
 *
 * On Android, React Native long_task / frozen_frame detection never fires for JS-thread hangs
 * because [FpsFrameCallback.start]/[FpsFrameCallback.stop] hop back to the UI thread via
 * [UiThreadExecutor.runOnUiThread] before posting the FrameCallback. Android
 * `Choreographer.getInstance()` is thread-local and Looper-bound, so the FrameCallback ticks on
 * the main thread regardless of JS state. The frame deltas reflect UI VSYNC cadence and never
 * cross the JS long-task threshold.
 *
 * These are negative-existence assertions: the tests verify that [UiThreadExecutor.runOnUiThread]
 * MUST NOT be invoked by [FpsFrameCallback.start]/[stop]. They fail on develop because the
 * current implementation does invoke the UI thread executor; they will pass after the fix routes
 * dispatch through a JS-thread executor instead.
 */
@Extensions(
    ExtendWith(MockitoExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
internal class FpsFrameCallbackTest {

    @Mock
    lateinit var mockUiThreadExecutor: UiThreadExecutor

    private val noopFrameRateCallback: (Double) -> Unit = { _ -> }

    private lateinit var testedFrameCallback: FpsFrameCallback

    @BeforeEach
    fun `set up`() {
        testedFrameCallback = FpsFrameCallback(
            noopFrameRateCallback,
            mockUiThreadExecutor
        )
    }

    @Test
    fun `M not invoke uiThreadExecutor W start()`() {
        // When
        testedFrameCallback.start()

        // Then — see RUMS-5852: posting to the Choreographer must happen on the JS thread,
        // not the UI thread. Today's implementation hops to the UI thread, which binds
        // Choreographer ticks to UI VSYNC cadence and prevents JS-thread hangs from being
        // detected as long_tasks / frozen_frames.
        verify(mockUiThreadExecutor, never()).runOnUiThread(any())
    }

    @Test
    fun `M not invoke uiThreadExecutor W stop()`() {
        // When
        testedFrameCallback.stop()

        // Then — see RUMS-5852: removing the FrameCallback must happen on the same thread it
        // was posted on (the JS thread), not the UI thread.
        verify(mockUiThreadExecutor, never()).runOnUiThread(any())
    }
}
