/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

internal class NativeFfeConfigurationFetcherTest {
    private val fakeTransport = FakeTransport()
    private val testedFetcher = NativeFfeConfigurationFetcher(fakeTransport) { FETCHED_AT_MS }
    private val testedCore = NativeFfeCore()

    @Test
    fun `M fetch rules configuration W http 200`() {
        // Given
        testedCore.setConfiguration(
            testedCore.configurationFromString(rulesConfigurationWire).toMap()
        )
        fakeTransport.response = NativeFfeHttpResponse(
            statusCode = 200,
            headers = mapOf("ETag" to "rules-v2"),
            body = canonicalUfcConfig,
        )

        // When
        val fetchedConfiguration = testedCore.fetchConfiguration(
            "rules",
            mapOf(
                "endpoint" to "https://config.example.test/flags?existing=1",
                "clientToken" to "client-token",
                "sdkKey" to "sdk-key",
                "site" to "datadoghq.com",
                "headers" to mapOf("X-Test" to "true"),
                "flagQueryParams" to mapOf("project" to "rn"),
                "previousConfigurationWire" to rulesConfigurationWire,
            ),
            testedFetcher,
        )

        // Then
        val request = fakeTransport.request
        assertThat(fetchedConfiguration.kind).isEqualTo("rules")
        assertThat(fetchedConfiguration.etag).isEqualTo("rules-v2")
        assertThat(request?.method).isEqualTo("GET")
        assertThat(request?.url)
            .startsWith("https://config.example.test/flags?existing=1&")
            .contains("kind=rules")
            .contains("project=rn")
        assertThat(request?.headers)
            .containsEntry("Accept", "application/json")
            .containsEntry("DD-Client-Token", "client-token")
            .containsEntry("DD-SDK-Key", "sdk-key")
            .containsEntry("DD-Site", "datadoghq.com")
            .containsEntry("If-None-Match", "ffe-system-test-data")
            .containsEntry("X-Test", "true")
        assertThat(testedCore.debugState())
            .containsEntry("activeEtag", "ffe-system-test-data")
            .containsEntry("fetchCount", 1)
        @Suppress("UNCHECKED_CAST")
        val lastFetchRequest = testedCore.debugState()["lastFetchRequest"] as Map<String, Any?>
        assertThat(lastFetchRequest)
            .containsEntry("url", request?.url)
            .containsEntry("method", "GET")
            .containsEntry("statusCode", 200)
    }

    @Test
    fun `M return previous configuration W http 304`() {
        // Given
        fakeTransport.response = NativeFfeHttpResponse(
            statusCode = 304,
            headers = emptyMap(),
            body = "",
        )

        // When
        val fetchedConfiguration = testedCore.fetchConfiguration(
            "rules",
            mapOf(
                "endpoint" to "https://config.example.test/flags",
                "previousConfigurationWire" to rulesConfigurationWire,
            ),
            testedFetcher,
        )

        // Then
        assertThat(fetchedConfiguration.kind).isEqualTo("rules")
        assertThat(fetchedConfiguration.etag).isEqualTo("ffe-system-test-data")
        assertThat(fetchedConfiguration.wire).isEqualTo(rulesConfigurationWire)
        assertThat(testedCore.debugState())
            .containsEntry("fetchCount", 1)
            .doesNotContainKey("activeConfigurationKind")
    }

    @Test
    fun `M fetch precomputed configuration W evaluation context`() {
        // Given
        fakeTransport.response = NativeFfeHttpResponse(
            statusCode = 200,
            headers = mapOf("etag" to "precomputed-v1"),
            body = """{"flags":{}}""",
        )

        // When
        val fetchedConfiguration = testedCore.fetchConfiguration(
            "precomputed",
            mapOf(
                "endpoint" to "https://config.example.test/precomputed",
                "evaluationContext" to mapOf(
                    "targetingKey" to "user-123",
                    "attributes" to mapOf("plan" to "pro"),
                ),
            ),
            testedFetcher,
        )

        // Then
        assertThat(fetchedConfiguration.kind).isEqualTo("precomputed")
        assertThat(fetchedConfiguration.etag).isEqualTo("precomputed-v1")
        assertThat(fakeTransport.request?.url)
            .contains("kind=precomputed")
            .contains("evaluationContext=")
    }

    private class FakeTransport : NativeFfeConfigurationTransport {
        var request: NativeFfeHttpRequest? = null
        lateinit var response: NativeFfeHttpResponse

        override fun execute(request: NativeFfeHttpRequest): NativeFfeHttpResponse {
            this.request = request
            return response
        }
    }

    private companion object {
        const val FETCHED_AT_MS = 1780000000000L

        val rulesConfigurationWire: String by lazy {
            readNativeFfeFixture(
                NativeFfeConfigurationFetcherTest::class.java,
                "native-ffe/rules-configuration-wire.json"
            )
        }

        val canonicalUfcConfig: String by lazy {
            readNativeFfeFixture(
                NativeFfeConfigurationFetcherTest::class.java,
                "ffe-system-test-data/ufc-config.json"
            )
        }
    }
}
