/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.extensions

import android.content.res.Resources
import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import com.facebook.drawee.drawable.ArrayDrawable
import com.facebook.drawee.drawable.ForwardingDrawable
import com.facebook.drawee.drawable.RoundedBitmapDrawable
import fr.xgouchet.elmyr.junit5.ForgeExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
internal class ReactDrawablesExtTest {

    // region Bitmap#safeCopy

    @Test
    fun `M return a distinct private copy W safeCopy()`() {
        // Given
        val mockBitmap: Bitmap = mock()
        val mockCopiedBitmap: Bitmap = mock()
        whenever(mockBitmap.config).thenReturn(Bitmap.Config.ARGB_8888)
        whenever(mockBitmap.copy(Bitmap.Config.ARGB_8888, false)).thenReturn(mockCopiedBitmap)

        // When
        val result = mockBitmap.safeCopy()

        // Then
        assertThat(result).isSameAs(mockCopiedBitmap)
        assertThat(result).isNotSameAs(mockBitmap)
    }

    @Test
    fun `M default to ARGB_8888 W safeCopy() {bitmap has no config}`() {
        // Given
        val mockBitmap: Bitmap = mock()
        val mockCopiedBitmap: Bitmap = mock()
        whenever(mockBitmap.config).thenReturn(null)
        whenever(mockBitmap.copy(Bitmap.Config.ARGB_8888, false)).thenReturn(mockCopiedBitmap)

        // When
        val result = mockBitmap.safeCopy()

        // Then
        assertThat(result).isSameAs(mockCopiedBitmap)
    }

    @Test
    fun `M return null W safeCopy() {copy throws because the bitmap was already recycled}`() {
        // Given
        val mockBitmap: Bitmap = mock()
        whenever(mockBitmap.config).thenReturn(Bitmap.Config.ARGB_8888)
        whenever(mockBitmap.copy(any(), any())).thenThrow(
            IllegalStateException("Can't copy a recycled bitmap")
        )

        // When
        val result = mockBitmap.safeCopy()

        // Then
        // must never fall back to returning the original (possibly recycled) bitmap - that
        // would reintroduce the shared-reference race this function exists to close.
        assertThat(result).isNull()
    }

    // endregion

    // region Bitmap#safeScale

    @Test
    fun `M return the private copy directly W safeScale() {requested size matches}`() {
        // Given
        val mockBitmap: Bitmap = mock()
        val mockCopiedBitmap: Bitmap = mock()
        whenever(mockBitmap.config).thenReturn(Bitmap.Config.ARGB_8888)
        whenever(mockBitmap.copy(Bitmap.Config.ARGB_8888, false)).thenReturn(mockCopiedBitmap)
        whenever(mockCopiedBitmap.width).thenReturn(4)
        whenever(mockCopiedBitmap.height).thenReturn(4)

        // When
        val result = mockBitmap.safeScale(4, 4)

        // Then
        // must touch `this` exactly once (via safeCopy) - never call createScaledBitmap
        // directly on the original, externally-owned bitmap.
        assertThat(result).isSameAs(mockCopiedBitmap)
        assertThat(result).isNotSameAs(mockBitmap)
    }

    @Test
    fun `M return null W safeScale() {bitmap was recycled before it could be copied}`() {
        // Given
        val mockBitmap: Bitmap = mock()
        whenever(mockBitmap.config).thenReturn(Bitmap.Config.ARGB_8888)
        whenever(mockBitmap.copy(any(), any())).thenThrow(
            IllegalStateException("Can't copy a recycled bitmap")
        )

        // When
        val result = mockBitmap.safeScale(4, 4)

        // Then
        assertThat(result).isNull()
    }

    // endregion

    // region ForwardingDrawable#tryToExtractBitmap

    @Test
    fun `M return null W tryToExtractBitmap() {ForwardingDrawable, no delegate}`() {
        // Given
        // when there's no delegate to forward to, must never fall back to drawing this
        // ForwardingDrawable directly - some subclasses (e.g. Fresco's RootDrawable, via
        // its controller overlay) can still draw an independent live Drawable in that
        // state, with no recycled protection at all.
        val mockResources: Resources = mock()
        val mockDrawable: ForwardingDrawable = mock()
        whenever(mockDrawable.drawable).thenReturn(null)

        // When
        val result = mockDrawable.tryToExtractBitmap(mockResources)

        // Then
        assertThat(result).isNull()
    }

