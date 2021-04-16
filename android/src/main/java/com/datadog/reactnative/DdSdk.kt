/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.bridge.DdBridge
import com.datadog.android.bridge.DdSdk as SDKDdSdk
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

/**
 * The entry point to initialize Datadog's features.
 */
class DdSdk(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val nativeInstance: SDKDdSdk = DdBridge.getDdSdk(reactContext)

    override fun getName(): String = "DdSdk"

    /**
     * Initializes Datadog's features.
     * @param configuration The configuration to use.
     */
    @ReactMethod
    fun initialize(configuration: ReadableMap, promise: Promise) {
        nativeInstance.initialize(configuration.asDdSdkConfiguration())
        promise.resolve(null)
    }

    /**
     * Sets the global context (set of attributes) attached with all future Logs, Spans and RUM events.
     * @param attributes The global context attributes.
     */
    @ReactMethod
    fun setAttributes(attributes: ReadableMap, promise: Promise) {
        nativeInstance.setAttributes(attributes.toHashMap())
        promise.resolve(null)
    }

    /**
     * Set the user information.
     * @param user The user object (use builtin attributes: 'id', 'email', 'name', and/or any custom attribute).
     */
    @ReactMethod
    fun setUser(user: ReadableMap, promise: Promise) {
        nativeInstance.setUser(user.toHashMap())
        promise.resolve(null)
    }

    /**
     * Set the tracking consent regarding the data collection.
     * @param trackingConsent Consent, which can take one of the following values: 'pending', 'granted', 'not_granted'.
     */
    @ReactMethod
    fun setTrackingConsent(trackingConsent: String, promise: Promise) {
        nativeInstance.setTrackingConsent(trackingConsent)
        promise.resolve(null)
    }

}
