/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

/** The entry point to use Datadog's Flags feature. */
class DdFlags(reactContext: ReactApplicationContext) : NativeDdFlagsSpec(reactContext) {

    private val implementation = DdFlagsImplementation()

    override fun getName(): String = DdFlagsImplementation.NAME

    /**
     * Enable the Flags feature with the provided configuration.
     * @param configuration The configuration for Flags.
     */
    @ReactMethod
    override fun enable(configuration: ReadableMap, promise: Promise) {
        implementation.enable(configuration, promise)
    }

    /**
     * Set the evaluation context for a specific client.
     * @param clientName The name of the client.
     * @param targetingKey The targeting key.
     * @param attributes The attributes for the evaluation context.
     */
    @ReactMethod
    override fun setEvaluationContext(
            clientName: String,
            targetingKey: String,
            attributes: ReadableMap,
            promise: Promise
    ) {
        implementation.setEvaluationContext(clientName, targetingKey, attributes, promise)
    }

    /**
     * Get details for a boolean flag.
     * @param clientName The name of the client.
     * @param key The flag key.
     * @param defaultValue The default value.
     */
    @ReactMethod
    override fun getBooleanDetails(
            clientName: String,
            key: String,
            defaultValue: Boolean,
            promise: Promise
    ) {
        implementation.getBooleanDetails(clientName, key, defaultValue, promise)
    }

    /**
     * Get details for a string flag.
     * @param clientName The name of the client.
     * @param key The flag key.
     * @param defaultValue The default value.
     */
    @ReactMethod
    override fun getStringDetails(
            clientName: String,
            key: String,
            defaultValue: String,
            promise: Promise
    ) {
        implementation.getStringDetails(clientName, key, defaultValue, promise)
    }

    /**
     * Get details for a number flag. Includes Number and Integer flags.
     * @param clientName The name of the client.
     * @param key The flag key.
     * @param defaultValue The default value.
     */
    @ReactMethod
    override fun getNumberDetails(
            clientName: String,
            key: String,
            defaultValue: Double,
            promise: Promise
    ) {
        implementation.getNumberDetails(clientName, key, defaultValue, promise)
    }

    /**
     * Get details for an object flag.
     * @param clientName The name of the client.
     * @param key The flag key.
     * @param defaultValue The default value.
     */
    @ReactMethod
    override fun getObjectDetails(
            clientName: String,
            key: String,
            defaultValue: ReadableMap,
            promise: Promise
    ) {
        implementation.getObjectDetails(clientName, key, defaultValue, promise)
    }
}
