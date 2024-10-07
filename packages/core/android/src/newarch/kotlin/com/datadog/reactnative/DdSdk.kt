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
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

/** The entry point to initialize Datadog's features. */
class DdSdk(
    reactContext: ReactApplicationContext,
    datadogWrapper: DatadogWrapper = DatadogSDKWrapper()
) : NativeDdSdkSpec(reactContext) {

    private val implementation = DdSdkImplementation(reactContext, datadog = datadogWrapper)

    override fun getName(): String = DdSdkImplementation.NAME

    init {
        reactContext.addLifecycleEventListener(object : LifecycleEventListener {
            override fun onHostResume() {
                val currentActivity: Activity? = currentActivity
                if (currentActivity != null) {
                    val intent = currentActivity.intent
                    val extras = intent.extras
                    DdSdkSynthetics.testId = extras?.getString("_dd.synthetics.test_id")
                    DdSdkSynthetics.resultId = extras?.getString("_dd.synthetics.result_id")
                }
            }

            override fun onHostPause() {}
            override fun onHostDestroy() {}
        })
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
     * Sets the global context (set of attributes) attached with all future Logs, Spans and RUM
     * events.
     * @param attributes The global context attributes.
     */
    @ReactMethod
    override fun setAttributes(attributes: ReadableMap, promise: Promise) {
        implementation.setAttributes(attributes, promise)
    }

    /**
     * Set the user information.
     * @param user The user object (use builtin attributes: 'id', 'email', 'name', and/or any custom
     * attribute).
     */
    @ReactMethod
    override fun setUser(user: ReadableMap, promise: Promise) {
        implementation.setUser(user, promise)
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
}
