/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.resources

import android.content.res.Resources
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import com.datadog.android.sessionreplay.recorder.resources.DefaultDrawableCopier
import com.datadog.android.sessionreplay.recorder.resources.DrawableCopier
import com.datadog.reactnative.sessionreplay.extensions.tryToExtractBitmap
import com.facebook.drawee.drawable.ArrayDrawable
import com.facebook.drawee.drawable.ForwardingDrawable
import com.facebook.drawee.drawable.RoundedBitmapDrawable

internal class ReactDrawableCopier : DrawableCopier {
    private val defaultCopier = DefaultDrawableCopier()

    override fun copy(
        originalDrawable: Drawable,
        resources: Resources
    ): Drawable? {
        // DefaultDrawableCopier's constantState.newDrawable() wraps the SAME underlying Bitmap
        // instead of copying it, so a BitmapDrawable must always go through tryToExtractBitmap
        // (which returns a private copy), regardless of whether constantState is non-null.
        if (originalDrawable is BitmapDrawable) {
            return originalDrawable.tryToExtractBitmap(resources)?.let { bitmap ->
                BitmapDrawable(resources, bitmap).apply {
                    bounds = originalDrawable.bounds
                    alpha = originalDrawable.alpha
                    gravity = originalDrawable.gravity
                    tileModeX = originalDrawable.tileModeX
                    tileModeY = originalDrawable.tileModeY
                    colorFilter = originalDrawable.colorFilter
                    isFilterBitmap = originalDrawable.isFilterBitmap
                    isAutoMirrored = originalDrawable.isAutoMirrored
                }
            }
        }

        // don't trust constantState alone to mean "safe to alias" for Fresco's own
        // bitmap-wrapping types - their getConstantState() happens to return null today,
        // but that's an unenforced assumption about Fresco's internals, not a guarantee.
        val useDefaultCopier = originalDrawable.constantState != null &&
            !originalDrawable.isFrescoBitmapWrapper()

        return if (useDefaultCopier) {
            defaultCopier.copy(originalDrawable, resources)
        } else {
            originalDrawable.tryToExtractBitmap(resources)?.let { bitmap ->
                BitmapDrawable(resources, bitmap).apply {
                    bounds = originalDrawable.bounds
                    alpha = originalDrawable.alpha
                }
            }
        }
    }
}

private fun Drawable.isFrescoBitmapWrapper(): Boolean =
    this is ArrayDrawable || this is ForwardingDrawable || this is RoundedBitmapDrawable