    // endregion

    // region BitmapDrawable#tryToExtractBitmap

    @Test
    fun `M return a private copy W tryToExtractBitmap() {BitmapDrawable with live bitmap}`() {
        // Given
        val mockResources: Resources = mock()
        val mockDrawable: BitmapDrawable = mock()
        val mockBitmap: Bitmap = mock()
        val mockCopiedBitmap: Bitmap = mock()
        whenever(mockDrawable.bitmap).thenReturn(mockBitmap)
        whenever(mockBitmap.config).thenReturn(Bitmap.Config.ARGB_8888)
        whenever(mockBitmap.copy(Bitmap.Config.ARGB_8888, false)).thenReturn(mockCopiedBitmap)

        // When
        val result = mockDrawable.tryToExtractBitmap(mockResources)

        // Then
        assertThat(result).isSameAs(mockCopiedBitmap)
        assertThat(result).isNotSameAs(mockBitmap)
    }

    @Test
    fun `M return null W tryToExtractBitmap() {live bitmap was recycled concurrently}`() {
        // Given
        val mockResources: Resources = mock()
        val mockDrawable: BitmapDrawable = mock()
        val mockBitmap: Bitmap = mock()
        whenever(mockDrawable.bitmap).thenReturn(mockBitmap)
        whenever(mockBitmap.config).thenReturn(Bitmap.Config.ARGB_8888)
        whenever(mockBitmap.copy(any(), any())).thenThrow(
            IllegalStateException("Can't copy a recycled bitmap")
        )

        // When
        val result = mockDrawable.tryToExtractBitmap(mockResources)

        // Then
        assertThat(result).isNull()
    }

    @Test
    fun `M return null W tryToExtractBitmap() {no live bitmap, no constantState}`() {
        // Given
        val mockResources: Resources = mock()
        val mockDrawable: BitmapDrawable = mock()
        whenever(mockDrawable.bitmap).thenReturn(null)
        whenever(mockDrawable.constantState).thenReturn(null)

        // When
        val result = mockDrawable.tryToExtractBitmap(mockResources)

        // Then
        assertThat(result).isNull()
    }

    @Test
    fun `M return a private copy W tryToExtractBitmap() {constantState bitmap, no live bitmap}`() {
        // Given
        val mockResources: Resources = mock()
        val mockDrawable: BitmapDrawable = mock()
        val mockConstantState: Drawable.ConstantState = mock()
        val mockNewDrawable: BitmapDrawable = mock()
        val mockBitmap: Bitmap = mock()
        val mockCopiedBitmap: Bitmap = mock()
        whenever(mockDrawable.bitmap).thenReturn(null)
        whenever(mockDrawable.constantState).thenReturn(mockConstantState)
        whenever(mockConstantState.newDrawable(mockResources)).thenReturn(mockNewDrawable)
        whenever(mockNewDrawable.bitmap).thenReturn(mockBitmap)
        whenever(mockBitmap.config).thenReturn(Bitmap.Config.ARGB_8888)
        whenever(mockBitmap.copy(Bitmap.Config.ARGB_8888, false)).thenReturn(mockCopiedBitmap)

        // When
        val result = mockDrawable.tryToExtractBitmap(mockResources)

        // Then
        assertThat(result).isSameAs(mockCopiedBitmap)
        assertThat(result).isNotSameAs(mockBitmap)
    }

    // endregion

    // region RoundedBitmapDrawable#tryToExtractBitmap

    @Test
    fun `M return a private copy W tryToExtractBitmap() {RoundedBitmapDrawable}`() {
        // Given
        val mockResources: Resources = mock()
        val mockBitmap: Bitmap = mock()
        val mockCopiedBitmap: Bitmap = mock()
        whenever(mockBitmap.width).thenReturn(4)
        whenever(mockBitmap.height).thenReturn(4)
        whenever(mockBitmap.config).thenReturn(Bitmap.Config.ARGB_8888)
        whenever(mockBitmap.copy(Bitmap.Config.ARGB_8888, false)).thenReturn(mockCopiedBitmap)
        val drawable = RoundedBitmapDrawable(mockResources, mockBitmap)

        // When
        val result = drawable.tryToExtractBitmap()

        // Then
        assertThat(result).isSameAs(mockCopiedBitmap)
        assertThat(result).isNotSameAs(mockBitmap)
    }

