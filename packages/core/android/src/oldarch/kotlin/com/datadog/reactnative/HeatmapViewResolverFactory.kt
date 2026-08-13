/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.view.View
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.UIManagerType

/**
 * Resolves a React tag to its native [View] for heatmap tap tracking, via
 * `UIManager.resolveView(reactTag)`. That method exists on the old-architecture `UIManager`
 * interface from React Native 0.66 onward — see the `oldarch65` source set's counterpart of
 * this function for RN <= 65, where it doesn't exist.
 *
 * This is the base `oldarch` source set, used whenever no more specific split applies: it
 * covers every old-architecture RN version newer than the highest version-specific split
 * defined (currently `oldarch65`). If a future RN release removes/changes another API this
 * function (or another old-arch file) depends on, split off a new `oldarch<N>` source set named
 * for the highest old-arch minor version it covers — e.g. `oldarch70` for RN <= 70 — following
 * this same pattern, and this directory keeps meaning "later than the highest split."
 */
internal fun createHeatmapViewResolver(
    reactApplicationContext: ReactApplicationContext,
    telemetry: DdTelemetry
): (Int) -> View? = { reactTag ->
    try {
        UIManagerHelper.getUIManager(reactApplicationContext, UIManagerType.DEFAULT)
            ?.resolveView(reactTag)
    } catch (e: Exception) {
        telemetry.telemetryError("Failed to resolve view for heatmap tracking", e)
        null
    }
}
