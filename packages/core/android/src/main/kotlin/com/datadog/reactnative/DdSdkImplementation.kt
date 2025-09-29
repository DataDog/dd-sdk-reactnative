/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.Context
import android.util.Log
import com.datadog.android.privacy.TrackingConsent
import com.datadog.android.rum.RumPerformanceMetric
import com.datadog.android.rum.configuration.VitalsUpdateFrequency
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import java.util.Locale
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/** The entry point to initialize Datadog's features. */
@Suppress("TooManyFunctions")
class DdSdkImplementation(
    private val reactContext: ReactApplicationContext,
    private val datadog: DatadogWrapper = DatadogSDKWrapper(),
    private val ddTelemetry: DdTelemetry = DdTelemetry(),
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

        val nativeInitialization = DdSdkNativeInitialization(appContext, datadog, ddTelemetry)
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
     * Sets a specific attribute in the global context attached with all future Logs, Spans and RUM.
     *
     * @param key: Key that identifies the attribute.
     * @param value: Value linked to the attribute.
     */
    fun addAttribute(key: String, value: ReadableMap, promise: Promise) {
        val attributeValue = value.toMap()["value"]
        datadog.addRumGlobalAttribute(key, attributeValue)
        GlobalState.addAttribute(key, attributeValue)
        promise.resolve(null)
    }

    /**
     * Removes an attribute from the global context attached with all future Logs, Spans and RUM events.
     * @param key: They key associated with the attribute to be removed.
     */
    fun removeAttribute(key: String, promise: Promise) {
        datadog.removeRumGlobalAttribute(key)
        GlobalState.removeAttribute(key)
        promise.resolve(null)
    }


    /**
     * Adds a set of attributes to the global context that is attached with all future Logs, Spans and RUM
     * events.
     * @param attributes: The global context attributes.
     */
    fun addAttributes(attributes: ReadableMap, promise: Promise) {
        datadog.addRumGlobalAttributes(attributes.toHashMap())
        for ((k,v) in attributes.toHashMap()) {
            GlobalState.addAttribute(k, v)
        }
        promise.resolve(null)
    }

    /**
     * Removes a set of attributes from the global context that is attached with all future Logs, Spans and RUM
     * events.
     * @param keys: They keys associated with the attributes to be removed.
     */
    fun removeAttributes(keys: ReadableArray, promise: Promise) {
        val keysArray = mutableListOf<String>()
        for (i in 0 until keys.size()) {
            val key: String = keys.getString(i)
            keysArray.add(key)
        }
        val keysStringArray = keysArray.toTypedArray()

        datadog.removeRumGlobalAttributes(keysStringArray)
        for (key in keysStringArray) {
            GlobalState.removeAttribute(key)
        }
        promise.resolve(null)
    }

    /**
     * Set the user information.
     * @param userInfo The user object  (use builtin attributes: 'id', 'email', 'name', and any custom
     * attribute inside 'extraInfo').
     */
    fun setUserInfo(userInfo: ReadableMap, promise: Promise) {
        val userInfoMap = userInfo.toHashMap().toMutableMap()
        val id = userInfoMap["id"] as? String
        val name = userInfoMap["name"] as? String
        val email = userInfoMap["email"] as? String
        val extraInfo = (userInfoMap["extraInfo"] as? Map<*, *>)?.filterKeys { it is String }
            ?.mapKeys { it.key as String }
            ?.mapValues { it.value } ?: emptyMap()

        if (id != null) {
            datadog.setUserInfo(id, name, email, extraInfo)
        } else {
            // TO DO - Log warning?
        }

        promise.resolve(null)
    }

    /**
     * Sets the user extra information.
     * @param userExtraInfo: The additional information. (To set the id, name or email please user setUserInfo).
     */
    fun addUserExtraInfo(
        userExtraInfo: ReadableMap, promise: Promise
    ) {
        val extraInfoMap = userExtraInfo.toHashMap().toMutableMap()

        datadog.addUserExtraInfo(extraInfoMap)
        promise.resolve(null)
    }

    /**
     * Clears the user information.
     */
    fun clearUserInfo(promise: Promise) {
        datadog.clearUserInfo()
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
     * Convert React Native's ReadableMap to Map.
     * @param attributes Custom attributes we want to send along with the Telemetry Log
     * @param config Configuration object, can take 'onlyOnce: Boolean'
     */
    fun sendTelemetryLog(message: String, attributes: ReadableMap, config: ReadableMap, promise: Promise) {
        ddTelemetry.sendTelemetryLog(message, attributes, config)
        promise.resolve(null)
    }

    /**
     * Sends a telemetry debug event.
     * @param message Debug message.
     */
    fun telemetryDebug(message: String, promise: Promise) {
        ddTelemetry.telemetryDebug(message)
        promise.resolve(null)
    }

    /**
     * Sends a telemetry error event.
     * @param message Error message.
     * @param stack Error stack.
     * @param kind Error kind.
     */
    fun telemetryError(message: String, stack: String, kind: String, promise: Promise) {
        ddTelemetry.telemetryError(message, stack, kind)
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
    internal companion object {
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