    @Test
    fun `M return null W tryToExtractBitmap() {RoundedBitmapDrawable bitmap was recycled}`() {
        // Given
        // this is the exact regression a prior review caught: once we've found the live
        // bitmap via reflection and confirmed it's unsafe (safeCopy fails), we must return
        // null immediately rather than falling back to draw() on that same confirmed-bad
        // bitmap.
        val mockResources: Resources = mock()
        val mockBitmap: Bitmap = mock()
        whenever(mockBitmap.width).thenReturn(4)
        whenever(mockBitmap.height).thenReturn(4)
        whenever(mockBitmap.config).thenReturn(Bitmap.Config.ARGB_8888)
        whenever(mockBitmap.copy(any(), any())).thenThrow(
            IllegalStateException("Can't copy a recycled bitmap")
        )
        val drawable = RoundedBitmapDrawable(mockResources, mockBitmap)

        // When
        val result = drawable.tryToExtractBitmap()

        // Then
        assertThat(result).isNull()
    }

    // endregion

    // region ArrayDrawable#tryToExtractBitmap

    @Test
    fun `M return null W tryToExtractBitmap() {ArrayDrawable, no ScaleTypeDrawable layer}`() {
        // Given
        // no layer is a ScaleTypeDrawable - must never fall back to drawing this
        // ArrayDrawable, which could read a direct BitmapDrawable layer's live bitmap with
        // no recycled protection at all.
        val mockResources: Resources = mock()
        val mockDrawable: ArrayDrawable = mock()
        val mockLayerBitmapDrawable: BitmapDrawable = mock()
        whenever(mockDrawable.numberOfLayers).thenReturn(1)
        whenever(mockDrawable.getDrawable(0)).thenReturn(mockLayerBitmapDrawable)

        // When
        val result = mockDrawable.tryToExtractBitmap(mockResources)

        // Then
        assertThat(result).isNull()
    }

    // endregion

    // region Drawable#toBitmap

    @Test
    fun `M convert config on the private copy W toBitmap() {config mismatch}`() {
        // Given
        val mockDrawable: BitmapDrawable = mock()
        val mockBitmap: Bitmap = mock()
        val mockScaledBitmap: Bitmap = mock()
        val mockConvertedBitmap: Bitmap = mock()
        whenever(mockDrawable.bitmap).thenReturn(mockBitmap)
        whenever(mockBitmap.width).thenReturn(4)
        whenever(mockBitmap.height).thenReturn(4)
        whenever(mockBitmap.config).thenReturn(Bitmap.Config.RGB_565)
        whenever(mockBitmap.copy(Bitmap.Config.RGB_565, false)).thenReturn(mockScaledBitmap)
        whenever(mockScaledBitmap.width).thenReturn(4)
        whenever(mockScaledBitmap.height).thenReturn(4)
        whenever(mockScaledBitmap.config).thenReturn(Bitmap.Config.RGB_565)
        whenever(mockScaledBitmap.copy(Bitmap.Config.ARGB_8888, false)).thenReturn(
            mockConvertedBitmap
        )

        // When
        val result = mockDrawable.toBitmap(width = 4, height = 4, config = Bitmap.Config.ARGB_8888)

        // Then
        assertThat(result).isSameAs(mockConvertedBitmap)
        // the config conversion must happen on the already-private `scaled` result, never
        // by copying the original live bitmap directly at the target config
        verify(mockBitmap, never()).copy(Bitmap.Config.ARGB_8888, false)
    }

    @Test
    fun `M return null W toBitmap() {bitmap recycled before config conversion}`() {
        // Given
        // must never fall through to the draw() fallback on a config mismatch - draw() would
        // read the same confirmed-bad live bitmap with no recycled protection at all.
        val mockDrawable: BitmapDrawable = mock()
        val mockBitmap: Bitmap = mock()
        whenever(mockDrawable.bitmap).thenReturn(mockBitmap)
        whenever(mockBitmap.width).thenReturn(4)
        whenever(mockBitmap.height).thenReturn(4)
        whenever(mockBitmap.config).thenReturn(Bitmap.Config.RGB_565)
        whenever(mockBitmap.copy(any(), any())).thenThrow(
            IllegalStateException("Can't copy a recycled bitmap")
        )

        // When
        val result = mockDrawable.toBitmap(width = 4, height = 4, config = Bitmap.Config.ARGB_8888)

        // Then
        assertThat(result).isNull()
    }

    // endregion
}
