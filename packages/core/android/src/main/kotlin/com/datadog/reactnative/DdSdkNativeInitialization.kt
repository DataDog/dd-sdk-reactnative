/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import com.datadog.android.Datadog
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
import com.datadog.android._InternalProxy
import com.datadog.android.rum._RumInternalProxy
import com.datadog.android.rum.configuration.VitalsUpdateFrequency
import com.datadog.android.rum.metric.networksettled.TimeBasedInitialResourceIdentifier
import com.datadog.android.rum.model.ActionEvent
import com.datadog.android.rum.model.ResourceEvent
import com.datadog.android.rum.tracking.ActivityViewTrackingStrategy
import com.datadog.android.telemetry.model.TelemetryConfigurationEvent
import com.datadog.android.trace.Trace
import com.datadog.android.trace.TraceConfiguration
import com.datadog.android.ndk.NdkCrashReports
import com.google.gson.Gson
import java.util.Locale


/**
 * Initializes the Android Datadog SDK.
 */
class DdSdkNativeInitialization internal constructor(
    private val appContext: Context,
    private val datadog: DatadogWrapper = DatadogSDKWrapper(),
    private val ddTelemetry: DdTelemetry = DdTelemetry(),
    private val jsonFileReader: JSONFileReader = JSONFileReader()
) {
    @Suppress("CyclomaticComplexMethod")
    internal fun initialize(ddSdkConfiguration: DdSdkConfiguration, isCalledFromJs: Boolean = true) {
        val sdkConfiguration = buildSdkConfiguration(ddSdkConfiguration)
        val trackingConsent = buildTrackingConsent(ddSdkConfiguration.trackingConsent)
        var rumConfiguration: RumConfiguration? = null
        var logsConfiguration: LogsConfiguration? = null
        var traceConfiguration: TraceConfiguration? = null
        val nativeCrashReportEnabled = ddSdkConfiguration.rumConfiguration?.nativeCrashReportEnabled ?: false

        if (ddSdkConfiguration.rumConfiguration != null) {
             rumConfiguration = buildRumConfiguration(ddSdkConfiguration)
        }

        if (ddSdkConfiguration.logsConfiguration != null) {
            logsConfiguration = buildLogsConfiguration(ddSdkConfiguration)
        }

        if (ddSdkConfiguration.traceConfiguration != null) {
            traceConfiguration = buildTraceConfiguration(ddSdkConfiguration)
        }

        configureSdkVerbosity(ddSdkConfiguration)

        configureRumAndTracesForLogs(ddSdkConfiguration)

        if (isCalledFromJs) {
            DdSdkSessionStartedListener.getInstance().onRnSdkInitialized()
            // Handles the case in which the SDK was already initialized with initFromNative.
            if (datadog.isInitialized()) {
                datadog.getRumMonitor().getCurrentSessionId {
                    it?.let { sessionId ->
                        DdSdkSessionStartedListener.getInstance().onSessionStarted(sessionId, false)
                    }
                }
            }
        }

        datadog.initialize(appContext, sdkConfiguration, trackingConsent)

        if (rumConfiguration != null) {
            Rum.enable(rumConfiguration, Datadog.getInstance())
        }

        if (logsConfiguration != null) {
            Logs.enable(logsConfiguration, Datadog.getInstance())
        }

        if (traceConfiguration != null) {
            Trace.enable(traceConfiguration, Datadog.getInstance())
        }

        if (nativeCrashReportEnabled) {
            NdkCrashReports.enable()
        }
    }

    private fun configureRumAndTracesForLogs(configuration: DdSdkConfiguration) {
        configuration.logsConfiguration?.bundleLogsWithRum?.let {
            datadog.bundleLogsWithRum = it
        }
        configuration.logsConfiguration?.bundleLogsWithTraces?.let {
            datadog.bundleLogsWithTraces = it
        }
    }

    private fun configureSdkVerbosity(configuration: DdSdkConfiguration) {
        val verbosity =
            when (configuration.verbosity?.lowercase(Locale.US)) {
                "debug" -> Log.DEBUG
                "info" -> Log.INFO
                "warn" -> Log.WARN
                "error" -> Log.ERROR
                else -> null
            }
        if (verbosity != null) {
            datadog.setVerbosity(verbosity)
        }
    }

    private fun getDefaultAppVersion(): String {
        val packageName = appContext.packageName
        val packageInfo =
            try {
                appContext.packageManager.getPackageInfo(packageName, 0)
            } catch (e: PackageManager.NameNotFoundException) {
                ddTelemetry.telemetryError(e.message ?: DdSdkImplementation.PACKAGE_INFO_NOT_FOUND_ERROR_MESSAGE, e)
                return DdSdkImplementation.DEFAULT_APP_VERSION
            }

        return packageInfo?.let {
            // we need to use the deprecated method because getLongVersionCode method is only
            // available from API 28 and above
            @Suppress("DEPRECATION")
            it.versionName ?: it.versionCode.toString()
        }
            ?: DdSdkImplementation.DEFAULT_APP_VERSION
    }

    @Suppress("CyclomaticComplexMethod")
    private fun buildRumConfiguration(configuration: DdSdkConfiguration): RumConfiguration {
        val configBuilder =
            RumConfiguration.Builder(
                applicationId = configuration.rumConfiguration?.applicationId ?: ""
            )
        if (configuration.rumConfiguration?.sessionSampleRate != null) {
            configBuilder.setSessionSampleRate(configuration.rumConfiguration.sessionSampleRate.toFloat())
        }

        configBuilder.trackFrustrations(configuration.rumConfiguration?.trackFrustrations ?: true)
        configBuilder.trackBackgroundEvents(configuration.rumConfiguration?.trackBackgroundEvents ?: false)

        configBuilder.setVitalsUpdateFrequency(
            buildVitalUpdateFrequency(configuration.rumConfiguration?.vitalsUpdateFrequency)
        )

        val telemetrySampleRate = (configuration.rumConfiguration?.telemetrySampleRate as? Number)?.toFloat()
        telemetrySampleRate?.let { configBuilder.setTelemetrySampleRate(it) }

        val longTask = (configuration.rumConfiguration?.nativeLongTaskThresholdMs as? Number)?.toLong()
        if (longTask != null) {
            configBuilder.trackLongTasks(longTask)
        }

        if (configuration.rumConfiguration?.nativeViewTracking == true) {
            // Use sensible default
            configBuilder.useViewTrackingStrategy(ActivityViewTrackingStrategy(false))
        } else {
            configBuilder.useViewTrackingStrategy(NoOpViewTrackingStrategy)
        }

        if (configuration.rumConfiguration?.nativeInteractionTracking == false) {
            configBuilder.disableUserInteractionTracking()
        }

        configBuilder.setResourceEventMapper(
            object : EventMapper<ResourceEvent> {
                override fun map(event: ResourceEvent): ResourceEvent? {
                    if (event.context?.additionalProperties?.containsKey(DdSdkImplementation.DD_DROP_RESOURCE) ==
                        true
                    ) {
                        return null
                    }
                    return event
                }
            }
        )

        configBuilder.setActionEventMapper(
            object : EventMapper<ActionEvent> {
                override fun map(event: ActionEvent): ActionEvent? {
                    if (event.context?.additionalProperties?.containsKey(DdSdkImplementation.DD_DROP_ACTION) == true
                    ) {
                        return null
                    }
                    return event
                }
            }
        )

        _RumInternalProxy.setTelemetryConfigurationEventMapper(
            configBuilder,
            object : EventMapper<TelemetryConfigurationEvent> {
                override fun map(
                    event: TelemetryConfigurationEvent
                ): TelemetryConfigurationEvent? {
                    event.telemetry.configuration.trackNativeErrors =
                        configuration.rumConfiguration?.nativeCrashReportEnabled
                    // trackCrossPlatformLongTasks will be deprecated for trackLongTask
                    event.telemetry.configuration.trackCrossPlatformLongTasks =
                        configuration.rumConfiguration?.longTaskThresholdMs != 0.0
                    event.telemetry.configuration.trackLongTask =
                        configuration.rumConfiguration?.longTaskThresholdMs != 0.0
                    event.telemetry.configuration.trackNativeLongTasks =
                        configuration.rumConfiguration?.nativeLongTaskThresholdMs != 0.0

                    event.telemetry.configuration.initializationType =
                        configuration.configurationForTelemetry?.initializationType
                    event.telemetry.configuration.trackInteractions =
                        configuration.configurationForTelemetry?.trackInteractions
                    event.telemetry.configuration.trackErrors =
                        configuration.configurationForTelemetry?.trackErrors
                    event.telemetry.configuration.trackResources =
                        configuration.configurationForTelemetry?.trackNetworkRequests
                    event.telemetry.configuration.trackNetworkRequests =
                        configuration.configurationForTelemetry?.trackNetworkRequests
                    event.telemetry.configuration.reactVersion =
                        configuration.configurationForTelemetry?.reactVersion
                    event.telemetry.configuration.reactNativeVersion =
                        configuration.configurationForTelemetry?.reactNativeVersion

                    return event
                }
            }
        )

        configuration.rumConfiguration?.customEndpoint?.let {
            configBuilder.useCustomEndpoint(it)
        }

        configuration.rumConfiguration?.trackNonFatalAnrs?.let {
            configBuilder.trackNonFatalAnrs(it)
        }

        configuration.rumConfiguration?.initialResourceThreshold?.let {
            val milliseconds = (it * MILLISECONDS_IN_SECOND).toLong()
            configBuilder.setInitialResourceIdentifier(TimeBasedInitialResourceIdentifier(milliseconds))
        }

        configBuilder.setSessionListener(DdSdkSessionStartedListener.getInstance())

        return configBuilder.build()
    }

    private fun buildLogsConfiguration(configuration: DdSdkConfiguration): LogsConfiguration {
        val configBuilder = LogsConfiguration.Builder()
        configuration.logsConfiguration?.customEndpoint?.let {
            configBuilder.useCustomEndpoint(it)
        }

        return configBuilder.build()
    }

    private fun buildTraceConfiguration(configuration: DdSdkConfiguration): TraceConfiguration {
        val configBuilder = TraceConfiguration.Builder()
        configuration.traceConfiguration?.customEndpoint?.let {
            configBuilder.useCustomEndpoint(it)
        }

        return configBuilder.build()
    }

    private fun buildSdkConfiguration(configuration: DdSdkConfiguration): Configuration {
        val configBuilder = Configuration.Builder(
            clientToken = configuration.clientToken,
            env = configuration.env,
            variant = "",
            service = configuration.service
        )

        val additionalConfig = configuration.additionalConfiguration?.toMutableMap()
        val versionSuffix = configuration.additionalConfiguration?.get(DdSdkImplementation.DD_VERSION_SUFFIX) as? String
        if (versionSuffix != null && additionalConfig != null) {
            val defaultVersion = getDefaultAppVersion()
            additionalConfig.put(DdSdkImplementation.DD_VERSION, defaultVersion + versionSuffix)
        }
        configBuilder.setAdditionalConfiguration(
            additionalConfig?.filterValues { it != null }?.mapValues {
                it.value
            } as Map<String, Any>? ?: emptyMap()
        )

        configBuilder.setCrashReportsEnabled(configuration.rumConfiguration?.nativeCrashReportEnabled ?: false)
        configBuilder.useSite(buildSite(configuration.site))
        configBuilder.setUploadFrequency(
            buildUploadFrequency(configuration.uploadFrequency)
        )
        configBuilder.setBatchSize(
            buildBatchSize(configuration.batchSize)
        )


        configuration.proxyConfiguration?.let { (proxy, authenticator) ->
            configBuilder.setProxy(proxy, authenticator)
        }

        val firstPartyHosts = configuration.rumConfiguration?.firstPartyHosts
        if (firstPartyHosts != null) {
            configBuilder.setFirstPartyHostsWithHeaderType(firstPartyHosts)
        }

        configBuilder.setBatchProcessingLevel(buildBatchProcessingLevel(configuration.batchProcessingLevel))

        if (additionalConfig?.get(DdSdkImplementation.DD_NEEDS_CLEAR_TEXT_HTTP) == true) {
            _InternalProxy.allowClearTextHttp(configBuilder)
        }

        return configBuilder.build()
    }

    private fun buildTrackingConsent(trackingConsent: String?): TrackingConsent {
        return when (trackingConsent?.lowercase(Locale.US)) {
            "pending" -> TrackingConsent.PENDING
            "granted" -> TrackingConsent.GRANTED
            "not_granted" -> TrackingConsent.NOT_GRANTED
            else -> {
                Log.w(
                    DdSdk::class.java.canonicalName,
                    "Unknown consent given: $trackingConsent, " +
                            "using ${TrackingConsent.PENDING} as default"
                )
                TrackingConsent.PENDING
            }
        }
    }

    private fun buildSite(site: String?): DatadogSite {
        val siteLower = site?.lowercase(Locale.US)
        return when (siteLower) {
            "us1", "us" -> DatadogSite.US1
            "eu1", "eu" -> DatadogSite.EU1
            "us3" -> DatadogSite.US3
            "us5" -> DatadogSite.US5
            "us1_fed", "gov" -> DatadogSite.US1_FED
            "us2_fed" -> DatadogSite.US2_FED
            "ap1" -> DatadogSite.AP1
            "ap2" -> DatadogSite.AP2
            else -> DatadogSite.US1
        }
    }

    private fun buildVitalUpdateFrequency(vitalsUpdateFrequency: String?): VitalsUpdateFrequency {
        val vitalUpdateFrequencyLower = vitalsUpdateFrequency?.lowercase(Locale.US)
        return when (vitalUpdateFrequencyLower) {
            "never" -> VitalsUpdateFrequency.NEVER
            "rare" -> VitalsUpdateFrequency.RARE
            "average" -> VitalsUpdateFrequency.AVERAGE
            "frequent" -> VitalsUpdateFrequency.FREQUENT
            else -> VitalsUpdateFrequency.AVERAGE
        }
    }

    private fun buildUploadFrequency(uploadFrequency: String?): UploadFrequency {
        return when (uploadFrequency?.lowercase(Locale.US)) {
            "rare" -> UploadFrequency.RARE
            "average" -> UploadFrequency.AVERAGE
            "frequent" -> UploadFrequency.FREQUENT
            else -> UploadFrequency.AVERAGE
        }
    }

    private fun buildBatchSize(batchSize: String?): BatchSize {
        return when (batchSize?.lowercase(Locale.US)) {
            "small" -> BatchSize.SMALL
            "medium" -> BatchSize.MEDIUM
            "large" -> BatchSize.LARGE
            else -> BatchSize.MEDIUM
        }
    }


    private fun buildBatchProcessingLevel(batchProcessingLevel: String?): BatchProcessingLevel {
        return when (batchProcessingLevel?.lowercase(Locale.US)) {
            "low" -> BatchProcessingLevel.LOW
            "medium" -> BatchProcessingLevel.MEDIUM
            "high" -> BatchProcessingLevel.HIGH
            else -> BatchProcessingLevel.MEDIUM
        }
    }

    internal fun getConfigurationFromJSONFile(): DdSdkConfiguration {
        try {
            val jsonString = jsonFileReader.parseAssetsJSONFile(appContext, "datadog-configuration.json")

            val configuration = Gson().fromJson(jsonString, JSONConfigurationFile::class.java).configuration

            return configuration.asDdSdkConfiguration()
        } catch (@Suppress("TooGenericExceptionCaught") exception: Exception) {
            throw BadConfigurationException(exception)
        }
    }

    @Suppress("UndocumentedPublicClass")
    companion object {
        private const val MILLISECONDS_IN_SECOND = 1000

        /**
         * Initializes the Datadog React Native SDK from your MainApplication.
         *
         * @param appContext: The application context of your React Native application.
         */
        @JvmStatic
        fun initFromNative(appContext: Context) {
            val nativeInitialization = DdSdkNativeInitialization(appContext.applicationContext)
            try {
                nativeInitialization.initialize(
                    ddSdkConfiguration = nativeInitialization.getConfigurationFromJSONFile(),
                    isCalledFromJs = false
                )
            } catch (@Suppress("TooGenericExceptionCaught") error: Exception) {
                Log.w(
                    DdSdkNativeInitialization::class.java.canonicalName,
                    "Failed to initialize the Datadog SDK: $error"
                )
            }
        }
    }
}

internal class BadConfigurationException(exception: Exception) : RuntimeException(exception)
