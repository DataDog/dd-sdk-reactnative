/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.bridge.DdBridge
import com.datadog.android.bridge.Datadog as SDKDatadog
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

/**
 * The entry point to initialize Datadog's features.
 */
class Datadog(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val nativeInstance: SDKDatadog = DdBridge.getDatadog(reactContext)

    override fun getName(): String = "Datadog"

    /**
     * Initializes Datadog's features.
     * @param configuration The configuration to use.
     */
    @ReactMethod
    fun initialize(configuration: ReadableMap, promise: Promise) {
        nativeInstance.initialize(configuration.asDatadogConfiguration())
        promise.resolve(null)
    }

}
