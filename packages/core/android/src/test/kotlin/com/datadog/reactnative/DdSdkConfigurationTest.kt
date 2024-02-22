/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.tools.unit.GenericAssert.Companion.assertThat
import com.datadog.tools.unit.forge.BaseConfigurator
import com.datadog.tools.unit.toReadableMap
import fr.xgouchet.elmyr.Forge
import fr.xgouchet.elmyr.annotation.Forgery
import fr.xgouchet.elmyr.junit5.ForgeConfiguration
import fr.xgouchet.elmyr.junit5.ForgeExtension
import java.net.InetSocketAddress
import java.net.Proxy
import java.util.Locale
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
@ForgeConfiguration(BaseConfigurator::class)
internal class DdSdkConfigurationTest {
    @Test
    fun `𝕄 not build proxy config 𝕎 no proxy config specified`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val proxyConfig = mapOf<Any, Any>().toReadableMap()

        // When
        val proxy = proxyConfig.asProxyConfig()

        // Then
        assertThat(proxy).isNull()
    }

    @Test
    fun `𝕄 not build proxy config 𝕎 buildProxyConfiguration() { type is missing }`(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        // Given
        val proxyConfig = mapOf(
            "address" to "1.1.1.1",
            "port" to forge.anInt(min = 0, max = 65536)
        ).toReadableMap()

        // When
        val proxy = proxyConfig.asProxyConfig()

        // Then
        assertThat(proxy).isNull()
    }

    @Test
    fun `𝕄 not build proxy config 𝕎 buildProxyConfiguration() { wrong type is used } `(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        // Given
        val proxyType = forge.anAlphabeticalString()
        assumeTrue(proxyType.lowercase(Locale.US) !in arrayOf("http", "https", "socks"))

        val proxyConfig = mapOf(
            "type" to proxyType,
            "address" to "1.1.1.1",
            "port" to forge.anInt(min = 0, max = 65536)
        ).toReadableMap()

        // When
        val proxy = proxyConfig.asProxyConfig()

        // Then
        assertThat(proxy).isNull()
    }

    @Test
    fun `𝕄 not build proxy config 𝕎 buildProxyConfiguration() { address is missing }`(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        // Given
        val proxyConfig = mapOf(
            "type" to forge.anElementFrom("http", "https", "socks"),
            "port" to forge.anInt(min = 0, max = 65536)
        ).toReadableMap()

        // When
        val proxy = proxyConfig.asProxyConfig()

        // Then
        assertThat(proxy).isNull()
    }

    @Test
    fun `𝕄 not build proxy config 𝕎 buildProxyConfiguration() { port is missing }`(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        // Given
        val proxyConfig = mapOf(
            "type" to forge.anElementFrom("http", "https", "socks"),
            "address" to "1.1.1.1"
        ).toReadableMap()

        // When
        val proxy = proxyConfig.asProxyConfig()

        // Then
        assertThat(proxy).isNull()
    }

    @Test
    fun `𝕄 build proxy configuration 𝕎 buildProxyConfiguration() { no credentials }`(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        // Given
        val proxyType = forge.anElementFrom("http", "https", "socks")

        val proxyConfig = mapOf(
            "type" to proxyType,
            "address" to "1.1.1.1",
            "port" to forge.anInt(min = 0, max = 65536)
        ).toReadableMap()

        // When
        val proxy = proxyConfig.asProxyConfig()

        // Then
        assertThat(proxy?.first?.type()).matches {
            when (proxyType) {
                "http", "https" -> it == Proxy.Type.HTTP
                else -> it == Proxy.Type.SOCKS
            }
        }

        assertThat(proxy?.first?.address()).isNotNull
        assertThat(proxy?.second).isNull()
    }

    @Test
    fun `𝕄 build proxy configuration+authenticator 𝕎 buildProxyConfiguration() { +credentials }`(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        // Given
        val proxyType = forge.anElementFrom("http", "https", "socks")
        val proxyUsername = forge.anAlphabeticalString()
        val proxyPassword = forge.anAlphabeticalString()
        val proxyPort = forge.anInt(min = 0, max = 65536)
        val proxyAddress = "1.1.1.1"

        val proxyConfig = mapOf(
            "type" to proxyType,
            "address" to proxyAddress,
            "port" to proxyPort,
            "username" to proxyUsername,
            "password" to proxyPassword
        ).toReadableMap()

        // When
        val proxy = proxyConfig.asProxyConfig()

        // Then
        assertThat(proxy?.first?.type()).matches {
            when (proxyType) {
                "http", "https" -> it == Proxy.Type.HTTP
                else -> it == Proxy.Type.SOCKS
            }
        }

        assertThat(proxy?.first?.address()).isNotNull
        assertThat(proxy?.first?.address()).isInstanceOf(InetSocketAddress::class.java)
        (proxy?.first?.address() as InetSocketAddress).let {
            assertThat(it.port).isEqualTo(proxyPort)
            assertThat(it.address.hostAddress).isEqualTo(proxyAddress)
        }

        assertThat(proxy?.second).isNotNull
        assertThat(proxy?.second?.username).isEqualTo(proxyUsername)
        assertThat(proxy?.second?.password).isEqualTo(proxyPassword)
    }
}
