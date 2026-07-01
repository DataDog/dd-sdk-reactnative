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
import com.facebook.react.bridge.ReadableArray
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
    private val uiThreadExecutor: UiThreadExecutor = ReactUiThreadExecutor(),
    private val jsThreadExecutor: JsThreadExecutor = ReactJsThreadExecutor(reactContext)
) {
    internal val appContext: Context = reactContext.applicationContext
    internal val initialized = AtomicBoolean(false)
    private var frameRateProvider: FrameRateProvider? = null
    private val nativeFfeCore: NativeFfeCore = NativeFfeCore()
    private val nativeFfeConfigurationFetcher: NativeFfeConfigurationFetcher = NativeFfeConfigurationFetcher()
    private val nativeFfeConfigurationStore: NativeFfeConfigurationStore =
        DatadogDataStoreNativeFfeConfigurationStore(
            fallbackStore = FileNativeFfeConfigurationStore(appContext)
        )
    private val nativeFfeSideEffects: NativeFfeEvaluationSideEffects = NativeFfeEvaluationSideEffects()

    // region DdSdk

    /**
     * Initializes Datadog's features.
     * @param configuration The configuration to use.
     */
    fun initialize(configuration: ReadableMap, promise: Promise) {
        val ddSdkConfiguration = configuration.asDdSdkConfiguration()

        // On new arch DdSdk is a lazy TurboModule — it's instantiated on the first JS-side
        // method call (typically this initialize()), which usually lands AFTER the activity's
        // first onHostResume. That means registerLifecycleEvents's listener missed the first
        // resume, reactContext is still null on the session listener, and the replay inside
        // nativeInitialization.initialize → onRnSdkInitialized has no emitter target. Setting
        // the reactContext here — we are provably being dispatched through an active one —
        // closes that race so the cached session ID is delivered on the first JS init.
        DdSdkSessionStartedListener.getInstance().setReactContext(reactContext)

        val nativeInitialization = DdSdkNativeInitialization(appContext, datadog, ddTelemetry)
        nativeInitialization.initialize(ddSdkConfiguration)

        val activity = reactContext.currentActivity
        if (ddSdkConfiguration.rumConfiguration != null && activity != null) {
            datadog.getRumMonitor()._getInternal()?.enableJankStatsTracking(activity)
        }

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
            keys.getString(i)?.let { if (it.isNotBlank()) keysArray.add(it) }
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
     * Set the account information.
     * @param accountInfo The account object (use builtin attributes: 'id', 'name', and any custom
     * attribute inside 'extraInfo').
     */
    fun setAccountInfo(accountInfo: ReadableMap, promise: Promise) {
        val accountInfoMap = accountInfo.toHashMap().toMutableMap()
        val id = accountInfoMap["id"] as? String
        val name = accountInfoMap["name"] as? String
        val extraInfo = (accountInfoMap["extraInfo"] as? Map<*, *>)?.filterKeys { it is String }
            ?.mapKeys { it.key as String }
            ?.mapValues { it.value } ?: emptyMap()

        if (id != null) {
            datadog.setAccountInfo(id, name, extraInfo)
        }

        promise.resolve(null)
    }

    /**
     * Sets the account extra information.
     * @param accountExtraInfo: The additional information. (To set the id or name please use setAccountInfo).
     */
    fun addAccountExtraInfo(
        accountExtraInfo: ReadableMap, promise: Promise
    ) {
        val extraInfoMap = accountExtraInfo.toHashMap().toMutableMap()

        datadog.addAccountExtraInfo(extraInfoMap)
        promise.resolve(null)
    }

    /**
     * Clears the account information.
     */
    fun clearAccountInfo(promise: Promise) {
        datadog.clearAccountInfo()
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

    /**
     * Parses a serialized flags configuration wire payload into the bridge representation.
     */
    fun configurationFromString(wire: String, promise: Promise) {
        resolveFfePromise(promise) {
            nativeFfeCore.configurationFromString(wire).toMap().toWritableMap()
        }
    }

    /**
     * Serializes a bridge flags configuration back to its wire payload.
     */
    fun configurationToString(configuration: ReadableMap, promise: Promise) {
        resolveFfePromise(promise) {
            nativeFfeCore.configurationToString(configuration.toMap())
        }
    }

    /**
     * Fetches a rules-based flags configuration and returns it as a bridge configuration.
     */
    fun fetchRulesConfiguration(options: ReadableMap, promise: Promise) {
        resolveFfePromise(promise) {
            nativeFfeCore.fetchConfiguration(
                FFE_KIND_RULES,
                options.toMap(),
                nativeFfeConfigurationFetcher,
            ).toMap().toWritableMap()
        }
    }

    /**
     * Fetches a precomputed flags configuration and returns it as a bridge configuration.
     */
    fun fetchPrecomputedConfiguration(options: ReadableMap, promise: Promise) {
        resolveFfePromise(promise) {
            nativeFfeCore.fetchConfiguration(
                FFE_KIND_PRECOMPUTED,
                options.toMap(),
                nativeFfeConfigurationFetcher,
            ).toMap().toWritableMap()
        }
    }

    /**
     * Persists a flags configuration in the requested native storage slot.
     */
    fun saveConfiguration(configuration: ReadableMap, options: ReadableMap, promise: Promise) {
        resolveFfePromise(promise) {
            nativeFfeCore.saveConfiguration(
                configuration.toMap(),
                options.toMap(),
                nativeFfeConfigurationStore,
            ).toWritableMap()
        }
    }

    /**
     * Loads a persisted flags configuration from the requested native storage slot.
     */
    fun loadConfiguration(options: ReadableMap, promise: Promise) {
        resolveFfePromise(promise) {
            nativeFfeCore.loadConfiguration(
                options.toMap(),
                nativeFfeConfigurationStore,
            ).toMap().toWritableMap()
        }
    }

    /**
     * Activates a flags configuration for subsequent native evaluations.
     */
    fun setConfiguration(configuration: ReadableMap, promise: Promise) {
        resolveFfePromise(promise) {
            nativeFfeCore.setConfiguration(configuration.toMap()).toWritableMap()
        }
    }

    /**
     * Updates the evaluation context used by subsequent native flag evaluations.
     */
    fun setEvaluationContext(context: ReadableMap, promise: Promise) {
        resolveFfePromise(promise) {
            nativeFfeCore.setEvaluationContext(context.toMap()).toWritableMap()
        }
    }

    /**
     * Resolves a boolean flag evaluation through the active native configuration.
     */
    fun resolveBooleanEvaluation(flagKey: String, defaultValue: Boolean, promise: Promise) {
        resolveFfePromise(promise) {
            resolveNativeFfeEvaluation {
                nativeFfeCore.resolveBooleanEvaluation(flagKey, defaultValue)
            }.toWritableMap()
        }
    }

    /**
     * Resolves a string flag evaluation through the active native configuration.
     */
    fun resolveStringEvaluation(flagKey: String, defaultValue: String, promise: Promise) {
        resolveFfePromise(promise) {
            resolveNativeFfeEvaluation {
                nativeFfeCore.resolveStringEvaluation(flagKey, defaultValue)
            }.toWritableMap()
        }
    }

    /**
     * Resolves a numeric flag evaluation through the active native configuration.
     */
    fun resolveNumberEvaluation(flagKey: String, defaultValue: Double, promise: Promise) {
        resolveFfePromise(promise) {
            resolveNativeFfeEvaluation {
                nativeFfeCore.resolveNumberEvaluation(flagKey, defaultValue)
            }.toWritableMap()
        }
    }

    /**
     * Resolves a JSON/object flag evaluation through the active native configuration.
     */
    fun resolveObjectEvaluation(flagKey: String, defaultValue: ReadableMap, promise: Promise) {
        resolveFfePromise(promise) {
            resolveNativeFfeEvaluation {
                nativeFfeCore.resolveObjectEvaluation(flagKey, defaultValue.toMap())
            }.toWritableMap()
        }
    }

    /**
     * Returns native flags provider counters and last-operation state for the bridge.
     */
    fun getProviderDebugState(promise: Promise) {
        resolveFfePromise(promise) {
            (
                nativeFfeCore.debugState() +
                    mapOf("evaluationSideEffects" to nativeFfeSideEffects.debugState())
            ).toWritableMap()
        }
    }

    /**
     * Runs a benchmark-only aggregate evaluator loop inside native. This path
     * intentionally skips evaluation side effects so it measures evaluator cost.
     */
    fun runNativeFfeBenchmark(options: ReadableMap, promise: Promise) {
        resolveFfePromise(promise) {
            nativeFfeCore.runBenchmark(options.toMap()).toWritableMap()
        }
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

    @Suppress("TooGenericExceptionCaught")
    private inline fun resolveFfePromise(
        promise: Promise,
        block: () -> Any?
    ) {
        try {
            promise.resolve(block())
        } catch (error: Exception) {
            promise.reject(FFE_ERROR_CODE, error.message, error)
        }
    }

    private inline fun resolveNativeFfeEvaluation(
        block: () -> Map<String, Any?>
    ): Map<String, Any?> {
        val result = block()
        nativeFfeSideEffects.trackEvaluation(result, nativeFfeCore.evaluationContext())
        return result
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
        val frameRateProvider = FrameRateProvider(frameTimeCallback, jsThreadExecutor)
        frameRateProvider.start()

        return frameRateProvider
    }

    @Suppress("CyclomaticComplexMethod")
    private fun buildFrameTimeCallback(
        ddSdkConfiguration: DdSdkConfiguration
    ): ((Double) -> Unit)? {
        val jsRefreshRateMonitoringEnabled =
            ddSdkConfiguration.rumConfiguration != null &&
            buildVitalUpdateFrequency(ddSdkConfiguration.rumConfiguration.vitalsUpdateFrequency) !=
                    VitalsUpdateFrequency.NEVER
        val jsLongTasksMonitoringEnabled = ddSdkConfiguration.rumConfiguration != null && ddSdkConfiguration.rumConfiguration.longTaskThresholdMs != 0.0

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
                    ddSdkConfiguration.rumConfiguration?.longTaskThresholdMs?.toLong() ?: 0L
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

        return display.supportedModes.maxOfOrNull { it.refreshRate.toDouble() } ?: DEFAULT_REFRESH_HZ
    }

    // endregion
    internal companion object {
        internal const val DEFAULT_APP_VERSION = "?"
        internal const val DD_VERSION = "_dd.version"
        internal const val DD_VERSION_SUFFIX = "_dd.version_suffix"
        internal const val DD_NEEDS_CLEAR_TEXT_HTTP = "_dd.needsClearTextHttp"
        internal const val DD_DROP_RESOURCE = "_dd.resource.drop_resource"
        internal const val DD_DROP_ACTION = "_dd.action.drop_action"
        internal const val MONITOR_JS_ERROR_MESSAGE = "Error monitoring JS refresh rate"
        internal const val PACKAGE_INFO_NOT_FOUND_ERROR_MESSAGE = "Error getting package info"
        internal const val DEFAULT_REFRESH_HZ = 60.0
        internal const val NAME = "DdSdk"
        internal const val FFE_ERROR_CODE = "FEATURE_FLAGS_CONFIGURATION_ERROR"
        internal const val FFE_KIND_RULES = "rules"
        internal const val FFE_KIND_PRECOMPUTED = "precomputed"
    }
}
