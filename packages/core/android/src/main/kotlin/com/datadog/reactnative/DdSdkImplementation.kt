/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.Context
import android.util.Log
import com.datadog.android.privacy.TrackingConsent
import com.datadog.android.rum.GlobalRumMonitor
import com.datadog.android.rum.RumPerformanceMetric
import com.datadog.android.rum.configuration.VitalsUpdateFrequency
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import java.util.Locale
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/** The entry point to initialize Datadog's features. */
class DdSdkImplementation(
    private val reactContext: ReactApplicationContext,
    private val datadog: DatadogWrapper = DatadogSDKWrapper(),
    private val uiThreadExecutor: UiThreadExecutor = ReactUiThreadExecutor()
) {
    internal val appContext: Context = reactContext.applicationContext
    internal val initialized = AtomicBoolean(false)
    private var frameRateProvider: FrameRateProvider? = null

    // region DdSdk

    /**
     * Initializes Datadog's features.
     * @param configuration The configuration to use.
     */
    fun initialize(configuration: ReadableMap, promise: Promise) {
        val ddSdkConfiguration = configuration.asDdSdkConfiguration()

        val nativeInitialization = DdSdkNativeInitialization(appContext, datadog)
        nativeInitialization.initialize(ddSdkConfiguration)

        this.frameRateProvider = createFrameRateProvider(ddSdkConfiguration)

        reactContext.addLifecycleEventListener(object : LifecycleEventListener {
            override fun onHostResume() {
                frameRateProvider?.start()
            }

            override fun onHostPause() {
                frameRateProvider?.stop()
            }

            override fun onHostDestroy() {
                frameRateProvider?.stop()
            }
        })

        configureSynthetics()

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

    private fun configureSynthetics() {
        if (DdSdkSynthetics.testId.isNullOrBlank() || DdSdkSynthetics.resultId.isNullOrBlank()) {
            return
        }

        datadog.getRumMonitor()._getInternal()?.setSyntheticsAttribute(
            DdSdkSynthetics.testId,
            DdSdkSynthetics.resultId
        )
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

    private fun createFrameRateProvider(
        ddSdkConfiguration: DdSdkConfiguration
    ): FrameRateProvider? {
        val frameTimeCallback = buildFrameTimeCallback(ddSdkConfiguration) ?: return null
        val frameRateProvider = FrameRateProvider(frameTimeCallback, uiThreadExecutor)
        reactContext.runOnJSQueueThread {
            frameRateProvider.start()
        }

        return frameRateProvider
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
        internal const val DD_VERSION = "_dd.version"
        internal const val DD_VERSION_SUFFIX = "_dd.version_suffix"
        internal const val DD_DROP_RESOURCE = "_dd.resource.drop_resource"
        internal const val DD_DROP_ACTION = "_dd.action.drop_action"
        internal const val MONITOR_JS_ERROR_MESSAGE = "Error monitoring JS refresh rate"
        internal const val PACKAGE_INFO_NOT_FOUND_ERROR_MESSAGE = "Error getting package info"
        internal const val NAME = "DdSdk"
    }
}
