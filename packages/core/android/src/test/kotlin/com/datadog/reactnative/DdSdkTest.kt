/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.pm.PackageInfo
import android.os.Looper
import android.util.Log
import android.view.Choreographer
import com.datadog.android.DatadogSite
import com.datadog.android.core.configuration.BatchProcessingLevel
import com.datadog.android.core.configuration.BatchSize
import com.datadog.android.core.configuration.Configuration
import com.datadog.android.core.configuration.UploadFrequency
import com.datadog.android.event.EventMapper
import com.datadog.android.log.Logs
import com.datadog.android.log.LogsConfiguration
import com.datadog.android.privacy.TrackingConsent
import com.datadog.android.rum.Rum
import com.datadog.android.rum.RumConfiguration
import com.datadog.android.rum.RumPerformanceMetric
import com.datadog.android.rum._RumInternalProxy
import com.datadog.android.rum.configuration.VitalsUpdateFrequency
import com.datadog.android.rum.metric.networksettled.TimeBasedInitialResourceIdentifier
import com.datadog.android.rum.model.ActionEvent
import com.datadog.android.rum.model.ResourceEvent
import com.datadog.android.rum.tracking.ActivityViewTrackingStrategy
import com.datadog.android.telemetry.model.TelemetryConfigurationEvent
import com.datadog.android.trace.Trace
import com.datadog.android.trace.TraceConfiguration
import com.datadog.android.trace.TracingHeaderType
import com.datadog.tools.unit.GenericAssert.Companion.assertThat
import com.datadog.tools.unit.MockRumMonitor
import com.datadog.tools.unit.TestUiThreadExecutor
import com.datadog.tools.unit.forge.BaseConfigurator
import com.datadog.tools.unit.setStaticValue
import com.datadog.tools.unit.toReadableArray
import com.datadog.tools.unit.toReadableJavaOnlyMap
import com.datadog.tools.unit.toReadableMap
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import fr.xgouchet.elmyr.Forge
import fr.xgouchet.elmyr.annotation.AdvancedForgery
import fr.xgouchet.elmyr.annotation.BoolForgery
import fr.xgouchet.elmyr.annotation.DoubleForgery
import fr.xgouchet.elmyr.annotation.Forgery
import fr.xgouchet.elmyr.annotation.IntForgery
import fr.xgouchet.elmyr.annotation.LongForgery
import fr.xgouchet.elmyr.annotation.MapForgery
import fr.xgouchet.elmyr.annotation.StringForgery
import fr.xgouchet.elmyr.annotation.StringForgeryType
import fr.xgouchet.elmyr.junit5.ForgeConfiguration
import fr.xgouchet.elmyr.junit5.ForgeExtension
import java.util.Locale
import java.util.stream.Stream
import kotlin.time.Duration.Companion.seconds
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.data.Offset
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.Arguments
import org.junit.jupiter.params.provider.MethodSource
import org.mockito.Answers
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.doNothing
import org.mockito.kotlin.doReturn
import org.mockito.kotlin.doThrow
import org.mockito.kotlin.eq
import org.mockito.kotlin.inOrder
import org.mockito.kotlin.isNull
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.same
import org.mockito.kotlin.verify
import org.mockito.kotlin.verifyNoInteractions
import org.mockito.kotlin.whenever
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
@ForgeConfiguration(value = BaseConfigurator::class)
internal class DdSdkTest {
    lateinit var testedBridgeSdk: DdSdkImplementation

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    lateinit var mockReactContext: ReactApplicationContext

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    lateinit var mockContext: ReactApplicationContext

    @Mock
    lateinit var mockRumMonitor: MockRumMonitor

    @Mock
    lateinit var mockRumInternalProxy: _RumInternalProxy

    @Mock
    lateinit var mockDatadog: DatadogWrapper

    @Mock
    lateinit var mockDdTelemetry: DdTelemetry

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
        val mockLooper = mock<Looper>()
        whenever(mockLooper.thread) doReturn Thread.currentThread()
        Looper::class.java.setStaticValue("sMainLooper", mockLooper)

        whenever(mockDatadog.getRumMonitor()) doReturn mockRumMonitor
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
        testedBridgeSdk = DdSdkImplementation(
            mockReactContext,
            mockDatadog,
            mockDdTelemetry,
            TestUiThreadExecutor()
        )

