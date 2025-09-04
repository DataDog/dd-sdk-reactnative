/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
@file:Suppress("NonAsciiCharacters")

package com.datadog.reactnative

import com.datadog.tools.unit.GenericAssert.Companion.assertThat
import com.datadog.tools.unit.forge.BaseConfigurator
import com.facebook.react.bridge.CatalystInstance
import com.facebook.react.bridge.NativeArray
import com.facebook.react.bridge.ReactContext
import fr.xgouchet.elmyr.junit5.ForgeConfiguration
import fr.xgouchet.elmyr.junit5.ForgeExtension
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertDoesNotThrow
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.any
import org.mockito.kotlin.anyOrNull
import org.mockito.kotlin.argThat
import org.mockito.kotlin.argWhere
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.verifyNoInteractions
import org.mockito.kotlin.whenever
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
@ForgeConfiguration(BaseConfigurator::class)
internal class DdSdkSessionStartedListenerTest {

    @Mock
    lateinit var mockListenerCallback: (sessionId: String) -> Unit

    @Mock
    lateinit var mockReactContext: ReactContext

    @Mock
    lateinit var mockCatalystInstance: CatalystInstance

    @Mock
    lateinit var mockExceptionHandler: (error: Exception) -> Unit

    @BeforeEach
    fun `set up`() {
        DdSdkSessionStartedListener.invalidate()
    }

    @Test
    fun `𝕄 getInstance implements singleton correctly`() {
        // GIVEN
        val instance1 = DdSdkSessionStartedListener.getInstance()
        // WHEN
        val instance2 = DdSdkSessionStartedListener.getInstance()
        // THEN
        assertThat(instance1).isEqualTo(instance2)
    }

    @Test
    fun `𝕄 invalidate() invalidates previous instance`() {
        // GIVEN
        val instance1 = DdSdkSessionStartedListener.getInstance()
        // WHEN
        DdSdkSessionStartedListener.invalidate()
        // THEN
        assertThat(instance1).isNotEqualTo(DdSdkSessionStartedListener.getInstance())
    }

    @Test
    fun `𝕄 onSessionStarted internally catches exception if catalyst instance throws`() {
        // GIVEN
        whenever(mockReactContext.hasActiveReactInstance()).thenReturn(true)
        whenever(mockReactContext.catalystInstance).thenReturn(mockCatalystInstance)
        whenever(mockCatalystInstance.isDestroyed).thenReturn(false)
        whenever(mockReactContext.fabricUIManager).thenReturn(null)
        whenever(mockCatalystInstance.callFunction(any(), any(), anyOrNull()))
            .thenThrow(RuntimeException("TEST"))

        val instance = DdSdkSessionStartedListener.getInstance()
        instance.setReactContext(mockReactContext)
        instance.setExceptionHandler(mockExceptionHandler)
        instance.setIsNewArchitecture(false)

        val passedArgs = mutableListOf<String>()
        instance.setConvertToNativeArray {
            passedArgs.addAll(it)
            // We cannot mock or test NativeArray as it relies on native runtime SO library
            return@setConvertToNativeArray null
        }
        // WHEN
        assertDoesNotThrow {
            instance.onSessionStarted("TEST-SESSION-ID", false)
        }

        // THEN
        verify(mockExceptionHandler).invoke(
            argThat {
                this.message == "TEST"
            }
        )
    }

    @Test
    fun `𝕄 session ID event is delayed until context is available W { bridge }`() {
        // GIVEN
        whenever(mockReactContext.hasActiveReactInstance()).thenReturn(true)
        whenever(mockReactContext.catalystInstance).thenReturn(mockCatalystInstance)
        whenever(mockCatalystInstance.isDestroyed).thenReturn(false)
        whenever(mockReactContext.fabricUIManager).thenReturn(null)
        whenever(mockCatalystInstance.callFunction(any(), any(), anyOrNull()))
            .thenThrow(RuntimeException("TEST"))

        val instance = DdSdkSessionStartedListener.getInstance()

        val mockConvertToNativeArray = mock<(array: Array<String>) -> NativeArray?>()
        instance.setConvertToNativeArray(mockConvertToNativeArray)
        instance.setIsNewArchitecture(false)

        // WHEN
        instance.onSessionStarted("TEST-SESSION-ID", false)

        // THEN
        verifyNoInteractions(mockConvertToNativeArray)

        // WHEN
        instance.setReactContext(mockReactContext)

        // THEN
        verify(mockConvertToNativeArray).invoke(argWhere { it.first() == "TEST-SESSION-ID" })
    }
}
