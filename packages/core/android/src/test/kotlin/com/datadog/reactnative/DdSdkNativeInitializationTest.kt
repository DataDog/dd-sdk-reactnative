/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.pm.PackageInfo
import com.datadog.android.Datadog
import com.datadog.android.api.SdkCore
import com.datadog.android.api.feature.Feature
import com.datadog.android.api.feature.FeatureScope
import com.datadog.android.api.feature.FeatureSdkCore
import com.datadog.android.rum.Rum
import com.datadog.android.rum.RumMonitor
import com.datadog.android.trace.Trace
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
import org.mockito.Mockito.mockStatic
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.doReturn
import org.mockito.kotlin.eq
import org.mockito.kotlin.isNull
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
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
    lateinit var mockDdTelemetry: DdTelemetry

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
            mockDdTelemetry,
            mockJSONFileReader
        )

        DdSdkSessionStartedListener.invalidate()
        DdSdkSessionStartedListener.resetIsRnSdkInitialized()
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
        assertThat(configuration.site).isEqualTo("US3")
        assertThat(configuration.trackingConsent).isEqualTo("NOT_GRANTED")
        assertThat(configuration.uploadFrequency).isEqualTo("FREQUENT")
        assertThat(configuration.batchSize).isEqualTo("SMALL")
        assertThat(configuration.verbosity).isEqualTo("WARN")
        assertThat(configuration.service).isEqualTo("my.app")
        assertThat(configuration.additionalConfiguration?.get("_dd.source")).isEqualTo(
            "react-native"
        )
        assertThat(configuration.additionalConfiguration?.get("_dd.sdk_version")).isEqualTo(
            SDK_VERSION
        )
        assertThat(configuration.rumConfiguration?.applicationId).isEqualTo("fake-app-id")
        assertThat(configuration.rumConfiguration?.longTaskThresholdMs).isEqualTo(44.0)
        assertThat(configuration.rumConfiguration?.sessionSampleRate).isEqualTo(80.0)
        assertThat(configuration.rumConfiguration?.telemetrySampleRate).isEqualTo(60.0)
        assertThat(configuration.rumConfiguration?.vitalsUpdateFrequency).isEqualTo("NEVER")
        assertThat(configuration.rumConfiguration?.trackFrustrations).isEqualTo(false)
        assertThat(configuration.rumConfiguration?.nativeCrashReportEnabled).isEqualTo(true)
        assertThat(configuration.rumConfiguration?.nativeLongTaskThresholdMs).isEqualTo(333.0)
        assertThat(configuration.rumConfiguration?.nativeViewTracking).isEqualTo(true)
        assertThat(configuration.rumConfiguration?.nativeInteractionTracking).isEqualTo(true)
        assertThat(configuration.rumConfiguration?.trackBackgroundEvents).isEqualTo(true)
        assertThat(configuration.rumConfiguration?.customEndpoint).isEqualTo(
            "https://rum.example.com"
        )
        assertThat(configuration.logsConfiguration?.customEndpoint).isEqualTo(
            "https://logs.example.com"
        )
        assertThat(configuration.traceConfiguration?.customEndpoint).isEqualTo(
            "https://trace.example.com"
        )
        assertThat(configuration.configurationForTelemetry).isNull()
        assertThat(configuration.proxyConfiguration?.first?.type().toString()).isEqualTo("HTTP")
        val address = configuration.proxyConfiguration?.first?.address()
        assertThat(address).isNotNull
        (address as InetSocketAddress).let {
            assertThat(it.port).isEqualTo(4444)
            assertThat(it.address.hostAddress).isEqualTo("1.1.1.1")
        }
        assertThat(configuration.proxyConfiguration?.second?.username).isEqualTo("proxyusername")
        assertThat(configuration.proxyConfiguration?.second?.password).isEqualTo("proxypassword")
        val firstPartyHosts = configuration.rumConfiguration?.firstPartyHosts?.get("example.com")
        assertThat(firstPartyHosts.toString()).isEqualTo(
            "[B3MULTI, TRACECONTEXT]"
        )
        assertThat(configuration.rumConfiguration?.initialResourceThreshold).isEqualTo(0.5)
        assertThat(configuration.rumConfiguration?.timeseries?.collectTypes).isEqualTo(
            listOf("cpu")
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
        assertThat(configuration.verbosity).isNull()
        assertThat(configuration.service).isNull()
        assertThat(configuration.proxyConfiguration).isNull()

        assertThat(configuration.site).isEqualTo("US1")
        assertThat(configuration.uploadFrequency).isEqualTo("AVERAGE")
        assertThat(configuration.batchSize).isEqualTo("MEDIUM")
        assertThat(configuration.trackingConsent).isEqualTo("GRANTED")
        assertThat(configuration.additionalConfiguration?.get("_dd.source")).isEqualTo(
            "react-native"
        )
        assertThat(configuration.additionalConfiguration?.get("_dd.sdk_version")).isEqualTo(
            SDK_VERSION
        )
        assertThat(configuration.configurationForTelemetry).isNull()
        assertThat(configuration.rumConfiguration?.initialResourceThreshold).isEqualTo(0.1)
        assertThat(configuration.rumConfiguration?.applicationId).isEqualTo("fake-app-id")
        assertThat(configuration.rumConfiguration?.longTaskThresholdMs).isEqualTo(0.0)
        assertThat(configuration.rumConfiguration?.sessionSampleRate).isEqualTo(100.0)
        assertThat(configuration.rumConfiguration?.telemetrySampleRate).isEqualTo(20.0)
        assertThat(configuration.rumConfiguration?.vitalsUpdateFrequency).isEqualTo("AVERAGE")
        assertThat(configuration.rumConfiguration?.trackFrustrations).isEqualTo(true)
        assertThat(configuration.rumConfiguration?.trackBackgroundEvents).isEqualTo(false)
        assertThat(configuration.rumConfiguration?.customEndpoint).isNull()
        assertThat(configuration.rumConfiguration?.nativeCrashReportEnabled).isEqualTo(false)
        assertThat(configuration.rumConfiguration?.nativeLongTaskThresholdMs).isEqualTo(200.0)
        assertThat(configuration.rumConfiguration?.nativeViewTracking).isEqualTo(false)
        assertThat(configuration.rumConfiguration?.nativeInteractionTracking).isEqualTo(false)
        assertThat(configuration.rumConfiguration?.firstPartyHosts).isNull()
        assertThat(configuration.logsConfiguration?.customEndpoint).isNull()
        assertThat(configuration.traceConfiguration?.customEndpoint).isNull()
        assertThat(configuration.rumConfiguration?.timeseries).isNull()
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

    // region initialize()

    @Test
    fun `𝕄 mark RN SDK initialized and catch up session 𝕎 initialize() { isCalledFromJs=true, datadog already initialized }`() { // ktlint-disable-line max-line-length
        // Given
        val mockRumMonitor: RumMonitor = mock()
        whenever(mockDatadog.isInitialized()) doReturn true
        whenever(mockDatadog.getRumMonitor()) doReturn mockRumMonitor

        // When
        testedNativeInitialization.initialize(
            ddSdkConfiguration = minimalConfiguration(),
            isCalledFromJs = true
        )

        // Then
        assertThat(DdSdkSessionStartedListener.isRnSdkInitializedForTests()).isTrue()
        verify(mockRumMonitor).getCurrentSessionId(any())
    }

    @Test
    fun `𝕄 mark RN SDK initialized without catch up 𝕎 initialize() { isCalledFromJs=true, datadog not initialized }`() { // ktlint-disable-line max-line-length
        // Given
        whenever(mockDatadog.isInitialized()) doReturn false

        // When
        testedNativeInitialization.initialize(
            ddSdkConfiguration = minimalConfiguration(),
            isCalledFromJs = true
        )

        // Then
        assertThat(DdSdkSessionStartedListener.isRnSdkInitializedForTests()).isTrue()
        verify(mockDatadog, never()).getRumMonitor()
    }

    @Test
    fun `𝕄 not mark RN SDK initialized or catch up 𝕎 initialize() { isCalledFromJs=false }`() {
        // Given
        whenever(mockDatadog.isInitialized()) doReturn true

        // When
        testedNativeInitialization.initialize(
            ddSdkConfiguration = minimalConfiguration(),
            isCalledFromJs = false
        )

        // Then
        assertThat(DdSdkSessionStartedListener.isRnSdkInitializedForTests()).isFalse()
        verify(mockDatadog, never()).getRumMonitor()
    }

    // endregion

    // region initialize() / trace sample rate in the tracing feature context

    @Test
    fun `𝕄 register a tracing stand-in and publish the rate 𝕎 initialize() { RUM, no tracing feature }`() { // ktlint-disable-line max-line-length
        // Given
        val mockCore: FeatureSdkCore = mock()
        whenever(mockCore.getFeature(Feature.TRACING_FEATURE_NAME)) doReturn null

        // When
        initializeWithCore(mockCore, rumConfiguration(resourceTraceSampleRate = 42.0))

        // Then
        val registered = argumentCaptor<Feature>()
        verify(mockCore).registerFeature(registered.capture())
        assertThat(registered.firstValue.name).isEqualTo(Feature.TRACING_FEATURE_NAME)
        assertThat(publishedTracingContext(mockCore)["okhttp_interceptor_sample_rate"])
            .isInstanceOf(java.lang.Float::class.java)
            .isEqualTo(42f)
    }

    @Test
    fun `𝕄 publish the rate without registering 𝕎 initialize() { RUM, Trace enabled }`() {
        // Given
        val mockCore: FeatureSdkCore = mock()
        val mockTracingFeature: FeatureScope = mock()
        whenever(mockCore.getFeature(Feature.TRACING_FEATURE_NAME)) doReturn mockTracingFeature

        // When
        initializeWithCore(
            mockCore,
            rumConfiguration(resourceTraceSampleRate = 42.0).copy(
                traceConfiguration = TraceConfiguration()
            )
        )

        // Then
        verify(mockCore, never()).registerFeature(any())
        assertThat(publishedTracingContext(mockCore)["okhttp_interceptor_sample_rate"])
            .isInstanceOf(java.lang.Float::class.java)
            .isEqualTo(42f)
    }

    @Test
    fun `𝕄 publish the default rate 𝕎 initialize() { RUM, resourceTraceSampleRate unset }`() {
        // Given
        // e.g. a native-init JSON configuration without resourceTraceSampleRate
        val mockCore: FeatureSdkCore = mock()
        whenever(mockCore.getFeature(Feature.TRACING_FEATURE_NAME)) doReturn null

        // When
        initializeWithCore(mockCore, rumConfiguration(resourceTraceSampleRate = null))

        // Then
        assertThat(publishedTracingContext(mockCore)["okhttp_interceptor_sample_rate"])
            .isInstanceOf(java.lang.Float::class.java)
            .isEqualTo(100f)
    }

    @Test
    fun `𝕄 neither register nor publish 𝕎 initialize() { RUM not configured }`() {
        // Given
        val mockCore: FeatureSdkCore = mock()

        // When
        initializeWithCore(mockCore, minimalConfiguration())

        // Then
        verify(mockCore, never()).registerFeature(any())
        verify(mockCore, never()).updateFeatureContext(any(), any(), any())
    }

    // endregion

    private fun rumConfiguration(resourceTraceSampleRate: Double?): DdSdkConfiguration =
        minimalConfiguration().copy(
            rumConfiguration = RumConfiguration(
                applicationId = "fake-application-id",
                resourceTraceSampleRate = resourceTraceSampleRate
            )
        )

    private fun initializeWithCore(core: FeatureSdkCore, configuration: DdSdkConfiguration) {
        val datadogMock = mockStatic(Datadog::class.java)
        val rumMock = mockStatic(Rum::class.java)
        val traceMock = mockStatic(Trace::class.java)
        try {
            datadogMock.`when`<SdkCore> { Datadog.getInstance() }.thenReturn(core)
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            testedNativeInitialization.initialize(configuration, isCalledFromJs = false)
        } finally {
            datadogMock.close()
            rumMock.close()
            traceMock.close()
        }
    }

    private fun publishedTracingContext(core: FeatureSdkCore): Map<String, Any?> {
        val callback = argumentCaptor<(MutableMap<String, Any?>) -> Unit>()
        verify(core).updateFeatureContext(
            eq(Feature.TRACING_FEATURE_NAME),
            any(),
            callback.capture()
        )
        val context = mutableMapOf<String, Any?>()
        callback.firstValue.invoke(context)
        return context
    }

    private fun minimalConfiguration(): DdSdkConfiguration = DdSdkConfiguration(
        clientToken = "fake-client-token",
        env = "fake-env",
        additionalConfiguration = emptyMap()
    )
}
