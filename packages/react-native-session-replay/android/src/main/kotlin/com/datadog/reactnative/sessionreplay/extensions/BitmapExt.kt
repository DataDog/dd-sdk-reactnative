/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.extensions

import android.graphics.Bitmap
import android.graphics.Bitmap.Config

/**
 * Returns a private copy of this bitmap, or null if it could not be copied (e.g. it was
 * already recycled by its owner). Must never fall back to returning the original bitmap.
 * `targetConfig` converts the copy to a different config; defaults to this bitmap's own.
 */
internal fun Bitmap.safeCopy(targetConfig: Config? = null): Bitmap? {
    return try {
        copy(targetConfig ?: config ?: Config.ARGB_8888, false)
    } catch (_: IllegalStateException) {
        null
    } catch (_: RuntimeException) {
        null
    }
}

/**
 * Returns a scaled private copy of this bitmap, or null if it could not be read (e.g. it was
 * already recycled by its owner). Must never fall back to returning the original bitmap.
 */
internal fun Bitmap.safeScale(width: Int, height: Int): Bitmap? {
    return try {
        // createScaledBitmap reads directly from its source, so touching `this` (potentially
        // still live and owned externally) here would carry the same recycle race the equal-
        // size case already had to avoid. Touch `this` exactly once via safeCopy(), then do
        // all further work - including any scaling - on that private result, never on `this`.
        val privateBitmap = safeCopy() ?: return null
        if (width == privateBitmap.width && height == privateBitmap.height) {
            privateBitmap
        } else {
            Bitmap.createScaledBitmap(privateBitmap, width, height, true)
        }
    } catch (_: IllegalStateException) {
        null
    } catch (_: RuntimeException) {
        null
    }
}
