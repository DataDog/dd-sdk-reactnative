package com.datadog.reactnative

import android.util.Log
import android.content.pm.PackageInfo
import com.datadog.android.DatadogEndpoint
import com.datadog.android.core.configuration.BatchSize
import com.datadog.android.core.configuration.Configuration
import com.datadog.android.core.configuration.Credentials
import com.datadog.android.core.configuration.UploadFrequency
import com.datadog.android.core.configuration.VitalsUpdateFrequency
import com.datadog.android.plugin.DatadogPlugin
import com.datadog.android.privacy.TrackingConsent
import com.datadog.android.rum.tracking.ActivityViewTrackingStrategy
import com.datadog.tools.unit.GenericAssert.Companion.assertThat
import com.datadog.tools.unit.forge.BaseConfigurator
import com.datadog.tools.unit.toReadableJavaOnlyMap
import com.datadog.tools.unit.toReadableMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.argumentCaptor
import com.nhaarman.mockitokotlin2.doReturn
import com.nhaarman.mockitokotlin2.eq
import com.nhaarman.mockitokotlin2.inOrder
import com.nhaarman.mockitokotlin2.isNull
import com.nhaarman.mockitokotlin2.never
import com.nhaarman.mockitokotlin2.same
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.whenever
import fr.xgouchet.elmyr.Forge
import fr.xgouchet.elmyr.annotation.AdvancedForgery
import fr.xgouchet.elmyr.annotation.Forgery
import fr.xgouchet.elmyr.annotation.IntForgery
import fr.xgouchet.elmyr.annotation.MapForgery
import fr.xgouchet.elmyr.annotation.StringForgery
import fr.xgouchet.elmyr.annotation.StringForgeryType
import fr.xgouchet.elmyr.junit5.ForgeConfiguration
import fr.xgouchet.elmyr.junit5.ForgeExtension
import java.net.InetSocketAddress
import java.net.Proxy
import java.util.Locale
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.Mock
import org.mockito.Answers
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
@ForgeConfiguration(BaseConfigurator::class)
internal class DdSdkTest {

    lateinit var testedBridgeSdk: DdSdk

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    lateinit var mockContext: ReactApplicationContext

    @Mock
    lateinit var mockDatadog: DatadogWrapper

    @Forgery
    lateinit var fakeConfiguration: DdSdkConfiguration

    @Mock
    lateinit var mockPromise: Promise

    @Forgery
    lateinit var mockPackageInfo: PackageInfo

    @BeforeEach
    fun `set up`() {
        whenever(mockContext.applicationContext) doReturn mockContext
        whenever(mockContext.packageName) doReturn "packageName"
        whenever(mockContext.packageManager.getPackageInfo("packageName", 0)) doReturn mockPackageInfo
        testedBridgeSdk = DdSdk(mockContext, mockDatadog)
    }

    @AfterEach
    fun `tear down`() {
        GlobalState.globalAttributes.clear()
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
                it.hasFieldEqualTo("firstPartyHosts", emptyList<String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
                it.hasFieldEqualTo("uploadFrequency", UploadFrequency.AVERAGE)
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
                it.hasFieldEqualTo("firstPartyHosts", emptyList<String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
                it.hasFieldEqualTo("uploadFrequency", UploadFrequency.AVERAGE)
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
                it.hasFieldEqualTo("firstPartyHosts", emptyList<String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
                it.hasFieldEqualTo("uploadFrequency", UploadFrequency.AVERAGE)
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
                it.hasFieldEqualTo("firstPartyHosts", emptyList<String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
                it.hasFieldEqualTo("uploadFrequency", UploadFrequency.AVERAGE)
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
                it.hasFieldEqualTo("vitalsMonitorUpdateFrequency", VitalsUpdateFrequency.AVERAGE)
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
                it.hasFieldEqualTo("firstPartyHosts", emptyList<String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
                it.hasFieldEqualTo("uploadFrequency", UploadFrequency.AVERAGE)
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
                it.hasFieldEqualTo("firstPartyHosts", emptyList<String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
                it.hasFieldEqualTo("uploadFrequency", UploadFrequency.AVERAGE)
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
                it.hasFieldEqualTo("firstPartyHosts", emptyList<String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
                it.hasFieldEqualTo("uploadFrequency", UploadFrequency.AVERAGE)
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
                it.hasFieldEqualTo("firstPartyHosts", emptyList<String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
                it.hasFieldEqualTo("uploadFrequency", UploadFrequency.AVERAGE)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.LOGS_US1)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.TRACES_US1)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("rumConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.RUM_US1)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("crashReportConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.LOGS_US1)
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
                it.hasFieldEqualTo("firstPartyHosts", emptyList<String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
                it.hasFieldEqualTo("uploadFrequency", UploadFrequency.AVERAGE)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.LOGS_US1)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.TRACES_US1)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("rumConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.RUM_US1)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("crashReportConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.LOGS_US1)
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
                it.hasFieldEqualTo("firstPartyHosts", emptyList<String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
                it.hasFieldEqualTo("uploadFrequency", UploadFrequency.AVERAGE)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.LOGS_US3)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.TRACES_US3)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("rumConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.RUM_US3)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("crashReportConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.LOGS_US3)
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
                it.hasFieldEqualTo("firstPartyHosts", emptyList<String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
                it.hasFieldEqualTo("uploadFrequency", UploadFrequency.AVERAGE)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.LOGS_US5)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.TRACES_US5)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("rumConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.RUM_US5)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("crashReportConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.LOGS_US5)
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
                it.hasFieldEqualTo("firstPartyHosts", emptyList<String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
                it.hasFieldEqualTo("uploadFrequency", UploadFrequency.AVERAGE)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.LOGS_US1_FED)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.TRACES_US1_FED)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("rumConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.RUM_US1_FED)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("crashReportConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.LOGS_US1_FED)
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
                it.hasFieldEqualTo("firstPartyHosts", emptyList<String>())
                it.hasFieldEqualTo("batchSize", BatchSize.MEDIUM)
                it.hasFieldEqualTo("uploadFrequency", UploadFrequency.AVERAGE)
            }
            .hasField("logsConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.LOGS_EU1)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("tracesConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.TRACES_EU1)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("rumConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.RUM_EU1)
                it.hasFieldEqualTo("plugins", emptyList<DatadogPlugin>())
            }
            .hasField("crashReportConfig") {
                it.hasFieldEqualTo("endpointUrl", DatadogEndpoint.LOGS_EU1)
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
        // floating-point type (coming from JS) and integer type (other frameworks)
        val threshold = forge.anElementFrom(
            forge.aLong(min = 0, max = 65536),
            forge.aDouble(min = 0.0, max = 65536.0)
        )

        // Given
        val bridgeConfiguration = configuration.copy(
            additionalConfig = mapOf(
                DdSdk.DD_LONG_TASK_THRESHOLD to threshold
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
    fun `𝕄 set first party hosts 𝕎 initialize() {first party hosts}`(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        val firstPartyHosts = forge.aList { forge.aStringMatching("[a-z]+\\.[a-z]{3}") }

        // Given
        val bridgeConfiguration = configuration.copy(
            additionalConfig = mapOf(
                DdSdk.DD_FIRST_PARTY_HOSTS to firstPartyHosts
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
                coreConfig.hasFieldEqualTo("firstPartyHosts", firstPartyHosts)
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
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {never vitals frequency update}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            vitalsUpdateFrequency = "NEVER"
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
}
