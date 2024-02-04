/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import android.view.Choreographer
import com.datadog.android.DatadogSite
import com.datadog.android.core.configuration.BatchSize
import com.datadog.android.core.configuration.Configuration
import com.datadog.android.core.configuration.UploadFrequency
import com.datadog.android.event.EventMapper
import com.datadog.android.log.LogsConfiguration
import com.datadog.android.privacy.TrackingConsent
import com.datadog.android.rum.configuration.VitalsUpdateFrequency
import com.datadog.android.rum.RumConfiguration
import com.datadog.android.rum.RumPerformanceMetric
import com.datadog.android.rum._RumInternalProxy
import com.datadog.android.rum.model.ActionEvent
import com.datadog.android.rum.model.ResourceEvent
import com.datadog.android.rum.tracking.ActivityViewTrackingStrategy
import com.datadog.android.telemetry.model.TelemetryConfigurationEvent
import com.datadog.android.trace.TraceConfiguration
import com.datadog.android.trace.TracingHeaderType
import com.datadog.reactnative.DatadogSDKWrapper.Companion.RUM_ENABLE_LOGS_DEFAULT
import com.datadog.reactnative.DatadogSDKWrapper.Companion.TRACES_ENABLE_LOGS_DEFAULT
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import java.net.InetSocketAddress
import java.net.Proxy
import java.util.Locale
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/** The entry point to initialize Datadog's features. */
class DdSdkImplementation(
    reactContext: ReactApplicationContext,
    private val datadog: DatadogWrapper = DatadogSDKWrapper()
) {
    internal val appContext: Context = reactContext.applicationContext
    internal val reactContext: ReactApplicationContext = reactContext
    internal val initialized = AtomicBoolean(false)

    // region DdSdk

    /**
     * Initializes Datadog's features.
     * @param configuration The configuration to use.
     */
    fun initialize(configuration: ReadableMap, promise: Promise) {
        val ddSdkConfiguration = configuration.asDdSdkConfiguration()
        val sdkConfiguration = buildSdkConfiguration(ddSdkConfiguration)
        val rumConfiguration = buildRumConfiguration(ddSdkConfiguration)
        val logsConfiguration = buildLogsConfiguration(ddSdkConfiguration)
        val traceConfiguration = buildTraceConfiguration(ddSdkConfiguration)
        val trackingConsent = buildTrackingConsent(ddSdkConfiguration.trackingConsent)

        configureSdkVerbosity(ddSdkConfiguration)
        configureRumAndTracesForLogs(ddSdkConfiguration)

        datadog.initialize(appContext, sdkConfiguration, trackingConsent)

        datadog.enableRum(rumConfiguration)
        monitorJsRefreshRate(ddSdkConfiguration)

        datadog.enableTrace(traceConfiguration)

        datadog.enableLogs(logsConfiguration)

        initialized.set(true)

        promise.resolve(null)
    }

    /**
     * Sets the global context (set of attributes) attached with all future Logs, Spans and RUM
     * events.
     * @param attributes The global context attributes.
     */
    fun setAttributes(attributes: ReadableMap, promise: Promise) {
        datadog.addRumGlobalAttributes(attributes.toHashMap())
        for ((k,v) in attributes.toHashMap()) {
            GlobalState.addAttribute(k, v)
        }
        promise.resolve(null)
    }

    /**
     * Set the user information.
     * @param user The user object (use builtin attributes: 'id', 'email', 'name', and/or any custom
     * attribute).
     */
    fun setUser(user: ReadableMap, promise: Promise) {
        val extraInfo = user.toHashMap().toMutableMap()
        val id = extraInfo.remove("id")?.toString()
        val name = extraInfo.remove("name")?.toString()
        val email = extraInfo.remove("email")?.toString()
        datadog.setUserInfo(id, name, email, extraInfo)
        promise.resolve(null)
    }

    /**
     * Set the tracking consent regarding the data collection.
     * @param trackingConsent Consent, which can take one of the following values: 'pending',
     * 'granted', 'not_granted'.
     */
    fun setTrackingConsent(trackingConsent: String, promise: Promise) {
        datadog.setTrackingConsent(buildTrackingConsent(trackingConsent))
        promise.resolve(null)
    }

    /**
     * Sends a telemetry debug event.
     * @param message Debug message.
     */
    fun telemetryDebug(message: String, promise: Promise) {
        datadog.telemetryDebug(message)
        promise.resolve(null)
    }

    /**
     * Sends a telemetry error event.
     * @param message Error message.
     * @param stack Error stack.
     * @param kind Error kind.
     */
    fun telemetryError(message: String, stack: String, kind: String, promise: Promise) {
        datadog.telemetryError(message, stack, kind)
        promise.resolve(null)
    }

    /**
     * Sends WebView Events.
     * @param message User action.
     */
    fun consumeWebviewEvent(message: String, promise: Promise) {
        datadog.consumeWebviewEvent(message)
        promise.resolve(null)
    }

    /**
     * Clears all data that has not already been sent to Datadog servers.
     */
    fun clearAllData(promise: Promise) {
        datadog.clearAllData()
        promise.resolve(null)
    }

    // endregion

    // region Internal

    private fun configureSdkVerbosity(configuration: DdSdkConfiguration) {
        val verbosityConfig = configuration.additionalConfig?.get(DD_SDK_VERBOSITY) as? String
        val verbosity =
            when (verbosityConfig?.lowercase(Locale.US)) {
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

    private fun configureRumAndTracesForLogs(configuration: DdSdkConfiguration) {
        val rumForLogsEnabled =
            configuration.additionalConfig?.get(DD_RUM_ENABLE_LOGS) as? Boolean
                ?: RUM_ENABLE_LOGS_DEFAULT
        val tracesForLogsEnabled =
            configuration.additionalConfig?.get(DD_TRACES_ENABLE_LOGS) as? Boolean
                ?: TRACES_ENABLE_LOGS_DEFAULT

        (datadog as? DatadogSDKWrapper)?.apply {
            this.setRumForLogsEnabled(rumForLogsEnabled)
            this.setTracesForLogsEnabled(tracesForLogsEnabled)
        }
    }

    private fun getDefaultAppVersion(): String {
        val packageName = appContext.packageName
        val packageInfo =
            try {
                appContext.packageManager.getPackageInfo(packageName, 0)
            } catch (e: PackageManager.NameNotFoundException) {
                datadog.telemetryError(e.message ?: PACKAGE_INFO_NOT_FOUND_ERROR_MESSAGE, e)
                return DEFAULT_APP_VERSION
            }

        return packageInfo?.let {
            // we need to use the deprecated method because getLongVersionCode method is only
            // available from API 28 and above
            @Suppress("DEPRECATION")
            it.versionName ?: it.versionCode.toString()
        }
            ?: DEFAULT_APP_VERSION
    }

    @Suppress("ComplexMethod", "LongMethod", "UnsafeCallOnNullableType")
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

        val viewTracking = configuration.additionalConfig?.get(DD_NATIVE_VIEW_TRACKING) as? Boolean
        if (viewTracking == true) {
            // Use sensible default
            configBuilder.useViewTrackingStrategy(ActivityViewTrackingStrategy(false))
        } else {
            configBuilder.useViewTrackingStrategy(NoOpViewTrackingStrategy)
        }

        val interactionTracking =
            configuration.additionalConfig?.get(DD_NATIVE_INTERACTION_TRACKING) as? Boolean
        if (interactionTracking == false) {
            configBuilder.disableUserInteractionTracking()
        }

        configBuilder.setResourceEventMapper(
            object : EventMapper<ResourceEvent> {
                override fun map(event: ResourceEvent): ResourceEvent? {
                    if (event.context?.additionalProperties?.containsKey(DD_DROP_RESOURCE) ==
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
                    if (event.context?.additionalProperties?.containsKey(DD_DROP_ACTION) == true
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

    private fun buildFirstPartyHosts(
        firstPartyHosts: List<ReadableMap>
    ): Map<String, Set<TracingHeaderType>> {
        /**
         * Adapts the data format from the React Native SDK configuration to match with the Android
         * SDK configuration. For example:
         *
         * RN config: [{ match: "example.com", propagatorTypes: [DATADOG, B3] }] Android config: {
         * "example.com": [DATADOG, B3] }
         */
        val firstPartyHostsWithHeaderTypes = mutableMapOf<String, MutableSet<TracingHeaderType>>()

        for (it in firstPartyHosts) {
            val match = it.getString("match")
            val propagatorTypes = it.getArray("propagatorTypes")?.asTracingHeaderTypes()
            if (match != null && propagatorTypes != null && propagatorTypes.isNotEmpty()) {
                val hostMatch = firstPartyHostsWithHeaderTypes[match]
                if (hostMatch != null) {
                    hostMatch.addAll(propagatorTypes)
                } else {
                    firstPartyHostsWithHeaderTypes[match] = propagatorTypes.toMutableSet()
                }
            }
        }

        return firstPartyHostsWithHeaderTypes
    }

    private fun buildSdkConfiguration(configuration: DdSdkConfiguration): Configuration {
        val serviceName = configuration.additionalConfig?.get(DD_SERVICE_NAME) as? String
        val configBuilder = Configuration.Builder(
            clientToken = configuration.clientToken,
            env = configuration.env,
            variant = "",
            service = serviceName
        )

        val additionalConfig = configuration.additionalConfig?.toMutableMap()
        val versionSuffix = configuration.additionalConfig?.get(DD_VERSION_SUFFIX) as? String
        if (versionSuffix != null && additionalConfig != null) {
            val defaultVersion = getDefaultAppVersion()
            additionalConfig.put(DD_VERSION, defaultVersion + versionSuffix)
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

        buildProxyConfiguration(configuration)?.let { (proxy, authenticator) ->
            configBuilder.setProxy(proxy, authenticator)
        }

        @Suppress("UNCHECKED_CAST")
        val firstPartyHosts =
            (configuration.additionalConfig?.get(DD_FIRST_PARTY_HOSTS) as? ReadableArray)
                ?.toArrayList() as?
                    List<ReadableMap>
        if (firstPartyHosts != null) {
            val firstPartyHostsWithHeaderTypes = buildFirstPartyHosts(firstPartyHosts)
            configBuilder.setFirstPartyHostsWithHeaderType(firstPartyHostsWithHeaderTypes)
        }

        return configBuilder.build()
    }

    internal fun buildTrackingConsent(trackingConsent: String?): TrackingConsent {
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

    internal fun buildProxyConfiguration(
        configuration: DdSdkConfiguration
    ): Pair<Proxy, ProxyAuthenticator?>? {
        val additionalConfig = configuration.additionalConfig ?: return null

        val address = additionalConfig[DD_PROXY_ADDRESS] as? String
        val port = (additionalConfig[DD_PROXY_PORT] as? Number)?.toInt()
        val type =
            (additionalConfig[DD_PROXY_TYPE] as? String)?.let {
                when (it.lowercase(Locale.US)) {
                    "http", "https" -> Proxy.Type.HTTP
                    "socks" -> Proxy.Type.SOCKS
                    else -> {
                        Log.w(
                            DdSdk::class.java.canonicalName,
                            "Unknown proxy type given: $it, skipping proxy configuration."
                        )
                        null
                    }
                }
            }

        val proxy =
            if (address != null && port != null && type != null) {
                Proxy(type, InetSocketAddress(address, port))
            } else {
                return null
            }

        val username = additionalConfig[DD_PROXY_USERNAME] as? String
        val password = additionalConfig[DD_PROXY_PASSWORD] as? String

        val authenticator =
            if (username != null && password != null) {
                ProxyAuthenticator(username, password)
            } else {
                null
            }

        return Pair(proxy, authenticator)
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

    private fun handlePostFrameCallbackError(e: IllegalStateException) {
        datadog.telemetryError(e.message ?: MONITOR_JS_ERROR_MESSAGE, e)
    }

    private fun monitorJsRefreshRate(ddSdkConfiguration: DdSdkConfiguration) {
        val frameTimeCallback = buildFrameTimeCallback(ddSdkConfiguration)
        if (frameTimeCallback != null) {
            reactContext.runOnJSQueueThread {
                val vitalFrameCallback =
                    VitalFrameCallback(frameTimeCallback, ::handlePostFrameCallbackError) {
                        initialized.get()
                    }
                try {
                    Choreographer.getInstance().postFrameCallback(vitalFrameCallback)
                } catch (e: IllegalStateException) {
                    // This should never happen as the React Native thread always has a Looper
                    handlePostFrameCallbackError(e)
                }
            }
        }
    }

    private fun buildFrameTimeCallback(
        ddSdkConfiguration: DdSdkConfiguration
    ): ((Double) -> Unit)? {
        val jsRefreshRateMonitoringEnabled =
            buildVitalUpdateFrequency(ddSdkConfiguration.vitalsUpdateFrequency) !=
                    VitalsUpdateFrequency.NEVER
        val jsLongTasksMonitoringEnabled = ddSdkConfiguration.longTaskThresholdMs != 0.0

        if (!jsLongTasksMonitoringEnabled && !jsRefreshRateMonitoringEnabled) {
            return null
        }

        return {
            if (jsRefreshRateMonitoringEnabled && it > 0.0) {
                datadog.getRumMonitor()
                    ._getInternal()
                    ?.updatePerformanceMetric(RumPerformanceMetric.JS_FRAME_TIME, it)
            }
            if (jsLongTasksMonitoringEnabled &&
                it >
                TimeUnit.MILLISECONDS.toNanos(
                    ddSdkConfiguration.longTaskThresholdMs?.toLong() ?: 0L
                )
            ) {
                datadog.getRumMonitor()._getInternal()?.addLongTask(it.toLong(), "javascript")
            }
        }
    }

    // endregion

    companion object {
        internal const val DEFAULT_APP_VERSION = "?"
        internal const val DD_NATIVE_VIEW_TRACKING = "_dd.native_view_tracking"
        internal const val DD_NATIVE_INTERACTION_TRACKING = "_dd.native_interaction_tracking"
        internal const val DD_SDK_VERBOSITY = "_dd.sdk_verbosity"
        internal const val DD_RUM_ENABLE_LOGS = "_dd.enable_rum_for_logs"
        internal const val DD_TRACES_ENABLE_LOGS = "_dd.enable_traces_for_logs"
        internal const val DD_SERVICE_NAME = "_dd.service_name"
        internal const val DD_FIRST_PARTY_HOSTS = "_dd.first_party_hosts"
        internal const val DD_VERSION = "_dd.version"
        internal const val DD_VERSION_SUFFIX = "_dd.version_suffix"
        internal const val DD_PROXY_ADDRESS = "_dd.proxy.address"
        internal const val DD_PROXY_PORT = "_dd.proxy.port"
        internal const val DD_PROXY_TYPE = "_dd.proxy.type"
        internal const val DD_PROXY_USERNAME = "_dd.proxy.username"
        internal const val DD_PROXY_PASSWORD = "_dd.proxy.password"
        internal const val DD_DROP_RESOURCE = "_dd.resource.drop_resource"
        internal const val DD_DROP_ACTION = "_dd.action.drop_action"
        internal const val MONITOR_JS_ERROR_MESSAGE = "Error monitoring JS refresh rate"
        internal const val PACKAGE_INFO_NOT_FOUND_ERROR_MESSAGE = "Error getting package info"
        internal const val NAME = "DdSdk"
    }
}