        DatadogSDKWrapperStorage.onInitializedListeners.clear()
    }

    @AfterEach
    fun `tear down`() {
        GlobalState.globalAttributes.clear()
    }

    // region initialize / nativeCrashReportEnabled

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {nativeCrashReportEnabled=true}`() {
        // Given
        val rumConfiguration = fakeConfiguration.rumConfiguration?.copy(
            nativeCrashReportEnabled = true
        )
        val bridgeConfiguration = fakeConfiguration.copy(rumConfiguration = rumConfiguration)
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") {
                    it.hasFieldEqualTo("needsClearTextHttp", false)
                    it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                }
                .hasFieldEqualTo("clientToken", fakeConfiguration.clientToken)
                .hasFieldEqualTo("env", fakeConfiguration.env)
                .hasFieldEqualTo("variant", "")
                .hasFieldEqualTo("crashReportsEnabled", true)
                .hasFieldEqualTo(
                    "additionalConfig",
                    fakeConfiguration.additionalConfiguration?.filterValues { it != null }.orEmpty()
                )
            assertThat(rumConfigCaptor.firstValue)
                .hasFieldEqualTo("applicationId", fakeConfiguration.rumConfiguration?.applicationId)
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {nativeCrashReportEnabled=false}`() {
        // Given
        val rumConfiguration = fakeConfiguration.rumConfiguration?.copy(
            nativeCrashReportEnabled = false
        )
        fakeConfiguration = fakeConfiguration.copy(site = null, rumConfiguration = rumConfiguration)
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") {
                    it.hasFieldEqualTo("needsClearTextHttp", false)
                    it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                }
                .hasFieldEqualTo("clientToken", fakeConfiguration.clientToken)
                .hasFieldEqualTo("env", fakeConfiguration.env)
                .hasFieldEqualTo("variant", "")
                .hasFieldEqualTo("crashReportsEnabled", false)
                .hasFieldEqualTo(
                    "additionalConfig",
                    fakeConfiguration.additionalConfiguration?.filterValues { it != null }.orEmpty()
                )
            assertThat(rumConfigCaptor.firstValue)
                .hasFieldEqualTo("applicationId", fakeConfiguration.rumConfiguration?.applicationId)
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {nativeCrashReportEnabled=null}`() {
        // Given
        val rumConfiguration = fakeConfiguration.rumConfiguration?.copy(
            nativeCrashReportEnabled = false
        )
        fakeConfiguration = fakeConfiguration.copy(site = null, rumConfiguration = rumConfiguration)

        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") {
                    it.hasFieldEqualTo("needsClearTextHttp", false)
                    it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                }
                .hasFieldEqualTo("clientToken", fakeConfiguration.clientToken)
                .hasFieldEqualTo("env", fakeConfiguration.env)
                .hasFieldEqualTo("variant", "")
                .hasFieldEqualTo("crashReportsEnabled", false)
                .hasFieldEqualTo(
                    "additionalConfig",
                    fakeConfiguration.additionalConfiguration?.filterValues { it != null }.orEmpty()
                )
            assertThat(rumConfigCaptor.firstValue)
                .hasFieldEqualTo("applicationId", fakeConfiguration.rumConfiguration?.applicationId)
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    // endregion

    // region initialize / sampleRate

    @Test
    fun `𝕄 initialize native with sample rate SDK 𝕎 initialize() {}`() {
        // Given
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()
        val expectedRumSampleRate = fakeConfiguration.rumConfiguration?.sessionSampleRate?.toFloat() ?: 100f // ktlint-disable-line max-line-length

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }
            // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") {
                    it.hasFieldEqualTo("needsClearTextHttp", false)
                    it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                }
                .hasFieldEqualTo("clientToken", fakeConfiguration.clientToken)
                .hasFieldEqualTo("env", fakeConfiguration.env)
                .hasFieldEqualTo("variant", "")
                .hasFieldEqualTo(
                    "additionalConfig",
                    fakeConfiguration.additionalConfiguration?.filterValues { it != null }.orEmpty()
                )
            assertThat(rumConfigCaptor.firstValue)
                .hasFieldEqualTo("applicationId", fakeConfiguration.rumConfiguration?.applicationId)
                .hasField("featureConfiguration") {
                    it.hasFieldEqualTo("sampleRate", expectedRumSampleRate)
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    // endregion

    // region initialize / telemetry sample rate

    @Test
    fun `𝕄 initialize native with telemetry sample rate SDK 𝕎 initialize() {}`() {
        // Given
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()
        val expectedTelemetrySampleRate = fakeConfiguration.rumConfiguration?.telemetrySampleRate?.toFloat() ?: 20f // ktlint-disable-line max-line-length

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }
            // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") {
                    it.hasFieldEqualTo("needsClearTextHttp", false)
                    it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                }
                .hasFieldEqualTo("clientToken", fakeConfiguration.clientToken)
                .hasFieldEqualTo("env", fakeConfiguration.env)
                .hasFieldEqualTo("variant", "")
                .hasFieldEqualTo(
                    "additionalConfig",
                    fakeConfiguration.additionalConfiguration?.filterValues { it != null }.orEmpty()
                )
            assertThat(rumConfigCaptor.firstValue)
                .hasFieldEqualTo("applicationId", fakeConfiguration.rumConfiguration?.applicationId)
                .hasField("featureConfiguration") {
                    it.hasFieldEqualTo("telemetrySampleRate", expectedTelemetrySampleRate)
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    // endregion

    // region initialize / additionalConfig

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {additionalConfig=null}`() {
        // Given
        fakeConfiguration = fakeConfiguration.copy(additionalConfiguration = null)
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") {
                    it.hasFieldEqualTo("needsClearTextHttp", false)
                    it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                }
                .hasFieldEqualTo("clientToken", fakeConfiguration.clientToken)
                .hasFieldEqualTo("env", fakeConfiguration.env)
                .hasFieldEqualTo("variant", "")
                .hasFieldEqualTo("additionalConfig", emptyMap<String, Any?>())
            assertThat(rumConfigCaptor.firstValue)
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {additionalConfig=nonNull}`() {
        // Given
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }
            // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") {
                    it.hasFieldEqualTo("needsClearTextHttp", false)
                    it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                }
                .hasFieldEqualTo("clientToken", fakeConfiguration.clientToken)
                .hasFieldEqualTo("env", fakeConfiguration.env)
                .hasFieldEqualTo("variant", "")
                .hasFieldEqualTo(
                    "additionalConfig",
                    fakeConfiguration.additionalConfiguration?.filterValues { it != null }.orEmpty()
                )
            assertThat(rumConfigCaptor.firstValue)
                .hasFieldEqualTo("applicationId", fakeConfiguration.rumConfiguration?.applicationId)
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    // endregion

    // region initialize / site

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {site=null}`(
        forge: Forge
    ) {
        // Given
        val rumConfiguration = fakeConfiguration.rumConfiguration?.copy(
            nativeCrashReportEnabled = true
        )
        fakeConfiguration = fakeConfiguration.copy(site = null, rumConfiguration = rumConfiguration)
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") {
                    it.hasFieldEqualTo("needsClearTextHttp", false)
                    it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                    it.hasFieldEqualTo("site", DatadogSite.US1)
                }
                .hasFieldEqualTo("clientToken", fakeConfiguration.clientToken)
                .hasFieldEqualTo("env", fakeConfiguration.env)
                .hasFieldEqualTo("variant", "")
                .hasFieldEqualTo(
                    "additionalConfig",
                    fakeConfiguration.additionalConfiguration?.filterValues { it != null }.orEmpty()
                )
            assertThat(rumConfigCaptor.firstValue)
                .hasFieldEqualTo("applicationId", fakeConfiguration.rumConfiguration?.applicationId)
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {site=us1}`(
        forge: Forge
    ) {
        // Given
        val site = forge.randomizeCase("us1")
        val rumConfiguration = fakeConfiguration.rumConfiguration?.copy(
            nativeCrashReportEnabled = true
        )
        fakeConfiguration = fakeConfiguration.copy(site = site, rumConfiguration = rumConfiguration)
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") {
                    it.hasFieldEqualTo("needsClearTextHttp", false)
                    it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                    it.hasFieldEqualTo("site", DatadogSite.US1)
                }
                .hasFieldEqualTo("clientToken", fakeConfiguration.clientToken)
                .hasFieldEqualTo("env", fakeConfiguration.env)
                .hasFieldEqualTo("variant", "")
                .hasFieldEqualTo(
                    "additionalConfig",
                    fakeConfiguration.additionalConfiguration?.filterValues { it != null }.orEmpty()
                )
            assertThat(rumConfigCaptor.firstValue)
                .hasFieldEqualTo("applicationId", fakeConfiguration.rumConfiguration?.applicationId)
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {site=us3}`(
        forge: Forge
    ) {
        // Given
        val site = forge.randomizeCase("us3")
        val rumConfiguration = fakeConfiguration.rumConfiguration?.copy(
            nativeCrashReportEnabled = true
        )
        fakeConfiguration = fakeConfiguration.copy(site = site, rumConfiguration = rumConfiguration)
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") {
                    it.hasFieldEqualTo("needsClearTextHttp", false)
                    it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                    it.hasFieldEqualTo("site", DatadogSite.US3)
                }
                .hasFieldEqualTo("clientToken", fakeConfiguration.clientToken)
                .hasFieldEqualTo("env", fakeConfiguration.env)
                .hasFieldEqualTo("variant", "")
                .hasFieldEqualTo(
                    "additionalConfig",
                    fakeConfiguration.additionalConfiguration?.filterValues { it != null }.orEmpty()
                )
            assertThat(rumConfigCaptor.firstValue)
                .hasFieldEqualTo("applicationId", fakeConfiguration.rumConfiguration?.applicationId)
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {site=us5}`(
        forge: Forge
    ) {
        // Given
        val site = forge.randomizeCase("us5")
        val rumConfiguration = fakeConfiguration.rumConfiguration?.copy(
            nativeCrashReportEnabled = true
        )
        fakeConfiguration = fakeConfiguration.copy(site = site, rumConfiguration = rumConfiguration)
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") {
                    it.hasFieldEqualTo("needsClearTextHttp", false)
                    it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                    it.hasFieldEqualTo("site", DatadogSite.US5)
                }
                .hasFieldEqualTo("clientToken", fakeConfiguration.clientToken)
                .hasFieldEqualTo("env", fakeConfiguration.env)
                .hasFieldEqualTo("variant", "")
                .hasFieldEqualTo(
                    "additionalConfig",
                    fakeConfiguration.additionalConfiguration?.filterValues { it != null }.orEmpty()
                )
            assertThat(rumConfigCaptor.firstValue)
                .hasFieldEqualTo("applicationId", fakeConfiguration.rumConfiguration?.applicationId)
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {site=us1_fed}`(
        forge: Forge
    ) {
        // Given
        val site = forge.randomizeCase("us1_fed")
        val rumConfiguration = fakeConfiguration.rumConfiguration?.copy(
            nativeCrashReportEnabled = true
        )
        fakeConfiguration = fakeConfiguration.copy(site = site, rumConfiguration = rumConfiguration)
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") {
                    it.hasFieldEqualTo("needsClearTextHttp", false)
                    it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                    it.hasFieldEqualTo("site", DatadogSite.US1_FED)
                }
                .hasFieldEqualTo("clientToken", fakeConfiguration.clientToken)
                .hasFieldEqualTo("env", fakeConfiguration.env)
                .hasFieldEqualTo("variant", "")
                .hasFieldEqualTo(
                    "additionalConfig",
                    fakeConfiguration.additionalConfiguration?.filterValues { it != null }.orEmpty()
                )
            assertThat(rumConfigCaptor.firstValue)
                .hasFieldEqualTo("applicationId", fakeConfiguration.rumConfiguration?.applicationId)
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {site=eu1}`(
        forge: Forge
    ) {
        // Given
        val site = forge.randomizeCase("eu1")
        val rumConfiguration = fakeConfiguration.rumConfiguration?.copy(
            nativeCrashReportEnabled = true
        )
        fakeConfiguration = fakeConfiguration.copy(site = site, rumConfiguration = rumConfiguration)
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") {
                    it.hasFieldEqualTo("needsClearTextHttp", false)
                    it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                    it.hasFieldEqualTo("site", DatadogSite.EU1)
                }
                .hasFieldEqualTo("clientToken", fakeConfiguration.clientToken)
                .hasFieldEqualTo("env", fakeConfiguration.env)
                .hasFieldEqualTo("variant", "")
                .hasFieldEqualTo(
                    "additionalConfig",
                    fakeConfiguration.additionalConfiguration?.filterValues { it != null }.orEmpty()
                )
            assertThat(rumConfigCaptor.firstValue)
                .hasFieldEqualTo("applicationId", fakeConfiguration.rumConfiguration?.applicationId)
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {site=ap1}`(
        forge: Forge
    ) {
        // Given
        val site = forge.randomizeCase("ap1")
        val rumConfiguration = fakeConfiguration.rumConfiguration?.copy(
            nativeCrashReportEnabled = true
        )
        fakeConfiguration = fakeConfiguration.copy(site = site, rumConfiguration = rumConfiguration)
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") {
                    it.hasFieldEqualTo("needsClearTextHttp", false)
                    it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                    it.hasFieldEqualTo("site", DatadogSite.AP1)
                }
                .hasFieldEqualTo("clientToken", fakeConfiguration.clientToken)
                .hasFieldEqualTo("env", fakeConfiguration.env)
                .hasFieldEqualTo("variant", "")
                .hasFieldEqualTo(
                    "additionalConfig",
                    fakeConfiguration.additionalConfiguration?.filterValues { it != null }.orEmpty()
                )
            assertThat(rumConfigCaptor.firstValue)
                .hasFieldEqualTo("applicationId", fakeConfiguration.rumConfiguration?.applicationId)
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {site=ap2}`(
        forge: Forge
    ) {
        // Given
        val site = forge.randomizeCase("ap2")
        val rumConfiguration = fakeConfiguration.rumConfiguration?.copy(
            nativeCrashReportEnabled = true
        )
        fakeConfiguration = fakeConfiguration.copy(site = site, rumConfiguration = rumConfiguration)
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") {
                    it.hasFieldEqualTo("needsClearTextHttp", false)
                    it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                    it.hasFieldEqualTo("site", DatadogSite.AP2)
                }
                .hasFieldEqualTo("clientToken", fakeConfiguration.clientToken)
                .hasFieldEqualTo("env", fakeConfiguration.env)
                .hasFieldEqualTo("variant", "")
                .hasFieldEqualTo(
                    "additionalConfig",
                    fakeConfiguration.additionalConfiguration?.filterValues { it != null }.orEmpty()
                )
            assertThat(rumConfigCaptor.firstValue)
                .hasFieldEqualTo("applicationId", fakeConfiguration.rumConfiguration?.applicationId)
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    // endregion

    // region initialize / additionalConfig

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {trackingConsent=null}`() {
        // Given
        fakeConfiguration = fakeConfiguration.copy(trackingConsent = null)
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    eq(TrackingConsent.PENDING)
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {trackingConsent=PENDING}`(
        forge: Forge
    ) {
        // Given
        val consent = forge.randomizeCase("PENDING")
        fakeConfiguration = fakeConfiguration.copy(trackingConsent = consent)
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    eq(TrackingConsent.PENDING)
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {trackingConsent=GRANTED}`(
        forge: Forge
    ) {
        // Given
        val consent = forge.randomizeCase("GRANTED")
        fakeConfiguration = fakeConfiguration.copy(trackingConsent = consent)
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    eq(TrackingConsent.GRANTED)
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {trackingConsent=NOT_GRANTED}`(
        forge: Forge
    ) {
        // Given
        val consent = forge.randomizeCase("NOT_GRANTED")
        fakeConfiguration = fakeConfiguration.copy(trackingConsent = consent)
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    eq(TrackingConsent.NOT_GRANTED)
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    // endregion

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {no view tracking}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val rumConfiguration = configuration.rumConfiguration?.copy(nativeViewTracking = false)
        val bridgeConfiguration = configuration.copy(
            rumConfiguration = rumConfiguration
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") {
                    it.hasFieldEqualTo("viewTrackingStrategy", NoOpViewTrackingStrategy)
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {with view tracking}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val rumConfiguration = configuration.rumConfiguration?.copy(nativeViewTracking = true)
        val bridgeConfiguration = configuration.copy(
            rumConfiguration = rumConfiguration
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") {
                    it.hasFieldEqualTo("viewTrackingStrategy", ActivityViewTrackingStrategy(false))
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {no user action tracking}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val rumConfiguration = configuration.rumConfiguration?.copy(
            nativeInteractionTracking = false
        )
        val bridgeConfiguration = configuration.copy(
            rumConfiguration = rumConfiguration
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") {
                    it.hasFieldEqualTo("userActionTracking", false)
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {frustration tracking enabled}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val rumConfiguration = configuration.rumConfiguration?.copy(trackFrustrations = true)
        val bridgeConfiguration = configuration.copy(
            rumConfiguration = rumConfiguration
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") {
                    it.hasFieldEqualTo("trackFrustrations", true)
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {frustration tracking disabled}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val rumConfiguration = configuration.rumConfiguration?.copy(trackFrustrations = false)
        val bridgeConfiguration = configuration.copy(
            rumConfiguration = rumConfiguration
        )

        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") {
                    it.hasFieldEqualTo("trackFrustrations", false)
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {with user action tracking}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val rumConfiguration = configuration.rumConfiguration?.copy(
            nativeInteractionTracking = true
        )
        val bridgeConfiguration = configuration.copy(
            rumConfiguration = rumConfiguration
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }

            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") {
                    it.hasFieldEqualTo("userActionTracking", true)
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
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
            verbosity = verbosityName
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
            verbosity = verbosity
        )

        // When
        testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        verify(mockDatadog, never()).setVerbosity(any())
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {custom service name}`(
        @Forgery configuration: DdSdkConfiguration,
        @StringForgery service: String
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            service = service
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") {
                    it.hasFieldEqualTo("needsClearTextHttp", false)
                    it.hasFieldEqualTo("firstPartyHostsWithHeaderTypes", emptyMap<String, String>())
                }
                .hasFieldEqualTo("clientToken", bridgeConfiguration.clientToken)
                .hasFieldEqualTo("env", bridgeConfiguration.env)
                .hasFieldEqualTo("variant", "")
                .hasFieldEqualTo("service", service)
                .hasFieldEqualTo(
                    "additionalConfig",
                    bridgeConfiguration.additionalConfiguration?.filterValues { it != null }.orEmpty() // ktlint-disable-line max-line-length
                )
            assertThat(rumConfigCaptor.firstValue)
                .hasFieldEqualTo(
                    "applicationId",
                    bridgeConfiguration.rumConfiguration?.applicationId
                )
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 set long task threshold 𝕎 initialize() {custom long task threshold}`(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        val threshold = forge.aDouble(min = 100.0, max = 65536.0)

        // Given
        val rumConfiguration = configuration.rumConfiguration?.copy(
            nativeLongTaskThresholdMs = threshold
        )
        val bridgeConfiguration = configuration.copy(rumConfiguration = rumConfiguration)

        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") { rumConfig ->
                    rumConfig.hasField("longTaskTrackingStrategy") { longTaskTrackingStrategy ->
                        longTaskTrackingStrategy
                            .isInstanceOf(
                                "com.datadog.android.rum.internal.instrumentation." +
                                    "MainLooperLongTaskStrategy"
                            )
                            .hasFieldEqualTo("thresholdMs", threshold.toLong())
                    }
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 not set long task threshold 𝕎 initialize() {long task threshold is 0}`(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        // Given
        val rumConfiguration = configuration.rumConfiguration?.copy(
            nativeLongTaskThresholdMs = 0.0
        )
        val bridgeConfiguration = configuration.copy(rumConfiguration = rumConfiguration)
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") { rumConfig ->
                    rumConfig.doesNotHaveField("longTaskTrackingStrategy")
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
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
                        it.name.lowercase(Locale.US)
                    }.toReadableArray()
                ).toReadableMap()
            )
        }

        // Given
        val bridgeConfiguration = configuration.copy(
            firstPartyHosts = firstPartyHosts.toReadableArray().asFirstPartyHosts()
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") { coreConfig ->
                    coreConfig.hasFieldEqualTo(
                        "firstPartyHostsWithHeaderTypes",
                        tracingHosts
                    )
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
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
                    TracingHeaderType.DATADOG
                )
            )
        }

        val firstPartyHosts = mutableListOf<ReadableMap>()
        tracingHosts.forEach { (match) ->
            firstPartyHosts.add(
                mapOf(
                    "match" to match,
                    "propagatorTypes" to listOf(
                        TracingHeaderType.DATADOG.name.lowercase(Locale.US),
                        forge.aString()
                    ).toReadableArray()
                ).toReadableMap()
            )
        }

        // Given
        val bridgeConfiguration = configuration.copy(
            firstPartyHosts = firstPartyHosts.toReadableArray().asFirstPartyHosts()
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") { coreConfig ->
                    coreConfig.hasFieldEqualTo(
                        "firstPartyHostsWithHeaderTypes",
                        tracingHosts
                    )
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
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
                    TracingHeaderType.B3
                )
            )
        )

        val firstPartyHosts = mutableListOf<ReadableMap>()
        firstPartyHosts.add(
            mapOf(
                "match" to host,
                "propagatorTypes" to listOf(
                    TracingHeaderType.DATADOG.name.lowercase(Locale.US)
                ).toReadableArray()
            ).toReadableMap()
        )
        firstPartyHosts.add(
            mapOf(
                "match" to host,
                "propagatorTypes" to listOf(
                    TracingHeaderType.B3.name.lowercase(Locale.US)
                ).toReadableArray()
            ).toReadableMap()
        )

        // Given
        val bridgeConfiguration = configuration.copy(
            firstPartyHosts = firstPartyHosts.toReadableArray().asFirstPartyHosts()
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") { coreConfig ->
                    coreConfig.hasFieldEqualTo(
                        "firstPartyHostsWithHeaderTypes",
                        tracingHosts
                    )
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @ParameterizedTest
    @MethodSource("provideUploadFrequency")
    fun `𝕄 initialize native SDK 𝕎 initialize() {upload frequency}`(
        input: String,
        expectedUploadFrequency: UploadFrequency,
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            uploadFrequency = input
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") { coreConfig ->
                    coreConfig.hasFieldEqualTo(
                        "uploadFrequency",
                        expectedUploadFrequency
                    )
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @ParameterizedTest
    @MethodSource("provideBatchSize")
    fun `𝕄 initialize native SDK 𝕎 initialize() {batch size}`(
        input: String,
        expectedBatchSize: BatchSize,
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            batchSize = input
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") { coreConfig ->
                    coreConfig.hasFieldEqualTo(
                        "batchSize",
                        expectedBatchSize
                    )
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @ParameterizedTest
    @MethodSource("provideBatchProcessingLevel")
    fun `𝕄 initialize native SDK 𝕎 initialize() {batch processing level}`(
        input: String,
        expectedBatchSize: BatchProcessingLevel,
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val bridgeConfiguration = configuration.copy(
            batchProcessingLevel = input
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasField("coreConfig") { coreConfig ->
                    coreConfig.hasFieldEqualTo(
                        "batchProcessingLevel",
                        expectedBatchSize
                    )
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {trackBackgroundEvents}`(
        @Forgery configuration: DdSdkConfiguration,
        forge: Forge
    ) {
        // Given
        val trackBackgroundEvents = forge.aNullable { forge.aBool() }
        val rumConfiguration = configuration.rumConfiguration?.copy(
            trackBackgroundEvents = trackBackgroundEvents
        )
        val bridgeConfiguration = configuration.copy(
            rumConfiguration = rumConfiguration
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") {
                    it.hasFieldEqualTo("backgroundEventTracking", trackBackgroundEvents ?: false)
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {rare vitals frequency update}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val rumConfiguration = configuration.rumConfiguration?.copy(vitalsUpdateFrequency = "RARE")
        val bridgeConfiguration = configuration.copy(
            rumConfiguration = rumConfiguration
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { }

            // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") {
                    it.hasFieldEqualTo("vitalsMonitorUpdateFrequency", VitalsUpdateFrequency.RARE)
                }

            argumentCaptor<Choreographer.FrameCallback> {
                verify(mockChoreographer).postFrameCallback(capture())
                assertThat(firstValue).isInstanceOf(FpsFrameCallback::class.java)
            }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {never vitals frequency update}`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        doThrow(IllegalStateException()).whenever(mockChoreographer).postFrameCallback(any())
        val rumConfiguration = configuration.rumConfiguration?.copy(
            vitalsUpdateFrequency = "NEVER",
            longTaskThresholdMs = 0.0
        )
        val bridgeConfiguration = configuration.copy(
            rumConfiguration = rumConfiguration
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { } // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") {
                    it.hasFieldEqualTo("vitalsMonitorUpdateFrequency", VitalsUpdateFrequency.NEVER)
                }
            verifyNoInteractions(mockChoreographer)
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
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
        val rumConfiguration = configuration.rumConfiguration?.copy(
            vitalsUpdateFrequency = fakeFrequency,
            longTaskThresholdMs = 0.0
        )
        val bridgeConfiguration = configuration.copy(
            rumConfiguration = rumConfiguration
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()
        val frameDurationNs = threshold + frameDurationOverThreshold

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { } // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") {
                    it.hasFieldEqualTo(
                        "vitalsMonitorUpdateFrequency",
                        VitalsUpdateFrequency.AVERAGE
                    )
                }
            argumentCaptor<Choreographer.FrameCallback> {
                verify(mockChoreographer).postFrameCallback(capture())
                assertThat(firstValue).isInstanceOf(FpsFrameCallback::class.java)

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
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
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
        val rumConfiguration = configuration.rumConfiguration?.copy(
            vitalsUpdateFrequency = "AVERAGE",
            longTaskThresholdMs = (threshold / 1_000_000).toDouble()
        )
        val bridgeConfiguration = configuration.copy(
            rumConfiguration = rumConfiguration
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
        val rumConfiguration = configuration.rumConfiguration?.copy(
            vitalsUpdateFrequency = "NEVER",
            longTaskThresholdMs = (threshold / 1_000_000).toDouble()
        )
        val bridgeConfiguration = configuration.copy(
            rumConfiguration = rumConfiguration
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

    // region initial resource threshold TNS

    @Test
    fun `𝕄 initialize W initialize() { initialResourceThreshold is null }`(
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val rumConfiguration = configuration.rumConfiguration?.copy(
            initialResourceThreshold = null
        )
        val bridgeConfiguration = configuration.copy(
            rumConfiguration = rumConfiguration
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()
        val defaultTimeBasedIdentifier = TimeBasedInitialResourceIdentifier(100)

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { } // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }

            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") {
                    it.hasFieldEqualTo("initialResourceIdentifier", defaultTimeBasedIdentifier)
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize W initialize() { initialResourceThreshold is not null}`(
        @DoubleForgery(min = 0.1, max = 5.0) thresholdInSeconds: Double,
        @Forgery configuration: DdSdkConfiguration
    ) {
        // Given
        val rumConfiguration = configuration.rumConfiguration?.copy(
            initialResourceThreshold = thresholdInSeconds
        )
        val bridgeConfiguration = configuration.copy(
            rumConfiguration = rumConfiguration
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()
        val timeBasedIdentifier = TimeBasedInitialResourceIdentifier(
            thresholdInSeconds.seconds.inWholeMilliseconds
        )

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { } // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }

            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") {
                    it.hasFieldEqualTo("initialResourceIdentifier", timeBasedIdentifier)
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
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
            additionalConfiguration = mapOf(
                DdSdkImplementation.DD_VERSION_SUFFIX to versionSuffix
            )
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { } // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(sdkConfigCaptor.firstValue)
                .hasFieldEqualTo(
                    "additionalConfig",
                    mapOf(
                        DdSdkImplementation.DD_VERSION_SUFFIX to versionSuffix,
                        DdSdkImplementation.DD_VERSION to (
                            mockPackageInfo.versionName + versionSuffix
                            )
                    )
                )
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
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
        val rumConfiguration = configuration.rumConfiguration?.copy(
            longTaskThresholdMs = 0.0,
            nativeCrashReportEnabled = trackNativeErrors,
            nativeLongTaskThresholdMs = 0.0
        )
        val bridgeConfiguration = configuration.copy(
            rumConfiguration = rumConfiguration,
            configurationForTelemetry = ConfigurationForTelemetry(
                initializationType = initializationType,
                trackErrors = trackErrors,
                trackInteractions = trackInteractions,
                trackNetworkRequests = trackNetworkRequests,
                reactVersion = reactVersion,
                reactNativeVersion = reactNativeVersion
            )
        )
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { } // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") {
                    val configurationMapper = it
                        .getActualValue<EventMapper<TelemetryConfigurationEvent>>(
                            "telemetryConfigurationMapper"
                        )
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
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    // endregion

    // region resource mapper

    @Test
    fun `𝕄 set a resource mapper that does not drop resources 𝕎 initialize() {}`(
        @Forgery resourceEvent: ResourceEvent
    ) {
        // Given
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { } // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") {
                    val resourceMapper = it
                        .getActualValue<EventMapper<ResourceEvent>>("resourceEventMapper")
                    val notDroppedEvent = resourceMapper.map(resourceEvent)
                    assertThat(notDroppedEvent).isNotNull
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 set a resource mapper that drops flagged resources 𝕎 initialize() {}`(
        @Forgery resourceEvent: ResourceEvent
    ) {
        // Given
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()
        resourceEvent.context?.additionalProperties?.put("_dd.resource.drop_resource", true)

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { } // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") {
                    val resourceMapper = it
                        .getActualValue<EventMapper<ResourceEvent>>("resourceEventMapper")
                    val droppedEvent = resourceMapper.map(resourceEvent)
                    assertThat(droppedEvent).isNull()
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    // endregion

    // region action mapper

    @Test
    fun `𝕄 set a action mapper that does not drop actions 𝕎 initialize() {}`(
        @Forgery actionEvent: ActionEvent
    ) {
        // Given
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { } // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") {
                    val actionMapper = it
                        .getActualValue<EventMapper<ActionEvent>>("actionEventMapper")
                    val notDroppedEvent = actionMapper.map(actionEvent)
                    assertThat(notDroppedEvent).isNotNull
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 set a action mapper that drops flagged actions 𝕎 initialize() {}`(
        @Forgery actionEvent: ActionEvent
    ) {
        // Given
        val sdkConfigCaptor = argumentCaptor<Configuration>()
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()
        actionEvent.context?.additionalProperties?.put("_dd.action.drop_action", true)

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { } // When
            testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                verify(mockDatadog).initialize(
                    same(mockContext),
                    sdkConfigCaptor.capture(),
                    any()
                )
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }
            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") {
                    val actionMapper = it
                        .getActualValue<EventMapper<ActionEvent>>("actionEventMapper")
                    val droppedEvent = actionMapper.map(actionEvent)
                    assertThat(droppedEvent).isNull()
                }
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    // endregion

    // region misc

    @Test
    fun `𝕄 set native user info 𝕎 setUserInfo() {with id}`(
        @StringForgery id: String
    ) {
        // Given
        val userInfo = mapOf(
            "id" to id
        )

        // When
        testedBridgeSdk.setUserInfo(userInfo.toReadableMap(), mockPromise)

        // Then
        argumentCaptor<Map<String, Any?>> {
            verify(mockDatadog)
                .setUserInfo(
                    eq(id),
                    isNull(),
                    isNull(),
                    capture()
                )

            assertThat(firstValue).isEmpty()
        }
    }

    @Test
    fun `𝕄 set native user info 𝕎 setUserInfo() {with id and name}`(
        @StringForgery id: String,
        @StringForgery name: String
    ) {
        // Given
        val userInfo = mapOf(
            "id" to id,
            "name" to name
        )

        // When
        testedBridgeSdk.setUserInfo(userInfo.toReadableMap(), mockPromise)

        // Then
        argumentCaptor<Map<String, Any?>> {
            verify(mockDatadog)
                .setUserInfo(
                    eq(id),
                    eq(name),
                    isNull(),
                    capture()
                )

            assertThat(firstValue).isEmpty()
        }
    }

    @Test
    fun `𝕄 set native user info 𝕎 setUserInfo() {with id, name and email}`(
        @StringForgery id: String,
        @StringForgery name: String,
        @StringForgery(regex = "\\w+@\\w+\\.[a-z]{3}") email: String
    ) {
        // Given
        val userInfo = mapOf(
            "id" to id,
            "name" to name,
            "email" to email
        )

        // When
        testedBridgeSdk.setUserInfo(userInfo.toReadableMap(), mockPromise)

        // Then
        argumentCaptor<Map<String, Any?>> {
            verify(mockDatadog)
                .setUserInfo(
                    eq(id),
                    eq(name),
                    eq(email),
                    capture()
                )

            assertThat(firstValue).isEmpty()
        }
    }

    @Test
    fun `𝕄 set native user info 𝕎 setUserInfo() {with id, name, email and extraInfo}`(
        @StringForgery id: String,
        @StringForgery name: String,
        @StringForgery(regex = "\\w+@\\w+\\.[a-z]{3}") email: String,
        @MapForgery(
            key = AdvancedForgery(string = [StringForgery(StringForgeryType.NUMERICAL)]),
            value = AdvancedForgery(string = [StringForgery(StringForgeryType.ASCII)])
        ) extraInfo: Map<String, String>
    ) {
        // Given
        val userInfo = mapOf(
            "id" to id,
            "name" to name,
            "email" to email,
            "extraInfo" to extraInfo
        )

        // When
        testedBridgeSdk.setUserInfo(userInfo.toReadableMap(), mockPromise)

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
    fun `𝕄 add native extra user info 𝕎 addUserExtraInfo() {with userExtraInfo}`(
        @MapForgery(
            key = AdvancedForgery(string = [StringForgery(StringForgeryType.NUMERICAL)]),
            value = AdvancedForgery(string = [StringForgery(StringForgeryType.ASCII)])
        ) userExtraInfo: Map<String, String>
    ) {
        // When
        testedBridgeSdk.addUserExtraInfo(userExtraInfo.toReadableMap(), mockPromise)

        // Then
        argumentCaptor<Map<String, Any?>> {
            verify(mockDatadog)
                .addUserExtraInfo(
                    capture()
                )

            assertThat(firstValue)
                .containsAllEntriesOf(userExtraInfo)
                .hasSize(userExtraInfo.size)
        }
    }

    @Test
    fun `𝕄 clear user info 𝕎 clearUserInfo()`() {
        // When
        testedBridgeSdk.clearUserInfo(mockPromise)

        // Then
        argumentCaptor<Map<String, Any?>> {
            verify(mockDatadog).clearUserInfo()
        }
    }

    @Test
    fun `M set Rum attribute W addAttribute`(
        @StringForgery(type = StringForgeryType.NUMERICAL) key: String,
        @StringForgery(type = StringForgeryType.ASCII) value: String
    ) {
        // When
        val attributeMap = JavaOnlyMap().apply {
            putString("value", value)
        }
        testedBridgeSdk.addAttribute(key, attributeMap, mockPromise)

        // Then
        verify(mockDatadog).addRumGlobalAttribute(key, value)
    }

    @Test
    fun `M set GlobalState attribute W addAttribute`(
        @StringForgery(type = StringForgeryType.NUMERICAL) key: String,
        @StringForgery(type = StringForgeryType.ASCII) value: String
    ) {
        // When
        val attributeMap = JavaOnlyMap().apply {
            putString("value", value)
        }
        testedBridgeSdk.addAttribute(key, attributeMap, mockPromise)

        // Then
        assertThat(GlobalState.globalAttributes).containsEntry(key, value)
    }

    @Test
    fun `M remove Rum attribute W removeAttribute`(
        @StringForgery(type = StringForgeryType.NUMERICAL) key: String,
        @StringForgery(type = StringForgeryType.ASCII) value: String
    ) {
        // Given
        val attributeMap = JavaOnlyMap().apply {
            putString("value", value)
        }
        testedBridgeSdk.addAttribute(key, attributeMap, mockPromise)
        assertThat(GlobalState.globalAttributes).containsEntry(key, value)

        // When
        testedBridgeSdk.removeAttribute(key, mockPromise)

        // Then
        verify(mockDatadog).removeRumGlobalAttribute(key)
    }

    @Test
    fun `M remove GlobalState attribute W removeAttribute`(
        @StringForgery(type = StringForgeryType.NUMERICAL) key: String,
        @StringForgery(type = StringForgeryType.ASCII) value: String
    ) {
        // Given
        val attributeMap = JavaOnlyMap().apply {
            putString("value", value)
        }
        testedBridgeSdk.addAttribute(key, attributeMap, mockPromise)
        assertThat(GlobalState.globalAttributes).containsEntry(key, value)

        // When
        testedBridgeSdk.removeAttribute(key, mockPromise)

        // Then
        assertThat(GlobalState.globalAttributes).doesNotContainEntry(key, value)
    }

    @Test
    fun `𝕄 set RUM attributes 𝕎 addAttributes`(
        @MapForgery(
            key = AdvancedForgery(string = [StringForgery(StringForgeryType.NUMERICAL)]),
            value = AdvancedForgery(string = [StringForgery(StringForgeryType.ASCII)])
        ) customAttributes: Map<String, String>
    ) {
        // When
        testedBridgeSdk.addAttributes(customAttributes.toReadableMap(), mockPromise)

        // Then
        verify(mockDatadog).addRumGlobalAttributes(customAttributes)
    }

    @Test
    fun `𝕄 set GlobalState attributes 𝕎 addAttributes`(
        @MapForgery(
            key = AdvancedForgery(string = [StringForgery(StringForgeryType.NUMERICAL)]),
            value = AdvancedForgery(string = [StringForgery(StringForgeryType.ASCII)])
        ) customAttributes: Map<String, String>
    ) {
        // When
        testedBridgeSdk.addAttributes(customAttributes.toReadableMap(), mockPromise)

        // Then
        customAttributes.forEach { (k, v) ->
            assertThat(GlobalState.globalAttributes).containsEntry(k, v)
        }
    }

    @Test
    fun `𝕄 remove RUM attributes 𝕎 removeAttributes`(
        @MapForgery(
            key = AdvancedForgery(string = [StringForgery(StringForgeryType.NUMERICAL)]),
            value = AdvancedForgery(string = [StringForgery(StringForgeryType.ASCII)])
        ) customAttributes: Map<String, String>
    ) {
        // Given
        testedBridgeSdk.addAttributes(customAttributes.toReadableMap(), mockPromise)
        verify(mockDatadog).addRumGlobalAttributes(customAttributes)

        // When
        val keys = customAttributes.keys.toReadableArray()
        testedBridgeSdk.removeAttributes(keys, mockPromise)

        // Then
        verify(mockDatadog).removeRumGlobalAttributes(customAttributes.keys.toTypedArray())
    }

    @Test
    fun `𝕄 remve GlobalState attributes 𝕎 removeAttributes`(
        @MapForgery(
            key = AdvancedForgery(string = [StringForgery(StringForgeryType.NUMERICAL)]),
            value = AdvancedForgery(string = [StringForgery(StringForgeryType.ASCII)])
        ) customAttributes: Map<String, String>
    ) {
        // Given
        testedBridgeSdk.addAttributes(customAttributes.toReadableMap(), mockPromise)
        verify(mockDatadog).addRumGlobalAttributes(customAttributes)

        // When
        val keys = customAttributes.keys.toReadableArray()
        testedBridgeSdk.removeAttributes(keys, mockPromise)

        // Then
        customAttributes.forEach { (k, v) ->
            assertThat(GlobalState.globalAttributes).doesNotContainEntry(k, v)
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

    fun `𝕄 initialize native SDK 𝕎 initialize() {with custom endpoints}`(
        forge: Forge
    ) {
        // Given
        val customRumEndpoint = forge.aNullable { aString() }
        val customLogsEndpoint = forge.aNullable { aString() }
        val customTraceEndpoint = forge.aNullable { aString() }
        val rumConfiguration = fakeConfiguration.rumConfiguration?.copy(
            customEndpoint = customRumEndpoint
        )
        val logsConfiguration = fakeConfiguration.logsConfiguration?.copy(
            customEndpoint = customLogsEndpoint
        )
        val traceConfiguration = fakeConfiguration.traceConfiguration?.copy(
            customEndpoint = customTraceEndpoint
        )
        val bridgeConfiguration = fakeConfiguration.copy(
            rumConfiguration = rumConfiguration,
            logsConfiguration = logsConfiguration,
            traceConfiguration = traceConfiguration
        )
        val rumConfigCaptor = argumentCaptor<RumConfiguration>()
        val logsConfigCaptor = argumentCaptor<LogsConfiguration>()
        val traceConfigCaptor = argumentCaptor<TraceConfiguration>()

        val rumMock = org.mockito.Mockito.mockStatic(Rum::class.java)
        val traceMock = org.mockito.Mockito.mockStatic(Trace::class.java)
        val logsMock = org.mockito.Mockito.mockStatic(Logs::class.java)

        try {
            rumMock.`when`<Unit> { Rum.enable(any(), any()) }.then { }
            logsMock.`when`<Unit> { Logs.enable(any(), any()) }.then { }
            traceMock.`when`<Unit> { Trace.enable(any(), any()) }.then { } // When
            testedBridgeSdk.initialize(bridgeConfiguration.toReadableJavaOnlyMap(), mockPromise)

            // Then
            inOrder(mockDatadog) {
                rumMock.verify { Rum.enable(rumConfigCaptor.capture(), any()) }
                traceMock.verify { Trace.enable(traceConfigCaptor.capture(), any()) }
                logsMock.verify { Logs.enable(logsConfigCaptor.capture(), any()) }
            }

            assertThat(rumConfigCaptor.firstValue)
                .hasField("featureConfiguration") {
                    it.hasFieldEqualTo("customEndpointUrl", customRumEndpoint)
                }
            assertThat(logsConfigCaptor.firstValue)
                .hasFieldEqualTo("customEndpointUrl", customLogsEndpoint)
            assertThat(traceConfigCaptor.firstValue)
                .hasFieldEqualTo("customEndpointUrl", customTraceEndpoint)
        } finally {
            rumMock.close()
            logsMock.close()
            traceMock.close()
        }
    }

    @Test
    fun `𝕄 initialize native SDK 𝕎 initialize() {synthethics attributes}`() {
        // Given
        val rumConfiguration = fakeConfiguration.rumConfiguration?.copy(
            nativeCrashReportEnabled = false
        )
        fakeConfiguration = fakeConfiguration.copy(site = null, rumConfiguration = rumConfiguration)
        DdSdkSynthetics.testId = "unit-test-test-id"
        DdSdkSynthetics.resultId = "unit-test-result-id"

        // When
        testedBridgeSdk.initialize(fakeConfiguration.toReadableJavaOnlyMap(), mockPromise)

        // Then
        verify(mockRumInternalProxy).setSyntheticsAttribute(
            "unit-test-test-id",
            "unit-test-result-id"
        )
    }

    @Test
    fun `𝕄 clear all data 𝕎 clearAllData()`() {
        // When
        testedBridgeSdk.clearAllData(mockPromise)

        // Then
        argumentCaptor<Map<String, Any?>> {
            verify(mockDatadog)
                .clearAllData()
        }
    }

    @Test
    fun `𝕄 normalize frameTime according to the device's refresh rate`() {
        // 10 fps, 60Hz device, 60 fps budget -> 10 fps
        var frameTimeSeconds = testedBridgeSdk.normalizeFrameTime(
            frameTimeSeconds = 0.1,
            context = mockContext,
            fpsBudget = 60.0,
            deviceDisplayFps = 60.0
        )
        assertThat(frameTimeSeconds).isEqualTo(0.1)

        // 30 fps, 60Hz device, 60 fps budget -> 30 fps
        frameTimeSeconds = testedBridgeSdk.normalizeFrameTime(
            frameTimeSeconds = 0.03,
            context = mockContext,
            fpsBudget = 60.0,
            deviceDisplayFps = 60.0
        )
        assertThat(frameTimeSeconds).isEqualTo(0.03)

        // 60 fps, 60Hz device, 60 fps budget -> 60 fps
        frameTimeSeconds = testedBridgeSdk.normalizeFrameTime(
            frameTimeSeconds = 0.016,
            context = mockContext,
            fpsBudget = 60.0,
            deviceDisplayFps = 60.0
        )
        assertThat(frameTimeSeconds).isEqualTo(0.016, Offset.offset(0.005))

        // 60 fps, 120Hz device, 60 fps budget -> 30 fps
        frameTimeSeconds = testedBridgeSdk.normalizeFrameTime(
            frameTimeSeconds = 0.016,
            context = mockContext,
            fpsBudget = 60.0,
            deviceDisplayFps = 120.0
        )
        assertThat(frameTimeSeconds).isEqualTo(0.032)

        // 120 fps, 120Hz device, 60 fps budget -> 60 fps
        frameTimeSeconds = testedBridgeSdk.normalizeFrameTime(
            frameTimeSeconds = 0.0083,
            context = mockContext,
            fpsBudget = 60.0,
            deviceDisplayFps = 120.0
        )
        assertThat(frameTimeSeconds).isEqualTo(0.016, Offset.offset(0.005))

        // 90 fps, 120Hz device, 60 fps budget -> 45 fps
        frameTimeSeconds = testedBridgeSdk.normalizeFrameTime(
            frameTimeSeconds = 0.0111,
            context = mockContext,
            fpsBudget = 60.0,
            deviceDisplayFps = 120.0
        )
        assertThat(frameTimeSeconds).isEqualTo(0.0222, Offset.offset(0.001))

        // 100 fps, 120Hz device, 60 fps budget -> 50 fps
        frameTimeSeconds = testedBridgeSdk.normalizeFrameTime(
            frameTimeSeconds = 0.01,
            context = mockContext,
            fpsBudget = 60.0,
            deviceDisplayFps = 120.0
        )
        assertThat(frameTimeSeconds).isEqualTo(0.02, Offset.offset(0.001))

        // 120 fps, 120Hz device, 120 fps budget -> 120 fps
        frameTimeSeconds = testedBridgeSdk.normalizeFrameTime(
            frameTimeSeconds = 0.0083,
            context = mockContext,
            fpsBudget = 120.0,
            deviceDisplayFps = 120.0
        )
        assertThat(frameTimeSeconds).isEqualTo(0.0083, Offset.offset(0.001))

        // 80 fps, 160Hz device, 60 fps budget -> 30 fps
        frameTimeSeconds = testedBridgeSdk.normalizeFrameTime(
            frameTimeSeconds = 0.0125,
            context = mockContext,
            fpsBudget = 60.0,
            deviceDisplayFps = 160.0
        )
        assertThat(frameTimeSeconds).isEqualTo(0.033, Offset.offset(0.001))

        // 160 fps, 160Hz device, 60 fps budget -> 60 fps
        frameTimeSeconds = testedBridgeSdk.normalizeFrameTime(
            frameTimeSeconds = 0.00625,
            context = mockContext,
            fpsBudget = 60.0,
            deviceDisplayFps = 160.0
        )
        assertThat(frameTimeSeconds).isEqualTo(0.016, Offset.offset(0.001))

        // Edge cases
        frameTimeSeconds = testedBridgeSdk.normalizeFrameTime(
            frameTimeSeconds = 0.0,
            context = mockContext,
            fpsBudget = 0.0,
            deviceDisplayFps = 0.0
        )
        assertThat(frameTimeSeconds).isEqualTo(0.016, Offset.offset(0.001))

        frameTimeSeconds = testedBridgeSdk.normalizeFrameTime(
            frameTimeSeconds = 0.016,
            context = mockContext,
            fpsBudget = 0.0,
            deviceDisplayFps = 0.0
        )
        assertThat(frameTimeSeconds).isEqualTo(0.016, Offset.offset(0.001))

        frameTimeSeconds = testedBridgeSdk.normalizeFrameTime(
            frameTimeSeconds = 0.016,
            context = mockContext,
            fpsBudget = 60.0,
            deviceDisplayFps = 0.0
        )
        assertThat(frameTimeSeconds).isEqualTo(0.016, Offset.offset(0.001))

        frameTimeSeconds = testedBridgeSdk.normalizeFrameTime(
            frameTimeSeconds = 0.016,
            context = mockContext,
            fpsBudget = 0.0,
            deviceDisplayFps = 60.0
        )
        assertThat(frameTimeSeconds).isEqualTo(0.016, Offset.offset(0.001))
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

        @JvmStatic
        fun provideBatchSize(): Stream<Arguments?>? {
            return Stream.of(
                Arguments.of("SMALL", BatchSize.SMALL),
                Arguments.of("MEDIUM", BatchSize.MEDIUM),
                Arguments.of("LARGE", BatchSize.LARGE)
            )
        }

        @JvmStatic
        fun provideUploadFrequency(): Stream<Arguments?>? {
            return Stream.of(
                Arguments.of("RARE", UploadFrequency.RARE),
                Arguments.of("AVERAGE", UploadFrequency.AVERAGE),
                Arguments.of("FREQUENT", UploadFrequency.FREQUENT)
            )
        }

        @JvmStatic
        fun provideBatchProcessingLevel(): Stream<Arguments?>? {
            return Stream.of(
                Arguments.of("LOW", BatchProcessingLevel.LOW),
                Arguments.of("MEDIUM", BatchProcessingLevel.MEDIUM),
                Arguments.of("HIGH", BatchProcessingLevel.HIGH)
            )
        }
    }
}
