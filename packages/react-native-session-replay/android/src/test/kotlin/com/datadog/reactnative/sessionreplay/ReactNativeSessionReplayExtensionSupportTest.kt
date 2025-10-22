/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import android.content.res.AssetManager
import com.datadog.android.api.InternalLogger
import com.datadog.reactnative.sessionreplay.mappers.ReactEditTextMapper
import com.datadog.reactnative.sessionreplay.mappers.ReactNativeImageViewMapper
import com.datadog.reactnative.sessionreplay.mappers.ReactTextMapper
import com.datadog.reactnative.sessionreplay.mappers.ReactViewGroupMapper
import com.datadog.reactnative.sessionreplay.mappers.ReactViewModalMapper
import com.datadog.reactnative.sessionreplay.mappers.SvgViewMapper
import com.datadog.reactnative.sessionreplay.utils.text.TextViewUtils
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerModule
import fr.xgouchet.elmyr.junit5.ForgeExtension
import java.io.IOException
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.any
import org.mockito.kotlin.doReturn
import org.mockito.kotlin.doThrow
import org.mockito.kotlin.whenever
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
internal class ReactNativeSessionReplayExtensionSupportTest {

    @Mock
    private lateinit var mockReactContext: ReactContext

    @Mock
    private lateinit var mockUiManagerModule: UIManagerModule

    @Mock
    private lateinit var mockLogger: InternalLogger

    @Mock
    private lateinit var mockAssetManager: AssetManager

    private lateinit var testedExtensionSupport: ReactNativeSessionReplayExtensionSupport

    @BeforeEach
    fun `set up`() {
        whenever(mockReactContext.getNativeModule(any<Class<NativeModule>>()))
            .doReturn(mockUiManagerModule)
        whenever(mockReactContext.assets).doReturn(mockAssetManager)
        whenever(mockAssetManager.open(any())).doThrow(IOException("No assets in test"))

        val internalCallback = ReactNativeInternalCallback(mockReactContext)
        val textViewUtils = TextViewUtils.create(mockReactContext, mockLogger)
        testedExtensionSupport = ReactNativeSessionReplayExtensionSupport(
            textViewUtils,
            internalCallback
        )
    }

    @Test
    fun `M get custom view mappers W getCustomViewMappers()`() {
        // When
        val customViewMappers = testedExtensionSupport.getCustomViewMappers()

        // Then
        assertThat(customViewMappers).hasSize(6)

        assertThat(customViewMappers[0].getUnsafeMapper())
            .isInstanceOf(ReactNativeImageViewMapper::class.java)

        assertThat(customViewMappers[1].getUnsafeMapper())
            .isInstanceOf(SvgViewMapper::class.java)

        assertThat(customViewMappers[2].getUnsafeMapper())
            .isInstanceOf(ReactViewGroupMapper::class.java)

        assertThat(customViewMappers[3].getUnsafeMapper())
            .isInstanceOf(ReactTextMapper::class.java)

        assertThat(customViewMappers[4].getUnsafeMapper())
            .isInstanceOf(ReactEditTextMapper::class.java)

        assertThat(customViewMappers[5].getUnsafeMapper())
            .isInstanceOf(ReactViewModalMapper::class.java)
    }
}
