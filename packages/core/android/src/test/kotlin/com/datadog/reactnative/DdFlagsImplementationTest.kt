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
import org.mockito.kotlin.times
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
    fun `M rebuild clients W enable() follows tracking`() {
        // Given
        val core = mock<SdkCore>()
        val fallback = mock<FlagsClient>()
        val enabledClient = mock<FlagsClient>()
        var enabled = false
        val proxyClients = mutableListOf<Any?>()
        val configuration = mapOf("enabled" to true).toReadableMap()
        val attributes = mapOf("country" to "US").toReadableMap()
        Mockito.mockStatic(Flags::class.java).use { flagsMock ->
            flagsMock.`when`<Unit> { Flags.enable(any<FlagsConfiguration>(), same(core)) }.then {
                enabled = true
                null
            }
            Mockito.mockConstruction(FlagsClient.Builder::class.java) { builder, _ ->
                whenever(builder.build()).thenAnswer { if (enabled) enabledClient else fallback }
            }.use { builders ->
                Mockito.mockConstruction(_FlagsInternalProxy::class.java) { _, context ->
                    proxyClients.add(context.arguments()[0])
                }.use { proxies ->
                    val testedImplementation = DdFlagsImplementation(core)

                    // When
                    testedImplementation.trackExposure(
                        "default",
                        "flag",
                        rawFlag(),
                        "user",
                        attributes,
                        mockPromise
                    )
                    testedImplementation.enable(configuration, mockPromise)
                    testedImplementation.trackExposure(
                        "default",
                        "flag",
                        rawFlag(),
                        "user",
                        attributes,
                        mockPromise
                    )
                    testedImplementation.trackRumEvaluation(
                        "default",
                        "flag",
                        "on",
                        "user",
                        attributes,
                        mockPromise
                    )
                    testedImplementation.trackEvaluation(
                        "default",
                        "flag",
                        rawFlag(),
                        "user",
                        attributes,
                        mockPromise
                    )

                    // Then
                    assertThat(builders.constructed()).hasSize(2)
                    assertThat(proxyClients).containsExactly(
                        fallback,
                        enabledClient,
                        enabledClient,
                        enabledClient
                    )
                    verify(proxies.constructed()[0]).trackFlagExposure(eq("flag"), any(), any())
                    verify(proxies.constructed()[1]).trackFlagExposure(eq("flag"), any(), any())
                    verify(proxies.constructed()[2]).trackFlagRumEvaluation(
                        eq("flag"),
                        eq("on"),
                        any()
                    )
                    verify(proxies.constructed()[3]).trackFlagSnapshotEvaluation(
                        eq("flag"),
                        any(),
                        any()
                    )
                    verify(mockPromise, times(5)).resolve(null)
                }
            }
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
                    mapOf(
                        "allocationKey" to "allocation",
                        "variationKey" to "on",
                        "doLog" to true,
                        "serialId" to "9007199254740993"
                    ).toReadableMap(),
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
    fun `M only track RUM W trackRumEvaluation()`() {
        // Given
        val client = mock<FlagsClient>()
        Mockito.mockConstruction(FlagsClient.Builder::class.java) { builder, _ ->
            whenever(builder.build()).thenReturn(client)
        }.use {
            Mockito.mockConstruction(_FlagsInternalProxy::class.java).use { proxies ->
                // When
                DdFlagsImplementation(mock()).trackRumEvaluation(
                    "tracking",
                    "flag",
                    "on",
                    "user",
                    mapOf("country" to "US").toReadableMap(),
                    mockPromise
                )

                // Then
                val proxy = proxies.constructed().single()
                val context = argumentCaptor<EvaluationContext>()
                verify(proxy).trackFlagRumEvaluation(eq("flag"), eq("on"), context.capture())
                assertThat(context.firstValue.targetingKey).isEqualTo("user")
                assertThat(context.firstValue.attributes).containsEntry("country", "US")
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
