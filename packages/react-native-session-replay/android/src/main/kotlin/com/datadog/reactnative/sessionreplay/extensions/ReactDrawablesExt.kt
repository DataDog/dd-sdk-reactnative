/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.extensions

import android.content.res.Resources
import android.graphics.Bitmap
import android.graphics.Bitmap.Config
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.graphics.drawable.ShapeDrawable
import android.graphics.drawable.VectorDrawable
import android.widget.ImageView
import androidx.appcompat.graphics.drawable.DrawerArrowDrawable
import com.facebook.drawee.drawable.ArrayDrawable
import com.facebook.drawee.drawable.ForwardingDrawable
import com.facebook.drawee.drawable.RoundedBitmapDrawable
import com.facebook.drawee.drawable.ScaleTypeDrawable
import com.facebook.drawee.drawable.ScalingUtils

internal fun ScaleTypeDrawable.imageViewScaleType(): ImageView.ScaleType? {
    return when (scaleType) {
        ScalingUtils.ScaleType.CENTER -> ImageView.ScaleType.CENTER
        ScalingUtils.ScaleType.CENTER_CROP -> ImageView.ScaleType.CENTER_CROP
        ScalingUtils.ScaleType.CENTER_INSIDE -> ImageView.ScaleType.CENTER_INSIDE
        ScalingUtils.ScaleType.FIT_CENTER -> ImageView.ScaleType.FIT_CENTER
        ScalingUtils.ScaleType.FIT_START -> ImageView.ScaleType.FIT_START
        ScalingUtils.ScaleType.FIT_END -> ImageView.ScaleType.FIT_END
        ScalingUtils.ScaleType.FIT_XY -> ImageView.ScaleType.FIT_XY
        else -> null
    }
}

internal fun ArrayDrawable.getScaleTypeDrawable(): ScaleTypeDrawable? {
    for (i in 0 until numberOfLayers) {
        val drawable = getDrawableOrNull(i)
        if (drawable is ScaleTypeDrawable) return drawable
    }

    return null
}

internal fun ArrayDrawable.getDrawableOrNull(index: Int): Drawable? {
    return try {
        getDrawable(index)
    } catch (_: IllegalArgumentException) {
        null
    }
}

internal fun ForwardingDrawable.tryToExtractBitmap(resources: Resources): Bitmap? {
    // when there's no delegate to forward to, don't fall back to drawing this
    // ForwardingDrawable directly - some subclasses (e.g. Fresco's RootDrawable, via its
    // controller overlay) can still draw an independent live Drawable in that state, with
    // no recycled protection at all.
    return drawable?.tryToExtractBitmap(resources)
}

internal fun RoundedBitmapDrawable.tryToExtractBitmap(): Bitmap? {
    // if reflection itself fails (e.g. a future Fresco version renames/removes the field),
    // we have no information about whether a live bitmap exists - falling back to draw()
    // would read it unprotected, so return null instead of ever reaching that fallback.
    val reflectedBitmap = try {
        val field = RoundedBitmapDrawable::class.java.getDeclaredField("mBitmap")
        field.isAccessible = true
        field.get(this) as? Bitmap
    } catch (_: NoSuchFieldException) {
        return null
    } catch (_: IllegalAccessException) {
        return null
    } catch (_: Exception) {
        return null
    }

    // once we've identified the underlying bitmap, don't fall back to drawing this Drawable -
    // draw() reads that same bitmap internally, so it carries the same recycle risk safeCopy()
    // just ruled out. Only fall back when reflection succeeded and genuinely found no bitmap.
    if (reflectedBitmap != null) {
        return reflectedBitmap.safeCopy()
    }

    return toBitmapOrNull(
        intrinsicWidth,
        intrinsicHeight,
        Config.ARGB_8888
    )
}

internal fun BitmapDrawable.tryToExtractBitmap(resources: Resources): Bitmap? {
    if (bitmap != null) {
        // never hand out the live bitmap - its owner (e.g. Fresco) may recycle() it concurrently
        return bitmap.safeCopy()
    }

    if (constantState != null) {
        val copy = constantState?.newDrawable(resources)
        return (copy as? BitmapDrawable)?.bitmap?.safeCopy() ?: copy?.toBitmapOrNull(
            intrinsicWidth,
            intrinsicHeight,
            Config.ARGB_8888
        )
    }

    return null
}

internal fun ArrayDrawable.tryToExtractBitmap(resources: Resources): Bitmap? {
    for (index in 0 until numberOfLayers) {
        val drawable = getDrawableOrNull(index) ?: continue

        if (drawable is ScaleTypeDrawable) {
            return drawable.tryToExtractBitmap(resources)
        }
    }

    // no ScaleTypeDrawable layer found - falling back to drawing this ArrayDrawable would
    // composite its layers via draw(), which can read a direct BitmapDrawable layer's live
    // bitmap with no recycled protection. Safer to return null than risk that crash.
    return null
}

internal fun Drawable.tryToExtractBitmap(
    resources: Resources
): Bitmap? {
    when (this) {
        is ArrayDrawable -> {
            return tryToExtractBitmap(resources)
        }
        is ForwardingDrawable -> {
            return tryToExtractBitmap(resources)
        }
        is RoundedBitmapDrawable -> {
            return tryToExtractBitmap()
        }
        is BitmapDrawable -> {
            return tryToExtractBitmap(resources)
        }
        is VectorDrawable, is ShapeDrawable, is DrawerArrowDrawable -> {
            return toBitmapOrNull(
                intrinsicWidth,
                intrinsicHeight,
                Config.ARGB_8888
            )
        }
        else -> return null
    }
}

internal fun Drawable.toBitmapOrNull(
    width: Int = intrinsicWidth,
    height: Int = intrinsicHeight,
    config: Config? = null
): Bitmap? {
    if (this is BitmapDrawable && bitmap == null) {
        return null
    }
    return toBitmap(width, height, config)
}

internal fun Drawable.toBitmap(
    width: Int = intrinsicWidth,
    height: Int = intrinsicHeight,
    config: Config? = null
): Bitmap? {
    if (this is BitmapDrawable) {
        if (bitmap == null) {
            return Bitmap.createBitmap(width, height, config ?: Config.ARGB_8888)
        }
        // never read/return `bitmap` as-is - its owner may recycle() it concurrently. This
        // must never fall through to the draw() fallback below: draw() reads this same
        // `bitmap` internally with no recycled check, regardless of any config mismatch.
        val scaled = bitmap.safeScale(width, height) ?: return null
        return if (config == null || scaled.config == config) {
            scaled
        } else {
            // config differs from the source's own - convert on our own private `scaled`
            // result, never on the original bitmap.
            scaled.safeCopy(config)
        }
    }

    val bitmap = Bitmap.createBitmap(width, height, config ?: Config.ARGB_8888)
    setBounds(0, 0, width, height)
    draw(Canvas(bitmap))

    setBounds(bounds.left, bounds.top, bounds.right, bounds.bottom)
    return bitmap
}
