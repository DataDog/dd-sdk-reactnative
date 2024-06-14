/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import com.datadog.android.api.InternalLogger
import com.datadog.reactnative.sessionreplay.mappers.ReactEditTextMapper
import com.datadog.reactnative.sessionreplay.mappers.ReactTextMapper
import com.datadog.reactnative.sessionreplay.mappers.ReactViewGroupMapper
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerModule
import fr.xgouchet.elmyr.junit5.ForgeExtension
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

    private lateinit var testedExtensionSupport: ReactNativeSessionReplayExtensionSupport

    @BeforeEach
    fun `set up`() {
        whenever(mockReactContext.getNativeModule(any<Class<NativeModule>>()))
            .doReturn(mockUiManagerModule)

        testedExtensionSupport = ReactNativeSessionReplayExtensionSupport(
            logger = mockLogger,
            reactContext = mockReactContext
        )
    }

    @Test
    fun `M get custom view mappers W getCustomViewMappers()`() {
        // When
        val customViewMappers = testedExtensionSupport.getCustomViewMappers()

        // Then
        assertThat(customViewMappers).hasSize(3)

        assertThat(customViewMappers[0].getUnsafeMapper())
            .isInstanceOf(ReactViewGroupMapper::class.java)

        assertThat(customViewMappers[1].getUnsafeMapper())
            .isInstanceOf(ReactTextMapper::class.java)

        assertThat(customViewMappers[2].getUnsafeMapper())
            .isInstanceOf(ReactEditTextMapper::class.java)
    }

    @Test
    fun `M return null W getUiManagerModule() { cannot get uiManagerModule }`() {
        // Given
        whenever(mockReactContext.getNativeModule(any<Class<NativeModule>>()))
            .thenThrow(IllegalStateException())

        // When
        val uiManagerModule = testedExtensionSupport.getUiManagerModule()

        // Then
        assertThat(uiManagerModule).isNull()
    }
}
