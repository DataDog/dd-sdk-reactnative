/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.app.Activity
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

/** The entry point to initialize Datadog's features. */
class DdSdk(
    reactContext: ReactApplicationContext,
    datadogWrapper: DatadogWrapper = DatadogSDKWrapper(),
    ddTelemetry: DdTelemetry = DdTelemetry()
) : ReactContextBaseJavaModule(reactContext) {

    private val implementation = DdSdkImplementation(
        reactContext,
        datadog = datadogWrapper,
        ddTelemetry
    )
    private var lifecycleEventListener: LifecycleEventListener? = null

    override fun getName(): String = DdSdkImplementation.NAME

    init {
        lifecycleEventListener?.let { reactContext.removeLifecycleEventListener(it) }
        lifecycleEventListener = object : LifecycleEventListener {
            override fun onHostResume() {
                val currentActivity: Activity? = reactContext.currentActivity
                if (currentActivity != null) {
                    val intent = currentActivity.intent
                    val extras = intent.extras
                    DdSdkSynthetics.testId = extras?.getString("_dd.synthetics.test_id")
                    DdSdkSynthetics.resultId = extras?.getString("_dd.synthetics.result_id")
                }

                DdSdkSessionStartedListener.getInstance().setReactContext(reactContext)
            }

            override fun onHostPause() {
                DdSdkSessionStartedListener.invalidate()
            }

            override fun onHostDestroy() {
                DdSdkSessionStartedListener.invalidate()
            }
        }
        reactContext.addLifecycleEventListener(lifecycleEventListener)
    }

    /**
     * Initializes Datadog's features.
     * @param configuration The configuration to use.
     */
    @ReactMethod
    fun initialize(configuration: ReadableMap, promise: Promise) {
        implementation.initialize(configuration, promise)
    }

    /**
     * Sets a specific attribute in the global context attached with all future Logs, Spans and RUM
     *
     * @param key: Key that identifies the attribute.
     * @param value: Value linked to the attribute.
     */
    @ReactMethod
    fun addAttribute(key: String, value: ReadableMap, promise: Promise) {
        implementation.addAttribute(key, value, promise)
    }

    /**
     * Removes an attribute from the context attached with all future Logs, Spans and RUM events.
     * @param key: They key associated with the attribute to be removed.
     */
    @ReactMethod
    fun removeAttribute(key: String, promise: Promise) {
        implementation.removeAttribute(key, promise)
    }

    /**
     * Adds a set of attributes to the global context that is attached with all future Logs, Spans and RUM
     * events.
     * @param attributes The global context attributes.
     */
    @ReactMethod
    fun addAttributes(attributes: ReadableMap, promise: Promise) {
        implementation.addAttributes(attributes, promise)
    }

    /**
     * Removes a set of attributes from the global context that is attached with all future Logs, Spans and RUM
     * events.
     * @param keys: They keys associated with the attributes to be removed.
     */
    @ReactMethod
    fun removeAttributes(keys: ReadableArray, promise: Promise) {
        implementation.removeAttributes(keys, promise)
    }

    /**
     * Set the user information.
     * @param user The user object  (use builtin attributes: 'id', 'email', 'name', and any custom * attribute inside 'extraInfo').
     */
    @ReactMethod
    fun setUserInfo(user: ReadableMap, promise: Promise) {
        implementation.setUserInfo(user, promise)
    }

    /**
     * Sets the user information.
     * @param extraUserInfo: The additional information. (To set the id, name or email please user setUserInfo).
     */
    @ReactMethod
    fun addUserExtraInfo(extraInfo: ReadableMap, promise: Promise) {
        implementation.addUserExtraInfo(extraInfo, promise)
    }

    /**
     * Clears the user information.
     */
    @ReactMethod
    fun clearUserInfo(promise: Promise) {
        implementation.clearUserInfo(promise)
    }

    /**
     * Set the account information.
     * @param account The account object (use builtin attributes: 'id', 'name', and any custom * attribute inside 'extraInfo').
     */
    @ReactMethod
    fun setAccountInfo(account: ReadableMap, promise: Promise) {
        implementation.setAccountInfo(account, promise)
    }

    /**
     * Sets the account information.
     * @param extraAccountInfo: The additional information. (To set the id or name please use setAccountInfo).
     */
    @ReactMethod
    fun addAccountExtraInfo(extraInfo: ReadableMap, promise: Promise) {
        implementation.addAccountExtraInfo(extraInfo, promise)
    }

    /**
     * Clears the account information.
     */
    @ReactMethod
    fun clearAccountInfo(promise: Promise) {
        implementation.clearAccountInfo(promise)
    }

    /**
     * Set the tracking consent regarding the data collection.
     * @param trackingConsent Consent, which can take one of the following values: 'pending',
     * 'granted', 'not_granted'.
     */
    @ReactMethod
    fun setTrackingConsent(trackingConsent: String, promise: Promise) {
        implementation.setTrackingConsent(trackingConsent, promise)
    }

    /**
     * Sends a telemetry event with attributes.
     * @param message message.
     * @param attributes telemetry attributes.
     * @param config telemetry configuration.
     */
    @ReactMethod
    fun sendTelemetryLog(
        message: String,
        attributes: ReadableMap,
        config: ReadableMap,
        promise: Promise
    ) {
        implementation.sendTelemetryLog(message, attributes, config, promise)
    }

    /**
     * Sends a telemetry debug event.
     * @param message Debug message.
     */
    @ReactMethod
    fun telemetryDebug(message: String, promise: Promise) {
        implementation.telemetryDebug(message, promise)
    }

    /**
     * Sends a telemetry error event.
     * @param message Error message.
     * @param stack Error stack.
     * @param kind Error kind.
     */
    @ReactMethod
    fun telemetryError(message: String, stack: String, kind: String, promise: Promise) {
        implementation.telemetryError(message, stack, kind, promise)
    }

    /**
     * Sends WebView Events.
     * @param message User action.
     */
    @ReactMethod
    fun consumeWebviewEvent(message: String, promise: Promise) {
        implementation.consumeWebviewEvent(message, promise)
    }

    /**
     * Clears all data that has not already been sent to Datadog servers.
     */
    @ReactMethod
    fun clearAllData(promise: Promise) {
        implementation.clearAllData(promise)
    }

    @ReactMethod
    fun configurationFromString(wire: String, promise: Promise) {
        implementation.configurationFromString(wire, promise)
    }

    @ReactMethod
    fun configurationToString(configuration: ReadableMap, promise: Promise) {
        implementation.configurationToString(configuration, promise)
    }

    @ReactMethod
    fun setConfiguration(configuration: ReadableMap, promise: Promise) {
        implementation.setConfiguration(configuration, promise)
    }

    @ReactMethod
    fun setEvaluationContext(context: ReadableMap, promise: Promise) {
        implementation.setEvaluationContext(context, promise)
    }

    @ReactMethod
    fun resolveBooleanEvaluation(flagKey: String, defaultValue: Boolean, promise: Promise) {
        implementation.resolveBooleanEvaluation(flagKey, defaultValue, promise)
    }

    @ReactMethod
    fun resolveStringEvaluation(flagKey: String, defaultValue: String, promise: Promise) {
        implementation.resolveStringEvaluation(flagKey, defaultValue, promise)
    }

    @ReactMethod
    fun resolveNumberEvaluation(flagKey: String, defaultValue: Double, promise: Promise) {
        implementation.resolveNumberEvaluation(flagKey, defaultValue, promise)
    }

    @ReactMethod
    fun resolveObjectEvaluation(flagKey: String, defaultValue: ReadableMap, promise: Promise) {
        implementation.resolveObjectEvaluation(flagKey, defaultValue, promise)
    }

    @ReactMethod
    fun getProviderDebugState(promise: Promise) {
        implementation.getProviderDebugState(promise)
    }

    // Required for rn built in EventEmitter Calls.
    @ReactMethod
    fun addListener(eventName: String) {
        // No-op
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // No-op
    }
}
