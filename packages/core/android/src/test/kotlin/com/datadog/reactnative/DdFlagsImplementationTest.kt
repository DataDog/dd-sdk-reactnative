/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.Datadog
import com.datadog.android.api.SdkCore
import com.datadog.android.flags.Flags
import com.datadog.android.flags.FlagsClient
import com.datadog.android.flags.FlagsConfiguration
import com.datadog.android.flags._FlagsInternalProxy
import com.datadog.android.flags.model.EvaluationContext
import com.datadog.android.flags.model.UnparsedFlag
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
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.same
import org.mockito.kotlin.verify
import org.mockito.kotlin.verifyNoInteractions
import org.mockito.kotlin.verifyNoMoreInteractions
import org.mockito.kotlin.whenever

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
            val flagsConfig = argumentCaptor<FlagsConfiguration>()
            flagsMock.verify { Flags.enable(flagsConfig.capture(), same(initializedCore)) }
            assertThat(flagsConfig.firstValue).extracting("customEvaluationEndpoint").isNull()
            verify(mockPromise).resolve(null)
        } finally {
            flagsMock.close()
            datadogMock.close()
        }
    }

    @Test
    fun `M forward separate endpoint overrides W enable()`() {
        val core = mock<SdkCore>()
        val configuration = mapOf(
            "enabled" to true,
            "customFlagsEndpoint" to "https://flags.example.com",
            "customExposureEndpoint" to "https://exposure.example.com",
            "customEvaluationEndpoint" to "https://evaluation.example.com"
        ).toReadableMap()

        Mockito.mockStatic(Flags::class.java).use { flagsMock ->
            DdFlagsImplementation(core).enable(configuration, mockPromise)

            val flagsConfig = argumentCaptor<FlagsConfiguration>()
            flagsMock.verify { Flags.enable(flagsConfig.capture(), same(core)) }
            assertThat(flagsConfig.firstValue).extracting("customFlagEndpoint")
                .isEqualTo("https://flags.example.com/precompute-assignments")
            assertThat(flagsConfig.firstValue).extracting("customExposureEndpoint")
                .isEqualTo("https://exposure.example.com/api/v2/exposures")
            assertThat(flagsConfig.firstValue).extracting("customEvaluationEndpoint")
                .isEqualTo("https://evaluation.example.com/api/v2/flagevaluation")
            verify(mockPromise).resolve(null)
        }
    }

    @Test
    fun `M preserve other endpoints W enable() with only an evaluation override`() {
        val core = mock<SdkCore>()
        val configuration = mapOf(
            "enabled" to true,
            "customEvaluationEndpoint" to "https://evaluation.example.com/proxy"
        ).toReadableMap()

        Mockito.mockStatic(Flags::class.java).use { flagsMock ->
            DdFlagsImplementation(core).enable(configuration, mockPromise)

            val flagsConfig = argumentCaptor<FlagsConfiguration>()
            flagsMock.verify { Flags.enable(flagsConfig.capture(), same(core)) }
            assertThat(flagsConfig.firstValue).extracting("customEvaluationEndpoint")
                .isEqualTo("https://evaluation.example.com/proxy/api/v2/flagevaluation")
            assertThat(flagsConfig.firstValue).extracting("customFlagEndpoint").isNull()
            assertThat(flagsConfig.firstValue).extracting("customExposureEndpoint").isNull()
            verify(mockPromise).resolve(null)
        }
    }

    @Test
    fun `M omit null attributes W buildEvaluationContext()`() {
        // Given
        val attributes = mapOf(
            "country" to "US",
            "age" to 42,
            "size" to null
        ).toReadableMap()

        // When
        val context = buildEvaluationContext("user", attributes)

        // Then
        assertThat(context.targetingKey).isEqualTo("user")
        assertThat(context.attributes).containsOnlyKeys("country", "age")
        assertThat(context.attributes["country"]).isEqualTo("US")
    }

    @Test
    fun `M only track exposure W trackExposure()`() {
        val client = mock<FlagsClient>()
        Mockito.mockConstruction(FlagsClient.Builder::class.java) { builder, _ ->
            whenever(builder.build()).thenReturn(client)
        }.use {
            Mockito.mockConstruction(_FlagsInternalProxy::class.java).use { proxies ->
                DdFlagsImplementation(mock()).trackExposure(
                    "tracking",
                    "flag",
                    rawFlag(),
                    "user",
                    mapOf("country" to "US").toReadableMap(),
                    mockPromise
                )
                val proxy = proxies.constructed().single()
                val flag = argumentCaptor<UnparsedFlag>()
                val context = argumentCaptor<EvaluationContext>()
                verify(proxy).trackFlagExposure(eq("flag"), flag.capture(), context.capture())
                assertThat(flag.firstValue.serialId).isEqualTo(9_007_199_254_740_993L)
                assertThat(flag.firstValue.variationKey).isEqualTo("on")
                assertThat(context.firstValue.targetingKey).isEqualTo("user")
                assertThat(context.firstValue.attributes).containsEntry("country", "US")
                verifyNoMoreInteractions(proxy)
                verifyNoInteractions(client)
                verify(mockPromise).resolve(null)
            }
        }
    }

    @Test
    fun `M only track evaluation W trackEvaluationEvent()`() {
        val client = mock<FlagsClient>()
        Mockito.mockConstruction(FlagsClient.Builder::class.java) { builder, _ ->
            whenever(builder.build()).thenReturn(client)
        }.use {
            Mockito.mockConstruction(_FlagsInternalProxy::class.java).use { proxies ->
                DdFlagsImplementation(mock()).trackEvaluationEvent(
                    "tracking",
                    "flag",
                    rawFlag(),
                    "user",
                    mapOf("country" to "US").toReadableMap(),
                    null,
                    mockPromise
                )
                val proxy = proxies.constructed().single()
                val flag = argumentCaptor<UnparsedFlag>()
                val context = argumentCaptor<EvaluationContext>()
                verify(proxy).trackFlagEvaluationEvent(
                    eq("flag"),
                    flag.capture(),
                    context.capture(),
                    eq(null)
                )
                assertThat(flag.firstValue.allocationKey).isEqualTo("allocation")
                assertThat(context.firstValue.targetingKey).isEqualTo("user")
                verifyNoMoreInteractions(proxy)
                verifyNoInteractions(client)
                verify(mockPromise).resolve(null)
            }
        }
    }

    @Test
    fun `M forward missing assignment and error W trackEvaluationEvent()`() {
        val client = mock<FlagsClient>()
        Mockito.mockConstruction(FlagsClient.Builder::class.java) { builder, _ ->
            whenever(builder.build()).thenReturn(client)
        }.use {
            Mockito.mockConstruction(_FlagsInternalProxy::class.java).use { proxies ->
                DdFlagsImplementation(mock()).trackEvaluationEvent(
                    "tracking",
                    "missing",
                    null,
                    "user",
                    emptyMap<String, Any>().toReadableMap(),
                    "FLAG_NOT_FOUND",
                    mockPromise
                )
                val proxy = proxies.constructed().single()
                verify(proxy).trackFlagEvaluationEvent(
                    eq("missing"),
                    eq(null),
                    any(),
                    eq("FLAG_NOT_FOUND")
                )
                verifyNoMoreInteractions(proxy)
                verifyNoInteractions(client)
                verify(mockPromise).resolve(null)
            }
        }
    }

    private fun rawFlag() = mapOf(
        "allocationKey" to "allocation",
        "variationKey" to "on",
        "variationType" to "boolean",
        "variationValue" to "true",
        "reason" to "TARGETING_MATCH",
        "doLog" to true,
        "serialId" to "9007199254740993"
    ).toReadableMap()
}
