/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
package com.datadog.reactnative.sessionreplay.extensions

import com.facebook.react.uimanager.style.ComputedBorderRadius
import com.facebook.react.uimanager.style.ComputedBorderRadiusProp

internal fun ComputedBorderRadius?.getAverage(): Float {
    val topRightRadius = this
        ?.getAverageForProp(ComputedBorderRadiusProp.COMPUTED_BORDER_TOP_RIGHT_RADIUS) ?: 0f
    val topLeftRadius = this
        ?.getAverageForProp(ComputedBorderRadiusProp.COMPUTED_BORDER_TOP_LEFT_RADIUS) ?: 0f
    val bottomRightRadius = this
        ?.getAverageForProp(ComputedBorderRadiusProp.COMPUTED_BORDER_BOTTOM_RIGHT_RADIUS) ?: 0f
    val bottomLeftRadius = this
        ?.getAverageForProp(ComputedBorderRadiusProp.COMPUTED_BORDER_BOTTOM_LEFT_RADIUS) ?: 0f
    return (topRightRadius + topLeftRadius + bottomRightRadius + bottomLeftRadius) / 4f
}

internal fun ComputedBorderRadius?.getAverageForProp(prop: ComputedBorderRadiusProp): Float {
    val vertical = this?.get(prop)?.vertical ?: 0f
    val horizontal = this?.get(prop)?.vertical ?: 0f
    return (vertical + horizontal) / 2f
}
