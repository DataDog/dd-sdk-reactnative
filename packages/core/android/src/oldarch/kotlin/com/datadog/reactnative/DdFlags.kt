/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

/** The entry point to use Datadog's Flags feature. */
class DdFlags(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val implementation = DdFlagsImplementation()

    override fun getName(): String = DdFlagsImplementation.NAME

    /**
     * Enable the Flags feature with the provided configuration.
     * @param configuration The configuration for Flags.
     */
    @ReactMethod
    fun enable(configuration: ReadableMap, promise: Promise) {
        implementation.enable(configuration, promise)
    }

    /**
     * Set the evaluation context for a specific client.
     * @param clientName The name of the client.
     * @param targetingKey The targeting key.
     * @param attributes The attributes for the evaluation context.
     */
    @ReactMethod
    fun setEvaluationContext(
        clientName: String,
        targetingKey: String,
        attributes: ReadableMap,
        promise: Promise
    ) {
        implementation.setEvaluationContext(clientName, targetingKey, attributes, promise)
    }

    /**
     * Track the evaluation of a flag.
     * @param clientName The name of the client.
     * @param key The key of the flag.
     */
    @ReactMethod
    fun trackEvaluation(
        clientName: String,
        key: String,
        rawFlag: ReadableMap,
        targetingKey: String,
        attributes: ReadableMap,
        promise: Promise
    ) {
        implementation.trackEvaluation(clientName, key, rawFlag, targetingKey, attributes, promise)
    }
}
