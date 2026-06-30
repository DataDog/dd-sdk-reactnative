/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.app.Activity
import androidx.annotation.MainThread
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/** The entry point to initialize Datadog's features. */
class DdSdk(
    reactContext: ReactApplicationContext,
    datadogWrapper: DatadogWrapper = DatadogSDKWrapper(),
    ddTelemetry: DdTelemetry = DdTelemetry()
) : NativeDdSdkSpec(reactContext) {

    private val implementation = DdSdkImplementation(reactContext, datadog = datadogWrapper, ddTelemetry)

    override fun getName(): String = DdSdkImplementation.NAME

    init {
        registerLifecycleEvents(reactContext)
    }

    /**
     * Initializes Datadog's features.
     * @param configuration The configuration to use.
     */
    @ReactMethod
    override fun initialize(configuration: ReadableMap, promise: Promise) {
        implementation.initialize(configuration, promise)
    }

    /**
     * Sets a specific attribute in the global context attached with all future Logs, Spans and RUM
     *
     * @param key: Key that identifies the attribute.
     * @param value: Value linked to the attribute.
     */
    @ReactMethod
    override fun addAttribute(key: String, value: ReadableMap, promise: Promise) {
        implementation.addAttribute(key, value, promise)
    }

    /**
     * Removes an attribute from the context attached with all future Logs, Spans and RUM events.
     * @param key: They key associated with the attribute to be removed.
     */
    @ReactMethod
    override fun removeAttribute(key: String, promise: Promise) {
        implementation.removeAttribute(key, promise)
    }

    /**
     * Adds a set of attributes to the global context that is attached with all future Logs, Spans and RUM
     * events.
     * @param attributes The global context attributes.
     */
    @ReactMethod
    override fun addAttributes(attributes: ReadableMap, promise: Promise) {
        implementation.addAttributes(attributes, promise)
    }

    /**
     * Removes a set of attributes from the global context that is attached with all future Logs, Spans and RUM
     * events.
     * @param keys: They keys associated with the attributes to be removed.
     */
    @ReactMethod
    override fun removeAttributes(keys: ReadableArray, promise: Promise) {
        implementation.removeAttributes(keys, promise)
    }

    /**
     * Set the user information.
     * @param user The user object  (use builtin attributes: 'id', 'email', 'name', and any custom * attribute inside 'extraInfo').
     */
    @ReactMethod
    override fun setUserInfo(user: ReadableMap, promise: Promise) {
        implementation.setUserInfo(user, promise)
    }

    /**
     * Sets the user information.
     * @param extraUserInfo: The additional information. (To set the id, name or email please user setUserInfo).
     */
    @ReactMethod
    override fun addUserExtraInfo(extraInfo: ReadableMap, promise: Promise) {
        implementation.addUserExtraInfo(extraInfo, promise)
    }

    /**
     * Clears the user information.
     */
    @ReactMethod
    override fun clearUserInfo(promise: Promise) {
        implementation.clearUserInfo(promise)
    }

    /**
     * Set the account information.
     * @param account The account object (use builtin attributes: 'id', 'name', and any custom * attribute inside 'extraInfo').
     */
    @ReactMethod
    override fun setAccountInfo(account: ReadableMap, promise: Promise) {
        implementation.setAccountInfo(account, promise)
    }

    /**
     * Sets the account information.
     * @param extraAccountInfo: The additional information. (To set the id or name please use setAccountInfo).
     */
    @ReactMethod
    override fun addAccountExtraInfo(extraInfo: ReadableMap, promise: Promise) {
        implementation.addAccountExtraInfo(extraInfo, promise)
    }

    /**
     * Clears the account information.
     */
    @ReactMethod
    override fun clearAccountInfo(promise: Promise) {
        implementation.clearAccountInfo(promise)
    }

    /**
     * Set the tracking consent regarding the data collection.
     * @param trackingConsent Consent, which can take one of the following values: 'pending',
     * 'granted', 'not_granted'.
     */
    @ReactMethod
    override fun setTrackingConsent(trackingConsent: String, promise: Promise) {
        implementation.setTrackingConsent(trackingConsent, promise)
    }

    /**
     * Sends a telemetry event with attributes.
     * @param message message.
     * @param attributes telemetry attributes.
     * @param config telemetry configuration.
     */
    @ReactMethod
    override fun sendTelemetryLog(message: String, attributes: ReadableMap, config: ReadableMap, promise: Promise) {
        implementation.sendTelemetryLog(message, attributes, config, promise)
    }

    /**
     * Sends a telemetry debug event.
     * @param message Debug message.
     */
    @ReactMethod
    override fun telemetryDebug(message: String, promise: Promise) {
        implementation.telemetryDebug(message, promise)
    }

    /**
     * Sends a telemetry error event.
     * @param message Error message.
     * @param stack Error stack.
     * @param kind Error kind.
     */
    @ReactMethod
    override fun telemetryError(message: String, stack: String, kind: String, promise: Promise) {
        implementation.telemetryError(message, stack, kind, promise)
    }

    /**
     * Sends WebView Events.
     * @param message User action.
     */
    @ReactMethod
    override fun consumeWebviewEvent(message: String, promise: Promise) {
        implementation.consumeWebviewEvent(message, promise)
    }

    /**
     * Clears all data that has not already been sent to Datadog servers.
     */
    @ReactMethod
    override fun clearAllData(promise: Promise) {
        implementation.clearAllData(promise)
    }

    @ReactMethod
    override fun configurationFromString(wire: String, promise: Promise) {
        implementation.configurationFromString(wire, promise)
    }

    @ReactMethod
    override fun configurationToString(configuration: ReadableMap, promise: Promise) {
        implementation.configurationToString(configuration, promise)
    }

    @ReactMethod
    override fun fetchRulesConfiguration(options: ReadableMap, promise: Promise) {
        implementation.fetchRulesConfiguration(options, promise)
    }

    @ReactMethod
    override fun fetchPrecomputedConfiguration(options: ReadableMap, promise: Promise) {
        implementation.fetchPrecomputedConfiguration(options, promise)
    }

    @ReactMethod
    override fun setConfiguration(configuration: ReadableMap, promise: Promise) {
        implementation.setConfiguration(configuration, promise)
    }

    @ReactMethod
    override fun setEvaluationContext(context: ReadableMap, promise: Promise) {
        implementation.setEvaluationContext(context, promise)
    }

    @ReactMethod
    override fun resolveBooleanEvaluation(flagKey: String, defaultValue: Boolean, promise: Promise) {
        implementation.resolveBooleanEvaluation(flagKey, defaultValue, promise)
    }

    @ReactMethod
    override fun resolveStringEvaluation(flagKey: String, defaultValue: String, promise: Promise) {
        implementation.resolveStringEvaluation(flagKey, defaultValue, promise)
    }

    @ReactMethod
    override fun resolveNumberEvaluation(flagKey: String, defaultValue: Double, promise: Promise) {
        implementation.resolveNumberEvaluation(flagKey, defaultValue, promise)
    }

    @ReactMethod
    override fun resolveObjectEvaluation(flagKey: String, defaultValue: ReadableMap, promise: Promise) {
        implementation.resolveObjectEvaluation(flagKey, defaultValue, promise)
    }

    @ReactMethod
    override fun getProviderDebugState(promise: Promise) {
        implementation.getProviderDebugState(promise)
    }

    override fun addListener(eventType: String?) {
        // No-op
    }

    override fun removeListeners(count: Double) {
        // No-op
    }

    private fun registerLifecycleEvents(reactContext: ReactApplicationContext) {
        reactContext.addLifecycleEventListener(object : LifecycleEventListener {
            override fun onHostResume() {
                val currentActivity: Activity? = currentActivity
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
        })
    }
}
