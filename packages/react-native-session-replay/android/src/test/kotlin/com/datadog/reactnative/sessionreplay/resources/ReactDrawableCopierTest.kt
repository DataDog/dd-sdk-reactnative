/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.resources

import android.content.res.Resources
import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import com.facebook.drawee.drawable.ArrayDrawable
import com.facebook.drawee.drawable.ForwardingDrawable
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
internal class ReactDrawableCopierTest {

    private val testedCopier = ReactDrawableCopier()

    @Test
    fun `M return a private bitmap copy W copy() {BitmapDrawable, non-null constantState}`() {
        // Given
        // a plain BitmapDrawable's constantState is non-null, which would previously route this
        // through DefaultDrawableCopier - and constantState#newDrawable() wraps the SAME
        // underlying Bitmap rather than copying it, so that path must never be taken for a
        // BitmapDrawable.
        val mockResources: Resources = mock()
        val mockDrawable: BitmapDrawable = mock()
        val mockBitmap: Bitmap = mock()
        val mockCopiedBitmap: Bitmap = mock()
        val mockConstantState: Drawable.ConstantState = mock()
        whenever(mockDrawable.bitmap).thenReturn(mockBitmap)
        whenever(mockDrawable.constantState).thenReturn(mockConstantState)
        whenever(mockBitmap.config).thenReturn(Bitmap.Config.ARGB_8888)
        whenever(mockBitmap.copy(Bitmap.Config.ARGB_8888, false)).thenReturn(mockCopiedBitmap)

        // When
        val result = testedCopier.copy(mockDrawable, mockResources)

        // Then
        // Note: this module's unit test environment leaves android.graphics.* classes as
        // no-op stubs (see build.gradle's `returnDefaultValues = true`), so a real
        // BitmapDrawable's own `.bitmap` getter can't be inspected here - what we CAN verify
        // is that the safe copy was actually produced and used, via the interaction below.
        assertThat(result).isInstanceOf(BitmapDrawable::class.java)
        verify(mockBitmap).copy(Bitmap.Config.ARGB_8888, false)
    }

    @Test
    fun `M return null W copy() {BitmapDrawable's live bitmap was recycled concurrently}`() {
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
        val result = testedCopier.copy(mockDrawable, mockResources)

        // Then
        assertThat(result).isNull()
    }

    @Test
    fun `M delegate to the default copier W copy() {non-BitmapDrawable with constantState}`() {
        // Given
        // ColorDrawable has no live shared pixel buffer to race on, so the constantState-based
        // default copier remains safe and expected here - unlike BitmapDrawable, it must NOT
        // be rerouted through tryToExtractBitmap.
        val mockResources: Resources = mock()
        val mockDrawable: ColorDrawable = mock()
        val mockConstantState: Drawable.ConstantState = mock()
        val mockNewDrawable: ColorDrawable = mock()
        whenever(mockDrawable.constantState).thenReturn(mockConstantState)
        whenever(mockConstantState.newDrawable(mockResources)).thenReturn(mockNewDrawable)

        // When
        val result = testedCopier.copy(mockDrawable, mockResources)

        // Then
        assertThat(result).isSameAs(mockNewDrawable)
    }

    @Test
    fun `M never use the default copier W copy() {ForwardingDrawable with constantState}`() {
        // Given
        // Fresco's own wrapper types don't override getConstantState() today, but this
        // guards against relying on that as the safety gate - even if constantState were
        // non-null, ForwardingDrawable must still go through tryToExtractBitmap, never the
        // aliasing default copier.
        val mockResources: Resources = mock()
        val mockDrawable: ForwardingDrawable = mock()
        val mockConstantState: Drawable.ConstantState = mock()
        val mockInnerDrawable: Drawable = mock()
        whenever(mockDrawable.constantState).thenReturn(mockConstantState)
        whenever(mockDrawable.drawable).thenReturn(mockInnerDrawable)

        // When
        testedCopier.copy(mockDrawable, mockResources)

        // Then
        verify(mockConstantState, never()).newDrawable(any())
    }

    @Test
    fun `M never use the default copier W copy() {ArrayDrawable with constantState}`() {
        // Given
        val mockResources: Resources = mock()
        val mockDrawable: ArrayDrawable = mock()
        val mockConstantState: Drawable.ConstantState = mock()
        whenever(mockDrawable.constantState).thenReturn(mockConstantState)
        whenever(mockDrawable.numberOfLayers).thenReturn(0)

        // When
        testedCopier.copy(mockDrawable, mockResources)

        // Then
        verify(mockConstantState, never()).newDrawable(any())
    }
}
