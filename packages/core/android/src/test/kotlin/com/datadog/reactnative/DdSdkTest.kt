/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.pm.PackageInfo
import android.util.Log
import android.view.Choreographer
import com.datadog.android.DatadogSite
import com.datadog.android.core.configuration.BatchSize
import com.datadog.android.core.configuration.Configuration
import com.datadog.android.core.configuration.Credentials
import com.datadog.android.core.configuration.UploadFrequency
import com.datadog.android.core.configuration.VitalsUpdateFrequency
import com.datadog.android.event.EventMapper
import com.datadog.android.plugin.DatadogPlugin
import com.datadog.android.privacy.TrackingConsent
import com.datadog.android.rum.GlobalRum
import com.datadog.android.rum.RumMonitor
import com.datadog.android.rum.RumPerformanceMetric
import com.datadog.android.rum._RumInternalProxy
import com.datadog.android.rum.model.ActionEvent
import com.datadog.android.rum.model.ResourceEvent
import com.datadog.android.rum.tracking.ActivityViewTrackingStrategy
import com.datadog.android.telemetry.model.TelemetryConfigurationEvent
import com.datadog.android.tracing.TracingHeaderType
import com.datadog.tools.unit.GenericAssert.Companion.assertThat
import com.datadog.tools.unit.forge.BaseConfigurator
import com.datadog.tools.unit.getStaticValue
import com.datadog.tools.unit.setStaticValue
import com.datadog.tools.unit.toReadableArray
import com.datadog.tools.unit.toReadableJavaOnlyMap
import com.datadog.tools.unit.toReadableMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.argumentCaptor
import com.nhaarman.mockitokotlin2.doNothing
import com.nhaarman.mockitokotlin2.doReturn
import com.nhaarman.mockitokotlin2.doThrow
import com.nhaarman.mockitokotlin2.eq
import com.nhaarman.mockitokotlin2.inOrder
import com.nhaarman.mockitokotlin2.isNull
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.never
import com.nhaarman.mockitokotlin2.same
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.verifyZeroInteractions
import com.nhaarman.mockitokotlin2.whenever
import fr.xgouchet.elmyr.Forge
import fr.xgouchet.elmyr.annotation.AdvancedForgery
import fr.xgouchet.elmyr.annotation.BoolForgery
import fr.xgouchet.elmyr.annotation.Forgery
import fr.xgouchet.elmyr.annotation.IntForgery
import fr.xgouchet.elmyr.annotation.LongForgery
import fr.xgouchet.elmyr.annotation.MapForgery
import fr.xgouchet.elmyr.annotation.StringForgery
import fr.xgouchet.elmyr.annotation.StringForgeryType
import fr.xgouchet.elmyr.junit5.ForgeConfiguration
import fr.xgouchet.elmyr.junit5.ForgeExtension
import java.net.InetSocketAddress
import java.net.Proxy
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.Answers
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.quality.Strictness

fun mockChoreographerInstance(mock: Choreographer = mock()) {
    Choreographer::class.java.setStaticValue(
        "sThreadInstance",
        object : ThreadLocal<Choreographer>() {
            override fun initialValue(): Choreographer {
                return mock
            }
        }
    )
}

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
@ForgeConfiguration(BaseConfigurator::class)
internal class DdSdkTest {

    lateinit var testedBridgeSdk: DdSdk

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    lateinit var mockReactContext: ReactApplicationContext

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    lateinit var mockContext: ReactApplicationContext

    @Mock
    lateinit var mockRumMonitor: RumMonitor

    @Mock
    lateinit var mockRumInternalProxy: _RumInternalProxy

    @Mock
    lateinit var mockDatadog: DatadogWrapper

    @Forgery
    lateinit var fakeConfiguration: DdSdkConfiguration

    @Mock
    lateinit var mockPromise: Promise

    @Forgery
    lateinit var mockPackageInfo: PackageInfo

    @Mock
    lateinit var mockChoreographer: Choreographer

    @BeforeEach
    fun `set up`() {
        GlobalRum.registerIfAbsent(mockRumMonitor)
        whenever(mockRumMonitor._getInternal()) doReturn mockRumInternalProxy

        doNothing().whenever(mockChoreographer).postFrameCallback(any())
        mockChoreographerInstance(mockChoreographer)
        whenever(mockReactContext.applicationContext) doReturn mockContext
        whenever(mockContext.packageName) doReturn "packageName"
        whenever(
            mockContext.packageManager.getPackageInfo(
                "packageName",
                0
            )
        ) doReturn mockPackageInfo
        whenever(mockReactContext.runOnJSQueueThread(any())).thenAnswer { answer ->
            answer.getArgument<Runnable>(0).run()
            true
        }
        testedBridgeSdk = DdSdk(mockReactContext, mockDatadog)
    }

    @AfterEach
    fun `tear down`() {
        GlobalState.globalAttributes.clear()
        GlobalRum.javaClass.setStaticValue("monitor", mock<RumMonitor>())
        GlobalRum.javaClass.getStaticValue<GlobalRum, AtomicBoolean>("isRegistered").set(false)
    }

