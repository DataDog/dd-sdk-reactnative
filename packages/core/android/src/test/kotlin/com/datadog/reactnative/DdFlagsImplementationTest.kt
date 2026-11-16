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
import com.datadog.tools.unit.toReadableMapDeep
import com.facebook.react.bridge.Promise
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.Mock
import org.mockito.Mockito
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.any
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
            flagsMock.verify { Flags.enable(any<FlagsConfiguration>(), same(initializedCore)) }
            verify(mockPromise).resolve(null)
        } finally {
            flagsMock.close()
            datadogMock.close()
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
    fun `M pass flag selection unchanged W enable() { tags and key patterns }`() {
        // When
        val configuration = enableAndCaptureConfiguration(
            mapOf(
                "enabled" to true,
                "flagSelection" to mapOf(
                    "tags" to listOf(" team:checkout ", "team:checkout", ""),
                    "keyPatterns" to listOf("checkout-*")
                )
            )
        )

        // Then
        assertThat(configuration).isEqualTo(
            defaultConfigurationBuilder()
                .flagSelection(listOf(" team:checkout ", "team:checkout", ""), listOf("checkout-*"))
                .build()
        )
    }

    @Test
    fun `M pass only the lists that are set W enable() { key patterns only }`() {
        // When
        val configuration = enableAndCaptureConfiguration(
            mapOf(
                "enabled" to true,
                "flagSelection" to mapOf("keyPatterns" to listOf("checkout-*"))
            )
        )

        // Then
        assertThat(configuration).isEqualTo(
            defaultConfigurationBuilder().flagSelection(null, listOf("checkout-*")).build()
        )
    }

    @Test
    fun `M not set flag selection W enable() { no flag selection }`() {
        // When
        val configuration = enableAndCaptureConfiguration(mapOf("enabled" to true))

        // Then
        assertThat(configuration).isEqualTo(defaultConfigurationBuilder().build())
        assertThat(configuration).isNotEqualTo(
            defaultConfigurationBuilder().flagSelection(emptyList(), emptyList()).build()
        )
    }

    @Test
    fun `M not set flag selection W enable() { flag selection is not a map }`() {
        // When
        val configuration = enableAndCaptureConfiguration(
            mapOf(
                "enabled" to true,
                "flagSelection" to listOf("team:checkout")
            )
        )

        // Then
        assertThat(configuration).isEqualTo(defaultConfigurationBuilder().build())
    }

    @Test
    fun `M drop non-string values W enable() { mixed values }`() {
        // When
        val configuration = enableAndCaptureConfiguration(
            mapOf(
                "enabled" to true,
                "flagSelection" to mapOf(
                    "tags" to listOf("team:checkout", null, 42),
                    "keyPatterns" to "checkout-*"
                )
            )
        )

        // Then
        assertThat(configuration).isEqualTo(
            defaultConfigurationBuilder().flagSelection(listOf("team:checkout"), null).build()
        )
    }

    @Test
    fun `M keep surrogates unchanged W enable() { surrogate pair and unpaired surrogate }`() {
        // The SDK reports an unpaired surrogate as malformed_selection; the bridge passes it as is.
        val surrogatePair = "team:😀"
        val unpairedSurrogate = "checkout-\uD800"

        // When
        val configuration = enableAndCaptureConfiguration(
            mapOf(
                "enabled" to true,
                "flagSelection" to mapOf(
                    "tags" to listOf(surrogatePair),
                    "keyPatterns" to listOf(unpairedSurrogate)
                )
            )
        )

        // Then
        assertThat(configuration).isEqualTo(
            defaultConfigurationBuilder()
                .flagSelection(listOf(surrogatePair), listOf(unpairedSurrogate))
                .build()
        )
    }

    private fun defaultConfigurationBuilder(): FlagsConfiguration.Builder =
        FlagsConfiguration
            .Builder()
            .gracefulModeEnabled(true)
            .trackExposures(true)
            .rumIntegrationEnabled(true)

    private fun enableAndCaptureConfiguration(
        configuration: Map<String, Any?>
    ): FlagsConfiguration? {
        var captured: FlagsConfiguration? = null
        val flagsMock = Mockito.mockStatic(Flags::class.java)

        try {
            flagsMock.`when`<Unit> { Flags.enable(any<FlagsConfiguration>(), any()) }.thenAnswer {
                captured = it.getArgument(0)
                null
            }

            DdFlagsImplementation(mock<SdkCore>())
                .enable(configuration.toReadableMapDeep(), mockPromise)

            verify(mockPromise).resolve(null)
        } finally {
            flagsMock.close()
        }
        return captured
    }
}
