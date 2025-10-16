/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.Context
import android.hardware.display.DisplayManager
import android.os.Build
import android.util.Log
import android.view.Display
import com.datadog.android.privacy.TrackingConsent
import com.datadog.android.rum.RumPerformanceMetric
import com.datadog.android.rum.configuration.VitalsUpdateFrequency
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import java.util.Locale
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.max

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
                val normalizedFrameTimeSeconds = normalizeFrameTime(it, appContext)
                datadog.getRumMonitor()
                    ._getInternal()
                    ?.updatePerformanceMetric(RumPerformanceMetric.JS_FRAME_TIME, normalizedFrameTimeSeconds)
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

    /**
     * Normalizes frameTime values so when are turned into FPS metrics they are normalized on a range of zero to 60fps.
     * @param frameTimeSeconds: the frame time to normalize. In seconds.
     * @param context: The current app context
     * @param fpsBudget: The maximum fps under which the frame Time will be normalized [0-fpsBudget]. Defaults to 60Hz.
     * @param deviceDisplayFps: The maximum fps supported by the device. If not provided it will be set from the value obtained from the app context.
     */
    @Suppress("CyclomaticComplexMethod")
    fun normalizeFrameTime(
        frameTimeSeconds: Double,
        context: Context,
        fpsBudget: Double? = null,
        deviceDisplayFps: Double? = null,
    ) : Double {
        val frameTimeMs = frameTimeSeconds * 1000.0
        val frameBudgetHz = fpsBudget ?: DEFAULT_REFRESH_HZ
        val maxDeviceDisplayHz = deviceDisplayFps ?:  getMaxDisplayRefreshRate(context)
            ?: 60.0

        val maxDeviceFrameTimeMs = 1000.0 / maxDeviceDisplayHz
        val budgetFrameTimeMs = 1000.0 / frameBudgetHz

        if (listOf(
            maxDeviceDisplayHz, frameTimeMs, frameBudgetHz, budgetFrameTimeMs, maxDeviceFrameTimeMs
        ).any { !it.isFinite() || it <= 0.0 }
        ) return 1.0 / DEFAULT_REFRESH_HZ


        var normalizedFrameTimeMs = frameTimeMs / (maxDeviceFrameTimeMs / budgetFrameTimeMs)

        normalizedFrameTimeMs = max(normalizedFrameTimeMs, maxDeviceFrameTimeMs)

        return normalizedFrameTimeMs / 1000.0 // in seconds
    }

    @Suppress("CyclomaticComplexMethod")
    private fun getMaxDisplayRefreshRate(context: Context?): Double {
        val dm = context?.getSystemService(Context.DISPLAY_SERVICE) as? DisplayManager ?: return 60.0
        val display: Display = dm.getDisplay(Display.DEFAULT_DISPLAY) ?: return DEFAULT_REFRESH_HZ

        return display.supportedModes.maxOf { it.refreshRate.toDouble() }
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
        internal const val DEFAULT_REFRESH_HZ = 60.0
        internal const val NAME = "DdSdk"
    }
}
