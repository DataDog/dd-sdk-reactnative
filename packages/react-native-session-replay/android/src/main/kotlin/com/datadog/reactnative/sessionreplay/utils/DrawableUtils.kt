/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.utils

import android.graphics.drawable.Drawable
import android.graphics.drawable.InsetDrawable
import android.graphics.drawable.LayerDrawable
import com.facebook.react.views.view.ReactViewBackgroundDrawable

internal class DrawableUtils {
    internal fun getReactBackgroundFromDrawable(drawable: Drawable?): ReactViewBackgroundDrawable? {
        if (drawable is ReactViewBackgroundDrawable) {
            return drawable
        }

        if (drawable is InsetDrawable) {
            return getReactBackgroundFromDrawable(drawable.drawable)
        }

        if (drawable is LayerDrawable) {
            for (layerNumber in 0 until drawable.numberOfLayers) {
                val layer = drawable.getDrawable(layerNumber)
                if (layer is ReactViewBackgroundDrawable) {
                    return layer
                }
            }
        }

        return null
    }
}
