/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.Datadog
import com.datadog.android.api.SdkCore
import com.datadog.android.flags.Flags
import com.datadog.android.flags.FlagsConfiguration
import com.datadog.tools.unit.toReadableMap
import com.facebook.react.bridge.Promise
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.Mock
import org.mockito.Mockito
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.mock
import org.mockito.kotlin.same
import org.mockito.kotlin.verify

@Extensions(
    ExtendWith(MockitoExtension::class)
)
internal class DdFlagsImplementationTest {

    @Mock
    lateinit var mockPromise: Promise

    @Test
    fun `M not resolve SDK core W constructed`() {
        // Given
        val datadogMock = Mockito.mockStatic(Datadog::class.java)

        try {
            // When
            DdFlagsImplementation()

            // Then
            datadogMock.verifyNoInteractions()
        } finally {
            datadogMock.close()
        }
    }

    @Test
    fun `M resolve current SDK core W enable() called after construction`() {
        // Given
        val staleCore = mock<SdkCore>()
        val initializedCore = mock<SdkCore>()
        var currentCore = staleCore
        val configuration = mapOf("enabled" to true).toReadableMap()
        val datadogMock = Mockito.mockStatic(Datadog::class.java)
        val flagsMock = Mockito.mockStatic(Flags::class.java)

        try {
            datadogMock.`when`<SdkCore> { Datadog.getInstance() }.thenAnswer { currentCore }
            flagsMock.`when`<Unit> { Flags.enable(any<FlagsConfiguration>(), any()) }.then { }
            val testedImplementation = DdFlagsImplementation()
            currentCore = initializedCore

            // When
            testedImplementation.enable(configuration, mockPromise)

            // Then
            val configurationCaptor = argumentCaptor<FlagsConfiguration>()
            flagsMock.verify { Flags.enable(configurationCaptor.capture(), same(initializedCore)) }
            assertThat(configurationCaptor.firstValue.readField<Long>("assignmentRequestTimeoutMs"))
                .isEqualTo(1_000L)
            assertThat(configurationCaptor.firstValue.readField<Int>("assignmentRequestRetryCount"))
                .isEqualTo(1)
            verify(mockPromise).resolve(null)
        } finally {
            flagsMock.close()
            datadogMock.close()
        }
    }

    @Test
    fun `M forward assignment request configuration W enable() called`() {
        // Given
        val sdkCore = mock<SdkCore>()
        val configuration =
            mapOf(
                "enabled" to true,
                "assignmentRequestTimeoutMs" to 2_500,
                "assignmentRequestRetryCount" to 3
            ).toReadableMap()
        val flagsMock = Mockito.mockStatic(Flags::class.java)

        try {
            flagsMock.`when`<Unit> { Flags.enable(any<FlagsConfiguration>(), any()) }.then { }
            val testedImplementation = DdFlagsImplementation(sdkCore)

            // When
            testedImplementation.enable(configuration, mockPromise)

            // Then
            val configurationCaptor = argumentCaptor<FlagsConfiguration>()
            flagsMock.verify { Flags.enable(configurationCaptor.capture(), same(sdkCore)) }
            assertThat(configurationCaptor.firstValue.readField<Long>("assignmentRequestTimeoutMs"))
                .isEqualTo(2_500L)
            assertThat(configurationCaptor.firstValue.readField<Int>("assignmentRequestRetryCount"))
                .isEqualTo(3)
            verify(mockPromise).resolve(null)
        } finally {
            flagsMock.close()
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun <T> Any.readField(name: String): T =
        javaClass.getDeclaredField(name).run {
            isAccessible = true
            get(this@readField) as T
        }
}
