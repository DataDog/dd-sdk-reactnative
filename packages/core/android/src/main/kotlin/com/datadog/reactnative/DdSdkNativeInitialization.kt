/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import com.datadog.android.DatadogSite
import com.datadog.android.core.configuration.BatchSize
import com.datadog.android.core.configuration.Configuration
import com.datadog.android.core.configuration.UploadFrequency
import com.datadog.android.event.EventMapper
import com.datadog.android.log.LogsConfiguration
import com.datadog.android.privacy.TrackingConsent
import com.datadog.android.rum.RumConfiguration
import com.datadog.android.rum._RumInternalProxy
import com.datadog.android.rum.configuration.VitalsUpdateFrequency
import com.datadog.android.rum.model.ActionEvent
import com.datadog.android.rum.model.ResourceEvent
import com.datadog.android.rum.tracking.ActivityViewTrackingStrategy
import com.datadog.android.telemetry.model.TelemetryConfigurationEvent
import com.datadog.android.trace.TraceConfiguration
import com.google.gson.Gson
import java.util.Locale

/**
 * Initializes the Android Datadog SDK.
 */
class DdSdkNativeInitialization internal constructor(
    private val appContext: Context,
    private val datadog: DatadogWrapper = DatadogSDKWrapper(),
    private val jsonFileReader: JSONFileReader = JSONFileReader()
) {
    internal fun initialize(ddSdkConfiguration: DdSdkConfiguration) {
        val sdkConfiguration = buildSdkConfiguration(ddSdkConfiguration)
        val rumConfiguration = buildRumConfiguration(ddSdkConfiguration)
        val logsConfiguration = buildLogsConfiguration(ddSdkConfiguration)
        val traceConfiguration = buildTraceConfiguration(ddSdkConfiguration)
        val trackingConsent = buildTrackingConsent(ddSdkConfiguration.trackingConsent)

        configureSdkVerbosity(ddSdkConfiguration)
        configureRumAndTracesForLogs(ddSdkConfiguration)

        datadog.initialize(appContext, sdkConfiguration, trackingConsent)

        datadog.enableRum(rumConfiguration)

        datadog.enableTrace(traceConfiguration)

        datadog.enableLogs(logsConfiguration)
    }

    private fun configureRumAndTracesForLogs(configuration: DdSdkConfiguration) {
        configuration.bundleLogsWithRum?.let {
            datadog.bundleLogsWithRum = it
        }
        configuration.bundleLogsWithTraces?.let {
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
                datadog.telemetryError(e.message ?: DdSdkImplementation.PACKAGE_INFO_NOT_FOUND_ERROR_MESSAGE, e)
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

    private fun buildRumConfiguration(configuration: DdSdkConfiguration): RumConfiguration {
        val configBuilder =
            RumConfiguration.Builder(
                applicationId = configuration.applicationId
            )
        if (configuration.sampleRate != null) {
            configBuilder.setSessionSampleRate(configuration.sampleRate.toFloat())
        }

        configBuilder.trackFrustrations(configuration.trackFrustrations ?: true)
        configBuilder.trackBackgroundEvents(configuration.trackBackgroundEvents ?: false)

        configBuilder.setVitalsUpdateFrequency(
            buildVitalUpdateFrequency(configuration.vitalsUpdateFrequency)
        )

        val telemetrySampleRate = (configuration.telemetrySampleRate as? Number)?.toFloat()
        telemetrySampleRate?.let { configBuilder.setTelemetrySampleRate(it) }

        val longTask = (configuration.nativeLongTaskThresholdMs as? Number)?.toLong()
        if (longTask != null) {
            configBuilder.trackLongTasks(longTask)
        }

        if (configuration.nativeViewTracking == true) {
            // Use sensible default
            configBuilder.useViewTrackingStrategy(ActivityViewTrackingStrategy(false))
        } else {
            configBuilder.useViewTrackingStrategy(NoOpViewTrackingStrategy)
        }

        if (configuration.nativeInteractionTracking == false) {
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
                        configuration.nativeCrashReportEnabled
                    // trackCrossPlatformLongTasks will be deprecated for trackLongTask
                    event.telemetry.configuration.trackCrossPlatformLongTasks =
                        configuration.longTaskThresholdMs != 0.0
                    event.telemetry.configuration.trackLongTask =
                        configuration.longTaskThresholdMs != 0.0
                    event.telemetry.configuration.trackNativeLongTasks =
                        configuration.nativeLongTaskThresholdMs != 0.0

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

        configuration.customEndpoints?.rum?.let {
            configBuilder.useCustomEndpoint(it)
        }

        return configBuilder.build()
    }

    private fun buildLogsConfiguration(configuration: DdSdkConfiguration): LogsConfiguration {
        val configBuilder = LogsConfiguration.Builder()
        configuration.customEndpoints?.logs?.let {
            configBuilder.useCustomEndpoint(it)
        }

        return configBuilder.build()
    }

    private fun buildTraceConfiguration(configuration: DdSdkConfiguration): TraceConfiguration {
        val configBuilder = TraceConfiguration.Builder()
        configuration.customEndpoints?.trace?.let {
            configBuilder.useCustomEndpoint(it)
        }

        return configBuilder.build()
    }

    private fun buildSdkConfiguration(configuration: DdSdkConfiguration): Configuration {
        val configBuilder = Configuration.Builder(
            clientToken = configuration.clientToken,
            env = configuration.env,
            variant = "",
            service = configuration.serviceName
        )

        val additionalConfig = configuration.additionalConfig?.toMutableMap()
        val versionSuffix = configuration.additionalConfig?.get(DdSdkImplementation.DD_VERSION_SUFFIX) as? String
        if (versionSuffix != null && additionalConfig != null) {
            val defaultVersion = getDefaultAppVersion()
            additionalConfig.put(DdSdkImplementation.DD_VERSION, defaultVersion + versionSuffix)
        }
        configBuilder.setAdditionalConfiguration(
            additionalConfig?.filterValues { it != null }?.mapValues {
                it.value
            } as Map<String, Any>? ?: emptyMap()
        )

        configBuilder.setCrashReportsEnabled(configuration.nativeCrashReportEnabled ?: false)
        configBuilder.useSite(buildSite(configuration.site))
        configBuilder.setUploadFrequency(
            buildUploadFrequency(configuration.uploadFrequency)
        )
        configBuilder.setBatchSize(
            buildBatchSize(configuration.batchSize)
        )

        configuration.proxyConfig?.let { (proxy, authenticator) ->
            configBuilder.setProxy(proxy, authenticator)
        }

        if (configuration.firstPartyHosts != null) {
            configBuilder.setFirstPartyHostsWithHeaderType(configuration.firstPartyHosts)
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
            "ap1" -> DatadogSite.AP1
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

    internal fun getConfigurationFromJSONFile(): DdSdkConfiguration {
        try {
            val jsonString = jsonFileReader.parseAssetsJSONFile(appContext, "datadog-configuration.json")

            val configuration = Gson().fromJson(jsonString, JSONConfigurationFile::class.java).configuration

            return configuration.asDdSdkConfiguration()
        } catch (@Suppress("TooGenericExceptionCaught") exception: Exception) {
            throw BadConfigurationException(exception)
        }
    }

    companion object {
        /**
         * Initializes the Datadog React Native SDK from your MainApplication.
         *
         * @param appContext: The application context of your React Native application.
         */
        @JvmStatic
        fun initFromNative(appContext: Context) {
            val nativeInitialization = DdSdkNativeInitialization(appContext.applicationContext)
            try {
                nativeInitialization.initialize(nativeInitialization.getConfigurationFromJSONFile())
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
