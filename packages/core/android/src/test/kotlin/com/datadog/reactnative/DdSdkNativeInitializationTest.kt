/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.pm.PackageInfo
import com.datadog.tools.unit.GenericAssert.Companion.assertThat
import com.datadog.tools.unit.forge.BaseConfigurator
import com.facebook.react.bridge.ReactApplicationContext
import fr.xgouchet.elmyr.annotation.Forgery
import fr.xgouchet.elmyr.junit5.ForgeConfiguration
import fr.xgouchet.elmyr.junit5.ForgeExtension
import java.net.InetSocketAddress
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.Answers
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.doReturn
import org.mockito.kotlin.isNull
import org.mockito.kotlin.whenever
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
@ForgeConfiguration(value = BaseConfigurator::class)
internal class DdSdkNativeInitializationTest {

    lateinit var testedNativeInitialization: DdSdkNativeInitialization

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    lateinit var mockContext: ReactApplicationContext

    @Forgery
    lateinit var mockPackageInfo: PackageInfo

    @Mock
    lateinit var mockDatadog: DatadogWrapper

    @Mock
    lateinit var mockJSONFileReader: JSONFileReader

    @BeforeEach
    fun `set up`() {
        whenever(mockContext.packageName) doReturn "packageName"
        whenever(
            mockContext.packageManager.getPackageInfo(
                "packageName",
                0
            )
        ) doReturn mockPackageInfo

        testedNativeInitialization = DdSdkNativeInitialization(
            mockContext,
            mockDatadog,
            mockJSONFileReader
        )
    }

    // region getConfigurationFromJSONFile

    @Test
    fun `𝕄 parse configuration file 𝕎 getConfigurationFromJSONFile() {file with all data}`() {
        // Given
        whenever(
            mockJSONFileReader.parseAssetsJSONFile(mockContext, "datadog-configuration.json")
        ) doReturn javaClass.getResource(
            "/input/complete-configuration.json"
        ).readText()

        // When
        val configuration = testedNativeInitialization.getConfigurationFromJSONFile()

        // Then
        assertThat(configuration.clientToken).isEqualTo("fake-client-token")
        assertThat(configuration.env).isEqualTo("fake-env")
        assertThat(configuration.applicationId).isEqualTo("fake-app-id")
        assertThat(configuration.nativeCrashReportEnabled).isEqualTo(true)
        assertThat(configuration.nativeLongTaskThresholdMs).isEqualTo(333.0)
        assertThat(configuration.longTaskThresholdMs).isEqualTo(44.0)
        assertThat(configuration.sampleRate).isEqualTo(80.0)
        assertThat(configuration.site).isEqualTo("US3")
        assertThat(configuration.trackingConsent).isEqualTo("NOT_GRANTED")
        assertThat(configuration.telemetrySampleRate).isEqualTo(60.0)
        assertThat(configuration.vitalsUpdateFrequency).isEqualTo("NEVER")
        assertThat(configuration.trackFrustrations).isEqualTo(false)
        assertThat(configuration.uploadFrequency).isEqualTo("FREQUENT")
        assertThat(configuration.batchSize).isEqualTo("SMALL")
        assertThat(configuration.trackBackgroundEvents).isEqualTo(true)
        assertThat(configuration.customEndpoints?.rum).isEqualTo("https://rum.example.com")
        assertThat(configuration.customEndpoints?.logs).isEqualTo("https://logs.example.com")
        assertThat(configuration.customEndpoints?.trace).isEqualTo("https://trace.example.com")
        assertThat(configuration.additionalConfig?.get("_dd.source")).isEqualTo("react-native")
        assertThat(configuration.additionalConfig?.get("_dd.sdk_version")).isEqualTo(SDK_VERSION)
        assertThat(configuration.configurationForTelemetry).isNull()
        assertThat(configuration.nativeViewTracking).isEqualTo(true)
        assertThat(configuration.nativeInteractionTracking).isEqualTo(true)
        assertThat(configuration.verbosity).isEqualTo("WARN")
        assertThat(configuration.serviceName).isEqualTo("my.app")
        assertThat(configuration.proxyConfig?.first?.type().toString()).isEqualTo("HTTP")
        val address = configuration.proxyConfig?.first?.address()
        assertThat(address).isNotNull
        (address as InetSocketAddress).let {
            assertThat(it.port).isEqualTo(4444)
            assertThat(it.address.hostAddress).isEqualTo("1.1.1.1")
        }
        assertThat(configuration.proxyConfig?.second?.username).isEqualTo("proxyusername")
        assertThat(configuration.proxyConfig?.second?.password).isEqualTo("proxypassword")
        assertThat(configuration.firstPartyHosts?.get("example.com").toString()).isEqualTo(
            "[B3MULTI, TRACECONTEXT]"
        )
    }

    @Test
    fun `𝕄 add defaults to config 𝕎 getConfigurationFromJSONFile() {file with minimal data}`() {
        // Given
        whenever(
            mockJSONFileReader.parseAssetsJSONFile(mockContext, "datadog-configuration.json")
        ) doReturn javaClass.getResource(
            "/input/minimal-configuration.json"
        ).readText()

        // When
        val configuration = testedNativeInitialization.getConfigurationFromJSONFile()

        // Then
        assertThat(configuration.clientToken).isEqualTo("fake-client-token")
        assertThat(configuration.env).isEqualTo("fake-env")
        assertThat(configuration.applicationId).isEqualTo("fake-app-id")
        assertThat(configuration.nativeCrashReportEnabled).isEqualTo(false)
        assertThat(configuration.nativeLongTaskThresholdMs).isEqualTo(200.0)
        assertThat(configuration.longTaskThresholdMs).isEqualTo(0.0)
        assertThat(configuration.sampleRate).isEqualTo(100.0)
        assertThat(configuration.site).isEqualTo("US1")
        assertThat(configuration.trackingConsent).isEqualTo("GRANTED")
        assertThat(configuration.telemetrySampleRate).isEqualTo(20.0)
        assertThat(configuration.vitalsUpdateFrequency).isEqualTo("AVERAGE")
        assertThat(configuration.trackFrustrations).isEqualTo(true)
        assertThat(configuration.uploadFrequency).isEqualTo("AVERAGE")
        assertThat(configuration.batchSize).isEqualTo("MEDIUM")
        assertThat(configuration.trackBackgroundEvents).isEqualTo(false)
        assertThat(configuration.customEndpoints).isNull()
        assertThat(configuration.additionalConfig?.get("_dd.source")).isEqualTo("react-native")
        assertThat(configuration.additionalConfig?.get("_dd.sdk_version")).isEqualTo(SDK_VERSION)
        assertThat(configuration.configurationForTelemetry).isNull()
        assertThat(configuration.nativeViewTracking).isEqualTo(false)
        assertThat(configuration.nativeInteractionTracking).isEqualTo(false)
        assertThat(configuration.verbosity).isNull()
        assertThat(configuration.serviceName).isNull()
        assertThat(configuration.proxyConfig).isNull()
        assertThat(configuration.firstPartyHosts).isNull()
    }

    @Test
    fun `𝕄 throw error 𝕎 getConfigurationFromJSONFile() {incorrect file}`() {
        // Given
        whenever(
            mockJSONFileReader.parseAssetsJSONFile(mockContext, "datadog-configuration.json")
        ) doReturn javaClass.getResource(
            "/input/malformed-configuration.json"
        ).readText()

        // Then
        assertThrows<BadConfigurationException> {
            testedNativeInitialization.getConfigurationFromJSONFile()
        }
    }

    // endregion
}
