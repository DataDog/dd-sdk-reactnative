/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.view.View
import com.facebook.react.bridge.ReactApplicationContext

/**
 * `UIManager.resolveView(reactTag)` was added in React Native 0.66; the old-architecture
 * `UIManager` interface doesn't declare it on RN <= 65 (this source set), so a React tag can't
 * be resolved to its native [View] for heatmap tap tracking here — this always returns null.
 */
internal fun createHeatmapViewResolver(
    reactApplicationContext: ReactApplicationContext,
    telemetry: DdTelemetry
): (Int) -> View? = { null }