    // region initialize / nativeCrashReportEnabled

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {nativeCrashReportEnabled=true}`() {
        // Given
        val bridgeConfiguration = fakeConfiguration.copy(nativeCrashReportEnabled = true)
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                any()
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") {
                it.hasFieldEqualTo("needsClearTextHttp", false)
                it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("crashReportConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("rumConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasFieldEqualTo(
                "additionalConfig",
                fakeConfiguration.additionalConfig?.filterValues { it != null }.orEmpty()
            )
        val credentials = credentialCaptor.firstValue
        assertThat(credentials.clientToken).isEqualTo(fakeConfiguration.clientToken)
        assertThat(credentials.envName).isEqualTo(fakeConfiguration.env)
        assertThat(credentials.rumApplicationId).isEqualTo(fakeConfiguration.applicationId)
        assertThat(credentials.variant).isEqualTo("")
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {nativeCrashReportEnabled=false}`() {
        // Given
        fakeConfiguration = fakeConfiguration.copy(nativeCrashReportEnabled = false, site = null)
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                any()
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") {
                it.hasFieldEqualTo("needsClearTextHttp", false)
                it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasFieldEqualTo("crashReportConfig", null)
            .hasField("rumConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasFieldEqualTo(
                "additionalConfig",
                fakeConfiguration.additionalConfig?.filterValues { it != null }.orEmpty()
            )
        val credentials = credentialCaptor.firstValue
        assertThat(credentials.clientToken).isEqualTo(fakeConfiguration.clientToken)
        assertThat(credentials.envName).isEqualTo(fakeConfiguration.env)
        assertThat(credentials.rumApplicationId).isEqualTo(fakeConfiguration.applicationId)
        assertThat(credentials.variant).isEqualTo("")
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {nativeCrashReportEnabled=null}`() {
        // Given
        fakeConfiguration = fakeConfiguration.copy(nativeCrashReportEnabled = false, site = null)
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                any()
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") {
                it.hasFieldEqualTo("needsClearTextHttp", false)
                it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasFieldEqualTo("crashReportConfig", null)
            .hasField("rumConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasFieldEqualTo(
                "additionalConfig",
                fakeConfiguration.additionalConfig?.filterValues { it != null }.orEmpty()
            )
        val credentials = credentialCaptor.firstValue
        assertThat(credentials.clientToken).isEqualTo(fakeConfiguration.clientToken)
        assertThat(credentials.envName).isEqualTo(fakeConfiguration.env)
        assertThat(credentials.rumApplicationId).isEqualTo(fakeConfiguration.applicationId)
        assertThat(credentials.variant).isEqualTo("")
    }

    // endregion

    // region initialize / sampleRate

    @Test
    fun `𝕄 initialize native with sample rate SDK 𝕎 initialize() {}`() {
        // Given
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()
        val expectedRumSampleRate = fakeConfiguration.sampleRate?.toFloat() ?: 100f

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                any()
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") {
                it.hasFieldEqualTo("needsClearTextHttp", false)
                it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("rumConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
                it.hasFieldEqualTo("samplingRate", expectedRumSampleRate)
            }
            .hasFieldEqualTo(
                "additionalConfig",
                fakeConfiguration.additionalConfig?.filterValues { it != null }.orEmpty()
            )
        val credentials = credentialCaptor.firstValue
        assertThat(credentials.clientToken).isEqualTo(fakeConfiguration.clientToken)
        assertThat(credentials.envName).isEqualTo(fakeConfiguration.env)
        assertThat(credentials.rumApplicationId).isEqualTo(fakeConfiguration.applicationId)
        assertThat(credentials.variant).isEqualTo("")
    }

    // endregion

    // region initialize / telemetry sample rate

    @Test
    fun `𝕄 initialize native with telemetry sample rate SDK 𝕎 initialize() {}`() {
        // Given
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()
        val expectedTelemetrySampleRate = fakeConfiguration.telemetrySampleRate?.toFloat() ?: 20f

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                any()
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") {
                it.hasFieldEqualTo("needsClearTextHttp", false)
                it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("rumConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
                it.hasFieldEqualTo("telemetrySamplingRate", expectedTelemetrySampleRate)
            }
            .hasFieldEqualTo(
                "additionalConfig",
                fakeConfiguration.additionalConfig?.filterValues { it != null }.orEmpty()
            )
        val credentials = credentialCaptor.firstValue
        assertThat(credentials.clientToken).isEqualTo(fakeConfiguration.clientToken)
        assertThat(credentials.envName).isEqualTo(fakeConfiguration.env)
        assertThat(credentials.rumApplicationId).isEqualTo(fakeConfiguration.applicationId)
        assertThat(credentials.variant).isEqualTo("")
    }

    // endregion

    // region initialize / additionalConfig

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {additionalConfig=null}`() {
        // Given
        fakeConfiguration = fakeConfiguration.copy(additionalConfig = null)
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                any()
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") {
                it.hasFieldEqualTo("needsClearTextHttp", false)
                it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("rumConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasFieldEqualTo("additionalConfig", emptyMap<String, Any?>())
        val credentials = credentialCaptor.firstValue
        assertThat(credentials.clientToken).isEqualTo(fakeConfiguration.clientToken)
        assertThat(credentials.envName).isEqualTo(fakeConfiguration.env)
        assertThat(credentials.rumApplicationId).isEqualTo(fakeConfiguration.applicationId)
        assertThat(credentials.variant).isEqualTo("")
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {additionalConfig=nonNull}`() {
        // Given
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                any()
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") {
                it.hasFieldEqualTo("needsClearTextHttp", false)
                it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("rumConfig") {
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasFieldEqualTo(
                "additionalConfig",
                fakeConfiguration.additionalConfig?.filterValues { it != null }.orEmpty()
            )
        val credentials = credentialCaptor.firstValue
        assertThat(credentials.clientToken).isEqualTo(fakeConfiguration.clientToken)
        assertThat(credentials.envName).isEqualTo(fakeConfiguration.env)
        assertThat(credentials.rumApplicationId).isEqualTo(fakeConfiguration.applicationId)
        assertThat(credentials.variant).isEqualTo("")
    }

    // endregion

    // region initialize / site

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {site=null}`(
        forge: Forge
    ) {
        // Given
        fakeConfiguration = fakeConfiguration.copy(site = null, nativeCrashReportEnabled = true)
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                any()
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") {
                it.hasFieldEqualTo("needsClearTextHttp", false)
                it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US1.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US1.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("rumConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US1.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("crashReportConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US1.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasFieldEqualTo(
                "additionalConfig",
                fakeConfiguration.additionalConfig?.filterValues { it != null }.orEmpty()
            )
        val credentials = credentialCaptor.firstValue
        assertThat(credentials.clientToken).isEqualTo(fakeConfiguration.clientToken)
        assertThat(credentials.envName).isEqualTo(fakeConfiguration.env)
        assertThat(credentials.rumApplicationId).isEqualTo(fakeConfiguration.applicationId)
        assertThat(credentials.variant).isEqualTo("")
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {site=us1}`(
        forge: Forge
    ) {
        // Given
        val site = forge.randomizeCase("us1")
        fakeConfiguration = fakeConfiguration.copy(site = site, nativeCrashReportEnabled = true)
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                any()
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") {
                it.hasFieldEqualTo("needsClearTextHttp", false)
                it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US1.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US1.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("rumConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US1.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("crashReportConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US1.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasFieldEqualTo(
                "additionalConfig",
                fakeConfiguration.additionalConfig?.filterValues { it != null }.orEmpty()
            )
        val credentials = credentialCaptor.firstValue
        assertThat(credentials.clientToken).isEqualTo(fakeConfiguration.clientToken)
        assertThat(credentials.envName).isEqualTo(fakeConfiguration.env)
        assertThat(credentials.rumApplicationId).isEqualTo(fakeConfiguration.applicationId)
        assertThat(credentials.variant).isEqualTo("")
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {site=us3}`(
        forge: Forge
    ) {
        // Given
        val site = forge.randomizeCase("us3")
        fakeConfiguration = fakeConfiguration.copy(site = site, nativeCrashReportEnabled = true)
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                any()
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") {
                it.hasFieldEqualTo("needsClearTextHttp", false)
                it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US3.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US3.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("rumConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US3.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("crashReportConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US3.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasFieldEqualTo(
                "additionalConfig",
                fakeConfiguration.additionalConfig?.filterValues { it != null }.orEmpty()
            )
        val credentials = credentialCaptor.firstValue
        assertThat(credentials.clientToken).isEqualTo(fakeConfiguration.clientToken)
        assertThat(credentials.envName).isEqualTo(fakeConfiguration.env)
        assertThat(credentials.rumApplicationId).isEqualTo(fakeConfiguration.applicationId)
        assertThat(credentials.variant).isEqualTo("")
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {site=us5}`(
        forge: Forge
    ) {
        // Given
        val site = forge.randomizeCase("us5")
        fakeConfiguration = fakeConfiguration.copy(site = site, nativeCrashReportEnabled = true)
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                any()
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") {
                it.hasFieldEqualTo("needsClearTextHttp", false)
                it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US5.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US5.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("rumConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US5.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("crashReportConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US5.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasFieldEqualTo(
                "additionalConfig",
                fakeConfiguration.additionalConfig?.filterValues { it != null }.orEmpty()
            )
        val credentials = credentialCaptor.firstValue
        assertThat(credentials.clientToken).isEqualTo(fakeConfiguration.clientToken)
        assertThat(credentials.envName).isEqualTo(fakeConfiguration.env)
        assertThat(credentials.rumApplicationId).isEqualTo(fakeConfiguration.applicationId)
        assertThat(credentials.variant).isEqualTo("")
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {site=us1_fed}`(
        forge: Forge
    ) {
        // Given
        val site = forge.randomizeCase("us1_fed")
        fakeConfiguration = fakeConfiguration.copy(site = site, nativeCrashReportEnabled = true)
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                any()
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") {
                it.hasFieldEqualTo("needsClearTextHttp", false)
                it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US1_FED.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US1_FED.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("rumConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US1_FED.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("crashReportConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.US1_FED.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasFieldEqualTo(
                "additionalConfig",
                fakeConfiguration.additionalConfig?.filterValues { it != null }.orEmpty()
            )
        val credentials = credentialCaptor.firstValue
        assertThat(credentials.clientToken).isEqualTo(fakeConfiguration.clientToken)
        assertThat(credentials.envName).isEqualTo(fakeConfiguration.env)
        assertThat(credentials.rumApplicationId).isEqualTo(fakeConfiguration.applicationId)
        assertThat(credentials.variant).isEqualTo("")
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {site=eu1}`(
        forge: Forge
    ) {
        // Given
        val site = forge.randomizeCase("eu1")
        fakeConfiguration = fakeConfiguration.copy(site = site, nativeCrashReportEnabled = true)
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                any()
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") {
                it.hasFieldEqualTo("needsClearTextHttp", false)
                it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.EU1.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.EU1.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("rumConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.EU1.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("crashReportConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.EU1.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasFieldEqualTo(
                "additionalConfig",
                fakeConfiguration.additionalConfig?.filterValues { it != null }.orEmpty()
            )
        val credentials = credentialCaptor.firstValue
        assertThat(credentials.clientToken).isEqualTo(fakeConfiguration.clientToken)
        assertThat(credentials.envName).isEqualTo(fakeConfiguration.env)
        assertThat(credentials.rumApplicationId).isEqualTo(fakeConfiguration.applicationId)
        assertThat(credentials.variant).isEqualTo("")
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {site=ap1}`(
        forge: Forge
    ) {
        // Given
        val site = forge.randomizeCase("ap1")
        fakeConfiguration = fakeConfiguration.copy(site = site, nativeCrashReportEnabled = true)
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                any()
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") {
                it.hasFieldEqualTo("needsClearTextHttp", false)
                it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.AP1.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.AP1.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("rumConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.AP1.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("crashReportConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogSite.AP1.intakeEndpoint)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasFieldEqualTo(
                "additionalConfig",
                fakeConfiguration.additionalConfig?.filterValues { it != null }.orEmpty()
            )
        val credentials = credentialCaptor.firstValue
        assertThat(credentials.clientToken).isEqualTo(fakeConfiguration.clientToken)
        assertThat(credentials.envName).isEqualTo(fakeConfiguration.env)
        assertThat(credentials.rumApplicationId).isEqualTo(fakeConfiguration.applicationId)
        assertThat(credentials.variant).isEqualTo("")
    }

    // endregion

    // region initialize / additionalConfig

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {trackingConsent=null}`() {
        // Given
        fakeConfiguration = fakeConfiguration.copy(trackingConsent = null)
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                eq(TrackingConsent.PENDING)
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {trackingConsent=PENDING}`(
        forge: Forge
    ) {
        // Given
        val consent = forge.randomizeCase("PENDING")
        fakeConfiguration = fakeConfiguration.copy(trackingConsent = consent)
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                eq(TrackingConsent.PENDING)
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {trackingConsent=GRANTED}`(
        forge: Forge
    ) {
        // Given
        val consent = forge.randomizeCase("GRANTED")
        fakeConfiguration = fakeConfiguration.copy(trackingConsent = consent)
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                eq(TrackingConsent.GRANTED)
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {trackingConsent=NOT_GRANTED}`(
        forge: Forge
    ) {
        // Given
        val consent = forge.randomizeCase("NOT_GRANTED")
        fakeConfiguration = fakeConfiguration.copy(trackingConsent = consent)
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                eq(TrackingConsent.NOT_GRANTED)
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
    }

    // endregion

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {no view tracking by default}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(additionalConfig = null)
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                eq(configuration.trackingConsent.asTrackingConsent())
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("rumConfig") {
                it.hasFieldEqualTo("viewTrackingStrategy", NoOpViewTrackingStrategy)
            }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {no view tracking}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            additionalConfig = mapOf(
                DdSdk.DD_NATIVE_VIEW_TRACKING to false
            )
        )
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                eq(configuration.trackingConsent.asTrackingConsent())
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("rumConfig") {
                it.hasFieldEqualTo("viewTrackingStrategy", NoOpViewTrackingStrategy)
            }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {with view tracking}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            additionalConfig = mapOf(
                DdSdk.DD_NATIVE_VIEW_TRACKING to true
            )
        )
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                eq(configuration.trackingConsent.asTrackingConsent())
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("rumConfig") {
                it.hasFieldEqualTo("viewTrackingStrategy", ActivityViewTrackingStrategy(false))
            }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {no user action tracking}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            additionalConfig = mapOf(
                DdSdk.DD_NATIVE_INTERACTION_TRACKING to false
            )
        )
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                eq(configuration.trackingConsent.asTrackingConsent())
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("rumConfig") {
                it.hasFieldWithClass(
                    "userActionTrackingStrategy",
                    "com.datadog.android.rum.internal.tracking.NoOpUserActionTrackingStrategy"
                )
            }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {frustration tracking enabled}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            trackFrustrations = true
        )
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                eq(configuration.trackingConsent.asTrackingConsent())
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("rumConfig") {
                it.hasFieldEqualTo(
                    "trackFrustrations",
                    true
                )
            }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {frustration tracking disabled}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            trackFrustrations = false
        )
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                eq(configuration.trackingConsent.asTrackingConsent())
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("rumConfig") {
                it.hasFieldEqualTo(
                    "trackFrustrations",
                    false
                )
            }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {with user action tracking}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            additionalConfig = mapOf(
                DdSdk.DD_NATIVE_INTERACTION_TRACKING to true
            )
        )
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                eq(configuration.trackingConsent.asTrackingConsent())
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("rumConfig") {
                it.hasFieldWithClass(
                    "userActionTrackingStrategy",
                    "com.datadog.android.rum.internal" +
                        ".instrumentation.UserActionTrackingStrategyLegacy"
                )
            }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {invalid user action tracking}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            additionalConfig = mapOf(
                DdSdk.DD_NATIVE_INTERACTION_TRACKING to null
            )
        )
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                eq(configuration.trackingConsent.asTrackingConsent())
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("rumConfig") {
                it.hasFieldWithClass(
                    "userActionTrackingStrategy",
                    "com.datadog.android.rum.internal" +
                        ".instrumentation.UserActionTrackingStrategyLegacy"
                )
            }
    }
    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {sdk verbosity}`(
        @Forgery configuration: DdSdkConfiguration,
        @IntForgery(Log.DEBUG, Log.ASSERT) verbosity: Int
    ) {
        // Given
        val verbosityName = when (verbosity) {
            Log.DEBUG -> "debug"
            Log.INFO -> "info"
            Log.WARN -> "warn"
            Log.ERROR -> "error"
            else -> ""
        }
        val bridgeConfiguration = configuration.copy(
            additionalConfig = mapOf(
                DdSdk.DD_SDK_VERBOSITY to verbosityName
            )
        )

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        verify(mockDatadog).setVerbosity(verbosity)
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {invalid sdk verbosity}`(
        @Forgery configuration: DdSdkConfiguration,
        @StringForgery(StringForgeryType.HEXADECIMAL) verbosity: String
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            additionalConfig = mapOf(
                DdSdk.DD_SDK_VERBOSITY to verbosity
            )
        )

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        verify(mockDatadog, never()).setVerbosity(any())
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {custom service name}`(
        @Forgery configuration: DdSdkConfiguration,
        @StringForgery serviceName: String
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            additionalConfig = mapOf(
                DdSdk.DD_SERVICE_NAME to serviceName
            )
        )
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        verify(mockDatadog).initialize(
            same(mockContext),
            credentialCaptor.capture(),
            configCaptor.capture(),
            eq(configuration.trackingConsent.asTrackingConsent())
        )
        assertThat(credentialCaptor.firstValue.serviceName).isEqualTo(serviceName)
    }

    @Test
    fun `𝕄 set long task threshold 𝕎 initialize() {custom long task threshold}`(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        val threshold = forge.aDouble(min = 100.0, max = 65536.0)

        // Given
        val bridgeConfiguration = configuration.copy(
            nativeLongTaskThresholdMs = threshold
        )
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        verify(mockDatadog).initialize(
            same(mockContext),
            credentialCaptor.capture(),
            configCaptor.capture(),
            eq(configuration.trackingConsent.asTrackingConsent())
        )
        assertThat(configCaptor.firstValue)
            .hasField("rumConfig") { rumConfig ->
                rumConfig.hasField("longTaskTrackingStrategy") { longTaskTrackingStrategy ->
                    longTaskTrackingStrategy
                        .isInstanceOf(
                            "com.datadog.android.rum.internal.instrumentation." +
                                "MainLooperLongTaskStrategy"
                        )
                        .hasFieldEqualTo("thresholdMs", threshold.toLong())
                }
            }
    }

    @Test
    fun `𝕄 not set long task threshold 𝕎 initialize() {long task threshold is 0}`(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            nativeLongTaskThresholdMs = 0.0
        )
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        verify(mockDatadog).initialize(
            same(mockContext),
            credentialCaptor.capture(),
            configCaptor.capture(),
            eq(configuration.trackingConsent.asTrackingConsent())
        )
        assertThat(configCaptor.firstValue)
            .hasField("rumConfig") { rumConfig ->
                rumConfig.doesNotHaveField("longTaskTrackingStrategy")
            }
    }

    @Test
    fun `𝕄 set first party hosts 𝕎 initialize() {first party hosts}`(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        val tracingHosts = forge.aMap {
            Pair(
                forge.aStringMatching("[a-z]+\\.[a-z]{3}"),
                forge.aSubSetOf(
                    setOf(
                        TracingHeaderType.DATADOG,
                        TracingHeaderType.B3MULTI,
                        TracingHeaderType.TRACECONTEXT,
                        TracingHeaderType.B3
                    ),
                    anInt(1, 4)
                )
            )
        }

        val firstPartyHosts = mutableListOf<ReadableMap>()
        tracingHosts.forEach { (match, headerTypes) ->
            firstPartyHosts.add(
                mapOf(
                    "match" to match,
                    "propagatorTypes" to headerTypes.map {
                        it.name.lowercase()
                    }.toReadableArray()
                ).toReadableMap()
            )
        }

        // Given
        val bridgeConfiguration = configuration.copy(
            additionalConfig = mapOf(
                DdSdk.DD_FIRST_PARTY_HOSTS to firstPartyHosts.toReadableArray()
            )
        )
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        verify(mockDatadog).initialize(
            same(mockContext),
            any(),
            configCaptor.capture(),
            eq(configuration.trackingConsent.asTrackingConsent())
        )
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") { coreConfig ->
                coreConfig.hasFieldEqualTo(
                    "firstPartyHostsWithHeaderTypes",
                    tracingHosts
                )
            }
    }

    @Test
    fun `𝕄 set first party hosts 𝕎 initialize() {wrong first party hosts}`(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        val tracingHosts = forge.aMap {
            Pair(
                forge.aStringMatching("[a-z]+\\.[a-z]{3}"),
                setOf(
                    TracingHeaderType.DATADOG,
                )
            )
        }

        val firstPartyHosts = mutableListOf<ReadableMap>()
        tracingHosts.forEach { (match) ->
            firstPartyHosts.add(
                mapOf(
                    "match" to match,
                    "propagatorTypes" to listOf(
                        TracingHeaderType.DATADOG.name.lowercase(),
                        forge.aString()
                    ).toReadableArray()
                ).toReadableMap()
            )
        }

        // Given
        val bridgeConfiguration = configuration.copy(
            additionalConfig = mapOf(
                DdSdk.DD_FIRST_PARTY_HOSTS to firstPartyHosts.toReadableArray()
            )
        )
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        verify(mockDatadog).initialize(
            same(mockContext),
            any(),
            configCaptor.capture(),
            eq(configuration.trackingConsent.asTrackingConsent())
        )
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") { coreConfig ->
                coreConfig.hasFieldEqualTo(
                    "firstPartyHostsWithHeaderTypes",
                    tracingHosts
                )
            }
    }

    @Test
    fun `𝕄 set first party hosts 𝕎 initialize() {duplicated first party hosts}`(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        val host = forge.aStringMatching("[a-z]+\\.[a-z]{3}")
        val tracingHosts = mapOf(
            Pair(
                host,
                setOf(
                    TracingHeaderType.DATADOG,
                    TracingHeaderType.B3,
                )
            ),
        )

        val firstPartyHosts = mutableListOf<ReadableMap>()
        firstPartyHosts.add(
            mapOf(
                "match" to host,
                "propagatorTypes" to listOf(
                    TracingHeaderType.DATADOG.name.lowercase(),
                ).toReadableArray()
            ).toReadableMap()
        )
        firstPartyHosts.add(
            mapOf(
                "match" to host,
                "propagatorTypes" to listOf(
                    TracingHeaderType.B3.name.lowercase(),
                ).toReadableArray()
            ).toReadableMap()
        )

        // Given
        val bridgeConfiguration = configuration.copy(
            additionalConfig = mapOf(
                DdSdk.DD_FIRST_PARTY_HOSTS to firstPartyHosts.toReadableArray()
            )
        )
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        verify(mockDatadog).initialize(
            same(mockContext),
            any(),
            configCaptor.capture(),
            eq(configuration.trackingConsent.asTrackingConsent())
        )
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") { coreConfig ->
                coreConfig.hasFieldEqualTo(
                    "firstPartyHostsWithHeaderTypes",
                    tracingHosts
                )
            }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {average upload frequency}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            uploadFrequency = "AVERAGE",
        )
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                eq(configuration.trackingConsent.asTrackingConsent())
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") {
                it.hasFieldEqualTo("uploadFrequency", UploadFrequency.AVERAGE)
            }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {rare upload frequency}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            uploadFrequency = "RARE",
        )
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                eq(configuration.trackingConsent.asTrackingConsent())
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") {
                it.hasFieldEqualTo("uploadFrequency", UploadFrequency.RARE)
            }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {frequent upload frequency}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            uploadFrequency = "FREQUENT",
        )
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                eq(configuration.trackingConsent.asTrackingConsent())
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("coreConfig") {
                it.hasFieldEqualTo("uploadFrequency", UploadFrequency.FREQUENT)
            }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {rare vitals frequency update}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            vitalsUpdateFrequency = "RARE"
        )
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                eq(configuration.trackingConsent.asTrackingConsent())
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("rumConfig") {
                it.hasFieldEqualTo("vitalsMonitorUpdateFrequency", VitalsUpdateFrequency.RARE)
            }
        argumentCaptor<Choreographer.FrameCallback> {
            verify(mockChoreographer).postFrameCallback(capture())
            assertThat(firstValue).isInstanceOf(VitalFrameCallback::class.java)
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {never vitals frequency update}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        doThrow(IllegalStateException()).whenever(mockChoreographer).postFrameCallback(any())
        val bridgeConfiguration = configuration.copy(
            vitalsUpdateFrequency = "NEVER",
            longTaskThresholdMs = 0.0
        )
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                eq(configuration.trackingConsent.asTrackingConsent())
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("rumConfig") {
                it.hasFieldEqualTo("vitalsMonitorUpdateFrequency", VitalsUpdateFrequency.NEVER)
            }
        verifyZeroInteractions(mockChoreographer)
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {malformed frequency update, long task 0}`(
        @StringForgery fakeFrequency: String,
        @LongForgery(min = 0L) timestampNs: Long,
        @LongForgery(min = ONE_HUNDRED_MILLISSECOND_NS, max = 5 * ONE_SECOND_NS) threshold: Long,
        @LongForgery(min = 1, max = ONE_SECOND_NS) frameDurationOverThreshold: Long,
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            vitalsUpdateFrequency = fakeFrequency,
            longTaskThresholdMs = 0.0
        )
        val credentialCaptor = argumentCaptor<Credentials>()
        val configCaptor = argumentCaptor<Configuration>()
        val frameDurationNs = threshold + frameDurationOverThreshold

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        inOrder(mockDatadog) {
            verify(mockDatadog).initialize(
                same(mockContext),
                credentialCaptor.capture(),
                configCaptor.capture(),
                eq(configuration.trackingConsent.asTrackingConsent())
            )
            verify(mockDatadog).registerRumMonitor(any())
        }
        assertThat(configCaptor.firstValue)
            .hasField("rumConfig") {
                it.hasFieldEqualTo("vitalsMonitorUpdateFrequency", VitalsUpdateFrequency.AVERAGE)
            }
        argumentCaptor<Choreographer.FrameCallback> {
            verify(mockChoreographer).postFrameCallback(capture())
            assertThat(firstValue).isInstanceOf(VitalFrameCallback::class.java)

            // When
            firstValue.doFrame(timestampNs)
            firstValue.doFrame(timestampNs + frameDurationNs)

            // then
            verify(mockRumMonitor._getInternal()!!).updatePerformanceMetric(
                RumPerformanceMetric.JS_FRAME_TIME,
                frameDurationNs.toDouble()
            )
            verify(mockRumMonitor._getInternal()!!, never()).addLongTask(
                frameDurationNs,
                "javascript"
            )
        }
    }

    @Test
    fun `𝕄 send long tasks 𝕎 frame time is over threshold() {}`(
        @LongForgery(min = 0L) timestampNs: Long,
        @LongForgery(min = ONE_HUNDRED_MILLISSECOND_NS, max = 5 * ONE_SECOND_NS) threshold: Long,
        @LongForgery(min = 1, max = ONE_SECOND_NS) frameDurationOverThreshold: Long,
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            vitalsUpdateFrequency = "AVERAGE",
            longTaskThresholdMs = (threshold / 1_000_000).toDouble(),
        )
        val frameDurationNs = threshold + frameDurationOverThreshold

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        argumentCaptor<Choreographer.FrameCallback> {
            verify(mockChoreographer).postFrameCallback(capture())

            // When
            firstValue.doFrame(timestampNs)
            firstValue.doFrame(timestampNs + frameDurationNs)

            // then
            verify(mockRumMonitor._getInternal()!!).updatePerformanceMetric(
                RumPerformanceMetric.JS_FRAME_TIME,
                frameDurationNs.toDouble()
            )
            verify(mockRumMonitor._getInternal()!!).addLongTask(
                frameDurationNs,
                "javascript"
            )
        }
    }

