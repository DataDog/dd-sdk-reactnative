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
import com.datadog.android._InternalProxy
import com.datadog.android.core.configuration.Configuration
import com.datadog.android.core.configuration.Credentials
import com.datadog.android.core.configuration.VitalsUpdateFrequency
import com.datadog.android.event.EventMapper
import com.datadog.android.privacy.TrackingConsent
import com.datadog.android.rum.GlobalRum
import com.datadog.android.rum.RumMonitor
import com.datadog.android.rum.RumPerformanceMetric
import com.datadog.android.rum.model.ActionEvent
import com.datadog.android.rum.model.ResourceEvent
import com.datadog.android.rum.tracking.ActivityViewTrackingStrategy
import com.datadog.android.telemetry.model.TelemetryConfigurationEvent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.net.InetSocketAddress
import java.net.Proxy
import java.util.Locale
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/**
 * The entry point to initialize Datadog's features.
 */
class DdSdk(
    reactContext: ReactApplicationContext,
    private val datadog: DatadogWrapper = DatadogSDKWrapper()
) : ReactContextBaseJavaModule(reactContext) {

    internal val appContext: Context = reactContext.applicationContext
    internal val reactContext: ReactApplicationContext = reactContext
    internal val initialized = AtomicBoolean(false)

    override fun getName(): String = "DdSdk"

    // region DdSdk

    /**
     * Initializes Datadog's features.
     * @param configuration The configuration to use.
     */
    @ReactMethod
    fun initialize(configuration: ReadableMap, promise: Promise) {
        val ddSdkConfiguration = configuration.asDdSdkConfiguration()
        val credentials = buildCredentials(ddSdkConfiguration)
        val nativeConfiguration = buildConfiguration(ddSdkConfiguration)
        val trackingConsent = buildTrackingConsent(ddSdkConfiguration.trackingConsent)

        configureSdkVerbosity(ddSdkConfiguration)

        datadog.initialize(appContext, credentials, nativeConfiguration, trackingConsent)

        datadog.registerRumMonitor(RumMonitor.Builder().build())
        monitorJsRefreshRate(ddSdkConfiguration)
        initialized.set(true)

        promise.resolve(null)
    }

    /**
     * Sets the global context (set of attributes) attached with all future Logs, Spans and RUM events.
     * @param attributes The global context attributes.
     */
    @ReactMethod
    fun setAttributes(attributes: ReadableMap, promise: Promise) {
        datadog.addRumGlobalAttributes(attributes.toHashMap())
        attributes.toHashMap().forEach { (k, v) ->
            GlobalState.addAttribute(k, v)
        }
        promise.resolve(null)
    }

    /**
     * Set the user information.
     * @param user The user object (use builtin attributes: 'id', 'email', 'name', and/or any custom attribute).
     */
    @ReactMethod
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
     * @param trackingConsent Consent, which can take one of the following values: 'pending', 'granted', 'not_granted'.
     */
    @ReactMethod
    fun setTrackingConsent(trackingConsent: String, promise: Promise) {
        datadog.setTrackingConsent(buildTrackingConsent(trackingConsent))
        promise.resolve(null)
    }

    /**
     * Sends a telemetry debug event.
     * @param message Debug message.
     */
    @ReactMethod
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
    @ReactMethod
    fun telemetryError(message: String, stack: String, kind: String, promise: Promise) {
        datadog.telemetryError(message, stack, kind)
        promise.resolve(null)
    }

    // endregion

    // region Internal

    private fun configureSdkVerbosity(configuration: DdSdkConfiguration) {
        val verbosityConfig = configuration.additionalConfig?.get(DD_SDK_VERBOSITY) as? String
        val verbosity = when (verbosityConfig?.lowercase(Locale.US)) {
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
        val packageInfo = try {
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
        } ?: DEFAULT_APP_VERSION
    }

    @Suppress("ComplexMethod", "UnsafeCallOnNullableType")
    private fun buildConfiguration(configuration: DdSdkConfiguration): Configuration {
        val additionalConfig = configuration.additionalConfig?.toMutableMap()

        val versionSuffix = configuration.additionalConfig?.get(DD_VERSION_SUFFIX) as? String
        if (versionSuffix != null && additionalConfig != null) {
            val defaultVersion = getDefaultAppVersion()
            additionalConfig.put(DD_VERSION, defaultVersion + versionSuffix)
        }

        val configBuilder = Configuration.Builder(
            logsEnabled = true,
            tracesEnabled = true,
            crashReportsEnabled = configuration.nativeCrashReportEnabled ?: false,
            rumEnabled = true
        )
            .setAdditionalConfiguration(
                additionalConfig
                    ?.filterValues { it != null }
                    ?.mapValues { it.value!! } ?: emptyMap()
            )
        if (configuration.sampleRate != null) {
            configBuilder.sampleRumSessions(configuration.sampleRate.toFloat())
        }

        configBuilder.useSite(buildSite(configuration.site))
        configBuilder.setVitalsUpdateFrequency(
            buildVitalUpdateFrequency(configuration.vitalsUpdateFrequency)
        )

        val telemetrySampleRate = (configuration.telemetrySampleRate as? Number)?.toFloat()
        telemetrySampleRate?.let { configBuilder.sampleTelemetry(it) }

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

        val interactionTracking = configuration.additionalConfig?.get(
            DD_NATIVE_INTERACTION_TRACKING
        ) as? Boolean
        if (interactionTracking == false) {
            configBuilder.disableInteractionTracking()
        }

        val firstPartyHosts =
            (configuration.additionalConfig?.get(DD_FIRST_PARTY_HOSTS) as? List<String>)
        if (firstPartyHosts != null) {
            configBuilder.setFirstPartyHosts(firstPartyHosts)
        }

        buildProxyConfiguration(configuration)?.let { (proxy, authenticator) ->
            configBuilder.setProxy(proxy, authenticator)
        }

        configBuilder.setRumResourceEventMapper(object : EventMapper<ResourceEvent> {
            override fun map(event: ResourceEvent): ResourceEvent? {
                if (event.context?.additionalProperties?.containsKey(DD_DROP_RESOURCE) == true) {
                    return null
                }
                return event
            }
        })

        configBuilder.setRumActionEventMapper(object : EventMapper<ActionEvent> {
            override fun map(event: ActionEvent): ActionEvent? {
                if (event.context?.additionalProperties?.containsKey(DD_DROP_ACTION) == true) {
                    return null
                }
                return event
            }
        })

        _InternalProxy.setTelemetryConfigurationEventMapper(
            configBuilder,
            object : EventMapper<TelemetryConfigurationEvent> {
                override fun map(event: TelemetryConfigurationEvent): TelemetryConfigurationEvent? {
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

                    return event
                }
            }
        )

        return configBuilder.build()
    }

    private fun buildCredentials(configuration: DdSdkConfiguration): Credentials {
        val serviceName = configuration.additionalConfig?.get(DD_SERVICE_NAME) as? String
        return Credentials(
            clientToken = configuration.clientToken,
            envName = configuration.env,
            rumApplicationId = configuration.applicationId,
            variant = "",
            serviceName = serviceName
        )
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

    internal fun buildProxyConfiguration(configuration: DdSdkConfiguration):
        Pair<Proxy, ProxyAuthenticator?>? {
        val additionalConfig = configuration.additionalConfig ?: return null

        val address = additionalConfig[DD_PROXY_ADDRESS] as? String
        val port = (additionalConfig[DD_PROXY_PORT] as? Number)?.toInt()
        val type = (additionalConfig[DD_PROXY_TYPE] as? String)?.let {
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

        val proxy = if (address != null && port != null && type != null) {
            Proxy(type, InetSocketAddress(address, port))
        } else {
            return null
        }

        val username = additionalConfig[DD_PROXY_USERNAME] as? String
        val password = additionalConfig[DD_PROXY_PASSWORD] as? String

        val authenticator = if (username != null && password != null) {
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

    private fun handlePostFrameCallbackError(e: IllegalStateException) {
        datadog.telemetryError(e.message ?: MONITOR_JS_ERROR_MESSAGE, e)
    }

    private fun monitorJsRefreshRate(ddSdkConfiguration: DdSdkConfiguration) {
        val frameTimeCallback = buildFrameTimeCallback(ddSdkConfiguration)
        if (frameTimeCallback != null) {
            reactContext.runOnJSQueueThread {
                val vitalFrameCallback =
                    VitalFrameCallback(
                        frameTimeCallback,
                        ::handlePostFrameCallbackError
                    ) {
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

    private fun buildFrameTimeCallback(ddSdkConfiguration: DdSdkConfiguration):
        ((Double) -> Unit)? {
        val jsRefreshRateMonitoringEnabled = buildVitalUpdateFrequency(
            ddSdkConfiguration.vitalsUpdateFrequency
        ) != VitalsUpdateFrequency.NEVER
        val jsLongTasksMonitoringEnabled = ddSdkConfiguration.longTaskThresholdMs != 0.0

        if (!jsLongTasksMonitoringEnabled && !jsRefreshRateMonitoringEnabled) {
            return null
        }

        return {
            if (jsRefreshRateMonitoringEnabled && it > 0.0) {
                GlobalRum.get()._getInternal()?.updatePerformanceMetric(
                    RumPerformanceMetric.JS_FRAME_TIME,
                    it
                )
            }
            if (jsLongTasksMonitoringEnabled && it > TimeUnit.MILLISECONDS.toNanos(
                    ddSdkConfiguration.longTaskThresholdMs?.toLong() ?: 0L
                )
            ) {
                GlobalRum.get()._getInternal()?.addLongTask(it.toLong(), "javascript")
            }
        }
    }

    // endregion

    companion object {
        internal const val DEFAULT_APP_VERSION = "?"
        internal const val DD_NATIVE_VIEW_TRACKING = "_dd.native_view_tracking"
        internal const val DD_NATIVE_INTERACTION_TRACKING = "_dd.native_interaction_tracking"
        internal const val DD_SDK_VERBOSITY = "_dd.sdk_verbosity"
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
    }
}
