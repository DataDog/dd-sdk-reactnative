package com.datadog.reactnative.sessionreplay.extensions

import com.facebook.react.uimanager.LengthPercentage

internal fun LengthPercentage?.getRadius(width: Float, height: Float) = this
    ?.resolve(width, height)
    ?.let { (it.horizontal + it.vertical) / 2f }
    ?: 0f