    @Test
    fun `𝕄 send long tasks 𝕎 frame time is over threshold() { never vitals frequency update }`(
        @LongForgery(min = 0L) timestampNs: Long,
        @LongForgery(min = ONE_HUNDRED_MILLISSECOND_NS, max = 5 * ONE_SECOND_NS) threshold: Long,
        @LongForgery(min = 1, max = ONE_SECOND_NS) frameDurationOverThreshold: Long,
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            vitalsUpdateFrequency = "NEVER",
            longTaskThresholdMs = (threshold / 1_000_000).toDouble(),
        )
        val frameDurationNs = threshold + frameDurationOverThreshold

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        argumentCaptor<Choreographer.FrameCallback> {
            verify(mockChoreographer).postFrameCallback(capture())

            // When
            firstValue.doFrame(timestampNs)
            firstValue.doFrame(timestampNs + frameDurationNs)

            // Then
            verify(mockRumMonitor._getInternal()!!).addLongTask(
                frameDurationNs,
                "javascript"
            )
            verify(mockRumMonitor._getInternal()!!, never()).updatePerformanceMetric(
                RumPerformanceMetric.JS_FRAME_TIME,
                frameDurationNs.toDouble()
            )
        }
    }

    // endregion

    // region version suffix

    @Test
    fun `𝕄 set version 𝕎 initialize() {versionSuffix}`(
        @Forgery configuration: DdSdkConfiguration,
        @StringForgery versionSuffix: String
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            additionalConfig = mapOf(
                DdSdk.DD_VERSION_SUFFIX to versionSuffix
            )
        )
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        verify(mockDatadog).initialize(
            same(mockContext),
            any(),
            configCaptor.capture(),
            eq(configuration.trackingConsent.asTrackingConsent())
        )
        assertThat(configCaptor.firstValue)
            .hasFieldEqualTo(
                "additionalConfig",
                mapOf(
                    DdSdk.DD_VERSION_SUFFIX to versionSuffix,
                    DdSdk.DD_VERSION to mockPackageInfo.versionName + versionSuffix
                )
            )
    }

    // endregion

    // region configuration telemetry mapper

    @Test
    fun `𝕄 set telemetry configuration mapper 𝕎 initialize() {}`(
        @Forgery configuration: DdSdkConfiguration,
        @Forgery telemetryConfigurationEvent: TelemetryConfigurationEvent,
        @BoolForgery trackNativeViews: Boolean,
        @BoolForgery trackNativeErrors: Boolean,
        @StringForgery initializationType: String,
        @BoolForgery trackInteractions: Boolean,
        @BoolForgery trackErrors: Boolean,
        @BoolForgery trackNetworkRequests: Boolean,
        @StringForgery reactVersion: String,
        @StringForgery reactNativeVersion: String
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            nativeCrashReportEnabled = trackNativeErrors,
            nativeLongTaskThresholdMs = 0.0,
            longTaskThresholdMs = 0.0,
            configurationForTelemetry = ConfigurationForTelemetry(
                initializationType = initializationType,
                trackErrors = trackErrors,
                trackInteractions = trackInteractions,
                trackNetworkRequests = trackNetworkRequests,
                reactVersion = reactVersion,
                reactNativeVersion = reactNativeVersion
            )
        )
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        verify(mockDatadog).initialize(
            same(mockContext),
            any(),
            configCaptor.capture(),
            eq(configuration.trackingConsent.asTrackingConsent())
        )
        assertThat(configCaptor.firstValue)
            .hasField("rumConfig") {
                val configurationMapper = it
                    .getActualValue<EventMapper<TelemetryConfigurationEvent>>("rumEventMapper")
                val result = configurationMapper.map(telemetryConfigurationEvent)!!
                assertThat(result.telemetry.configuration.trackNativeErrors!!).isEqualTo(
                    trackNativeErrors
                )
                assertThat(result.telemetry.configuration.trackCrossPlatformLongTasks!!)
                    .isEqualTo(false)
                assertThat(result.telemetry.configuration.trackLongTask!!)
                    .isEqualTo(false)
                assertThat(result.telemetry.configuration.trackNativeLongTasks!!)
                    .isEqualTo(false)

                assertThat(result.telemetry.configuration.initializationType!!)
                    .isEqualTo(initializationType)
                assertThat(result.telemetry.configuration.trackInteractions!!)
                    .isEqualTo(trackInteractions)
                assertThat(result.telemetry.configuration.trackErrors!!).isEqualTo(trackErrors)
                assertThat(result.telemetry.configuration.trackResources!!)
                    .isEqualTo(trackNetworkRequests)
                assertThat(result.telemetry.configuration.trackNetworkRequests!!)
                    .isEqualTo(trackNetworkRequests)
            }
    }

    // endregion

    // region resource mapper

    @Test
    fun `𝕄 set a resource mapper that does not drop resources 𝕎 initialize() {}`(
        @Forgery resourceEvent: ResourceEvent,
    ) {
        // Given
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        verify(mockDatadog).initialize(
            same(mockContext),
            any(),
            configCaptor.capture(),
            any()
        )
        assertThat(configCaptor.firstValue)
            .hasField("rumConfig") {
                val resourceMapper = it
                    .getActualValue<EventMapper<ResourceEvent>>("rumEventMapper")
                val notDroppedEvent = resourceMapper.map(resourceEvent)
                assertThat(notDroppedEvent).isNotNull
            }
    }

    @Test
    fun `𝕄 set a resource mapper that drops flagged resources 𝕎 initialize() {}`(
        @Forgery resourceEvent: ResourceEvent,
    ) {
        // Given
        val configCaptor = argumentCaptor<Configuration>()
        resourceEvent.context?.additionalProperties?.put("_dd.resource.drop_resource", true)

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        verify(mockDatadog).initialize(
            same(mockContext),
            any(),
            configCaptor.capture(),
            any()
        )
        assertThat(configCaptor.firstValue)
            .hasField("rumConfig") {
                val resourceMapper = it
                    .getActualValue<EventMapper<ResourceEvent>>("rumEventMapper")
                val droppedEvent = resourceMapper.map(resourceEvent)
                assertThat(droppedEvent).isNull()
            }
    }

    // endregion

    // region action mapper

    @Test
    fun `𝕄 set a action mapper that does not drop actions 𝕎 initialize() {}`(
        @Forgery actionEvent: ActionEvent,
    ) {
        // Given
        val configCaptor = argumentCaptor<Configuration>()

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        verify(mockDatadog).initialize(
            same(mockContext),
            any(),
            configCaptor.capture(),
            any()
        )
        assertThat(configCaptor.firstValue)
            .hasField("rumConfig") {
                val actionMapper = it
                    .getActualValue<EventMapper<ActionEvent>>("rumEventMapper")
                val notDroppedEvent = actionMapper.map(actionEvent)
                assertThat(notDroppedEvent).isNotNull
            }
    }

    @Test
    fun `𝕄 set a action mapper that drops flagged actions 𝕎 initialize() {}`(
        @Forgery actionEvent: ActionEvent,
    ) {
        // Given
        val configCaptor = argumentCaptor<Configuration>()
        actionEvent.context?.additionalProperties?.put("_dd.action.drop_action", true)

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        verify(mockDatadog).initialize(
            same(mockContext),
            any(),
            configCaptor.capture(),
            any()
        )
        assertThat(configCaptor.firstValue)
            .hasField("rumConfig") {
                val actionMapper = it
                    .getActualValue<EventMapper<ActionEvent>>("rumEventMapper")
                val droppedEvent = actionMapper.map(actionEvent)
                assertThat(droppedEvent).isNull()
            }
    }

    // endregion

    // region misc

    @Test
    fun `𝕄 set native user info 𝕎 setUser()`(
        @MapForgery(
            key = AdvancedForgery(string = [StringForgery(StringForgeryType.NUMERICAL)]),
            value = AdvancedForgery(string = [StringForgery(StringForgeryType.ASCII)])
        ) extraInfo: Map<String, String>
    ) {
        // When
        testedBridgeSdk.setUser(extraInfo.toReadableMap(), mockPromise)

        // Then
        argumentCaptor<Map<String, Any?>> {
            verify(mockDatadog)
                .setUserInfo(
                    isNull(),
                    isNull(),
                    isNull(),
                    capture()
                )

            assertThat(firstValue)
                .containsAllEntriesOf(extraInfo)
                .hasSize(extraInfo.size)
        }
    }

    @Test
    fun `𝕄 set native user info 𝕎 setUser() {with id}`(
        @StringForgery id: String,
        @MapForgery(
            key = AdvancedForgery(string = [StringForgery(StringForgeryType.NUMERICAL)]),
            value = AdvancedForgery(string = [StringForgery(StringForgeryType.ASCII)])
        ) extraInfo: Map<String, String>
    ) {
        // Given
        val user = extraInfo.toMutableMap().also {
            it.put("id", id)
        }

        // When
        testedBridgeSdk.setUser(user.toReadableMap(), mockPromise)

        // Then
        argumentCaptor<Map<String, Any?>> {
            verify(mockDatadog)
                .setUserInfo(
                    eq(id),
                    isNull(),
                    isNull(),
                    capture()
                )

            assertThat(firstValue)
                .containsAllEntriesOf(extraInfo)
                .hasSize(extraInfo.size)
        }
    }

    @Test
    fun `𝕄 set native user info 𝕎 setUser() {with name}`(
        @StringForgery name: String,
        @MapForgery(
            key = AdvancedForgery(string = [StringForgery(StringForgeryType.NUMERICAL)]),
            value = AdvancedForgery(string = [StringForgery(StringForgeryType.ASCII)])
        ) extraInfo: Map<String, String>
    ) {
        // Given
        val user = extraInfo.toMutableMap().also {
            it.put("name", name)
        }

        // When
        testedBridgeSdk.setUser(user.toReadableMap(), mockPromise)

        // Then
        argumentCaptor<Map<String, Any?>> {
            verify(mockDatadog)
                .setUserInfo(
                    isNull(),
                    eq(name),
                    isNull(),
                    capture()
                )

            assertThat(firstValue)
                .containsAllEntriesOf(extraInfo)
                .hasSize(extraInfo.size)
        }
    }

    @Test
    fun `𝕄 set native user info 𝕎 setUser() {with email}`(
        @StringForgery(regex = "\\w+@\\w+\\.[a-z]{3}") email: String,
        @MapForgery(
            key = AdvancedForgery(string = [StringForgery(StringForgeryType.NUMERICAL)]),
            value = AdvancedForgery(string = [StringForgery(StringForgeryType.ASCII)])
        ) extraInfo: Map<String, String>
    ) {
        // Given
        val user = extraInfo.toMutableMap().also {
            it.put("email", email)
        }

        // When
        testedBridgeSdk.setUser(user.toReadableMap(), mockPromise)

        // Then
        argumentCaptor<Map<String, Any?>> {
            verify(mockDatadog)
                .setUserInfo(
                    isNull(),
                    isNull(),
                    eq(email),
                    capture()
                )

            assertThat(firstValue)
                .containsAllEntriesOf(extraInfo)
                .hasSize(extraInfo.size)
        }
    }

    @Test
    fun `𝕄 set native user info 𝕎 setUser() {with id, name and email}`(
        @StringForgery id: String,
        @StringForgery name: String,
        @StringForgery(regex = "\\w+@\\w+\\.[a-z]{3}") email: String,
        @MapForgery(
            key = AdvancedForgery(string = [StringForgery(StringForgeryType.NUMERICAL)]),
            value = AdvancedForgery(string = [StringForgery(StringForgeryType.ASCII)])
        ) extraInfo: Map<String, String>
    ) {
        // Given
        val user = extraInfo.toMutableMap().also {
            it.put("id", id)
            it.put("name", name)
            it.put("email", email)
        }

        // When
        testedBridgeSdk.setUser(user.toReadableMap(), mockPromise)

        // Then
        argumentCaptor<Map<String, Any?>> {
            verify(mockDatadog)
                .setUserInfo(
                    eq(id),
                    eq(name),
                    eq(email),
                    capture()
                )

            assertThat(firstValue)
                .containsAllEntriesOf(extraInfo)
                .hasSize(extraInfo.size)
        }
    }

    @Test
    fun `𝕄 set RUM attributes 𝕎 setAttributes`(
        @MapForgery(
            key = AdvancedForgery(string = [StringForgery(StringForgeryType.NUMERICAL)]),
            value = AdvancedForgery(string = [StringForgery(StringForgeryType.ASCII)])
        ) customAttributes: Map<String, String>
    ) {
        // When
        testedBridgeSdk.setAttributes(customAttributes.toReadableMap(), mockPromise)

        // Then
        verify(mockDatadog).addRumGlobalAttributes(customAttributes)
    }

    @Test
    fun `𝕄 set GlobalState attributes 𝕎 setAttributes`(
        @MapForgery(
            key = AdvancedForgery(string = [StringForgery(StringForgeryType.NUMERICAL)]),
            value = AdvancedForgery(string = [StringForgery(StringForgeryType.ASCII)])
        ) customAttributes: Map<String, String>
    ) {
        // When
        testedBridgeSdk.setAttributes(customAttributes.toReadableMap(), mockPromise)

        // Then
        customAttributes.forEach { (k, v) ->
            assertThat(GlobalState.globalAttributes).containsEntry(k, v)
        }
    }

    @Test
    fun `𝕄 build Granted consent 𝕎 buildTrackingConsent {granted}`(forge: Forge) {

        // When
        val consent = testedBridgeSdk.buildTrackingConsent(
            forge.anElementFrom("granted", "GRANTED")
        )

        // Then
        assertThat(consent).isEqualTo(TrackingConsent.GRANTED)
    }

    @Test
    fun `𝕄 build Pending consent 𝕎 buildTrackingConsent {pending}`(forge: Forge) {

        // When
        val consent = testedBridgeSdk.buildTrackingConsent(
            forge.anElementFrom("pending", "PENDING")
        )

        // Then
        assertThat(consent).isEqualTo(TrackingConsent.PENDING)
    }

    @Test
    fun `𝕄 build Granted consent 𝕎 buildTrackingConsent {not_granted}`(forge: Forge) {

        // When
        val consent = testedBridgeSdk.buildTrackingConsent(
            forge.anElementFrom("not_granted", "NOT_GRANTED")
        )

        // Then
        assertThat(consent).isEqualTo(TrackingConsent.NOT_GRANTED)
    }

    @Test
    fun `𝕄 build default Pending consent 𝕎 buildTrackingConsent {any}`(forge: Forge) {

        // When
        val consent = testedBridgeSdk.buildTrackingConsent(
            forge.anElementFrom(null, "some-type")
        )

        // Then
        assertThat(consent).isEqualTo(TrackingConsent.PENDING)
    }

    @Test
    fun `𝕄 call setTrackingConsent 𝕎 setTrackingConsent ()`(forge: Forge) {

        // Given
        val consent = forge.anElementFrom("pending", "granted", "not_granted")

        // When
        testedBridgeSdk.setTrackingConsent(consent, mockPromise)

        // Then
        verify(mockDatadog).setTrackingConsent(consent.asTrackingConsent())
    }

    @Test
    fun `𝕄 not build proxy config 𝕎 no proxy config specified`(
        @Forgery configuration: DdSdkConfiguration
    ) {

        // Given
        val config = configuration.copy(additionalConfig = null)

        // When
        val proxyConfig = testedBridgeSdk.buildProxyConfiguration(config)

        // Then
        assertThat(proxyConfig).isNull()
    }

    @Test
    fun `𝕄 not build proxy config 𝕎 buildProxyConfiguration() { type is missing }`(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        // Given
        val additionalConfig = mapOf(
            DdSdk.DD_PROXY_ADDRESS to "1.1.1.1",
            DdSdk.DD_PROXY_PORT to forge.anInt(min = 0, max = 65536)
        )
        val config = configuration.copy(additionalConfig = additionalConfig)

        // When
        val proxyConfig = testedBridgeSdk.buildProxyConfiguration(config)

        // Then
        assertThat(proxyConfig).isNull()
    }

    @Test
    fun `𝕄 not build proxy config 𝕎 buildProxyConfiguration() { wrong type is used } `(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        // Given

        val proxyType = forge.anAlphabeticalString()
        assumeTrue(proxyType.lowercase(Locale.US) !in arrayOf("http", "https", "socks"))

        val additionalConfig = mapOf(
            DdSdk.DD_PROXY_TYPE to proxyType,
            DdSdk.DD_PROXY_ADDRESS to "1.1.1.1",
            DdSdk.DD_PROXY_PORT to forge.anInt(min = 0, max = 65536)
        )
        val config = configuration.copy(additionalConfig = additionalConfig)

        // When
        val proxyConfig = testedBridgeSdk.buildProxyConfiguration(config)

        // Then
        assertThat(proxyConfig).isNull()
    }

    @Test
    fun `𝕄 not build proxy config 𝕎 buildProxyConfiguration() { address is missing }`(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        // Given
        val additionalConfig = mapOf(
            DdSdk.DD_PROXY_TYPE to forge.anElementFrom("http", "https", "socks"),
            DdSdk.DD_PROXY_PORT to forge.anInt(min = 0, max = 65536)
        )
        val config = configuration.copy(additionalConfig = additionalConfig)

        // When
        val proxyConfig = testedBridgeSdk.buildProxyConfiguration(config)

        // Then
        assertThat(proxyConfig).isNull()
    }

    @Test
    fun `𝕄 not build proxy config 𝕎 buildProxyConfiguration() { port is missing }`(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        // Given
        val additionalConfig = mapOf(
            DdSdk.DD_PROXY_TYPE to forge.anElementFrom("http", "https", "socks"),
            DdSdk.DD_PROXY_ADDRESS to "1.1.1.1"
        )
        val config = configuration.copy(additionalConfig = additionalConfig)

        // When
        val proxyConfig = testedBridgeSdk.buildProxyConfiguration(config)

        // Then
        assertThat(proxyConfig).isNull()
    }

    @Test
    fun `𝕄 build proxy configuration 𝕎 buildProxyConfiguration() { no credentials }`(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        // Given
        val proxyType = forge.anElementFrom("http", "https", "socks")

        val additionalConfig = mapOf(
            DdSdk.DD_PROXY_TYPE to proxyType,
            DdSdk.DD_PROXY_ADDRESS to "1.1.1.1",
            DdSdk.DD_PROXY_PORT to forge.anInt(min = 0, max = 65536)
        )
        val config = configuration.copy(additionalConfig = additionalConfig)

        // When
        val (proxy, authenticator) = testedBridgeSdk.buildProxyConfiguration(config)!!

        // Then
        assertThat(proxy.type()).matches {
            when (proxyType) {
                "http", "https" -> it == Proxy.Type.HTTP
                else -> it == Proxy.Type.SOCKS
            }
        }

        assertThat(proxy.address()).isNotNull

        assertThat(authenticator).isNull()
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

        val additionalConfig = mapOf(
            DdSdk.DD_PROXY_TYPE to proxyType,
            DdSdk.DD_PROXY_ADDRESS to proxyAddress,
            DdSdk.DD_PROXY_PORT to proxyPort,
            DdSdk.DD_PROXY_USERNAME to proxyUsername,
            DdSdk.DD_PROXY_PASSWORD to proxyPassword
        )
        val config = configuration.copy(additionalConfig = additionalConfig)

        // When
        val (proxy, authenticator) = testedBridgeSdk.buildProxyConfiguration(config)!!

        // Then
        assertThat(proxy.type()).matches {
            when (proxyType) {
                "http", "https" -> it == Proxy.Type.HTTP
                else -> it == Proxy.Type.SOCKS
            }
        }

        assertThat(proxy.address()).isNotNull
        assertThat(proxy.address()).isInstanceOf(InetSocketAddress::class.java)
        (proxy.address() as InetSocketAddress).let {
            assertThat(it.port).isEqualTo(proxyPort)
            assertThat(it.address.hostAddress).isEqualTo(proxyAddress)
        }

        assertThat(authenticator).isNotNull
        assertThat(authenticator?.username).isEqualTo(proxyUsername)
        assertThat(authenticator?.password).isEqualTo(proxyPassword)
    }

    // endregion

    // region Internal

    private fun String?.asTrackingConsent(): TrackingConsent {
        return when (this?.lowercase(Locale.US)) {
            "pending" -> TrackingConsent.PENDING
            "granted" -> TrackingConsent.GRANTED
            "not_granted" -> TrackingConsent.NOT_GRANTED
            else -> TrackingConsent.PENDING
        }
    }

    // endregion

    companion object {
        const val ONE_HUNDRED_MILLISSECOND_NS: Long = 100 * 1000L * 1000L
        const val ONE_SECOND_NS: Long = 1000L * 1000L * 1000L
    }
}
