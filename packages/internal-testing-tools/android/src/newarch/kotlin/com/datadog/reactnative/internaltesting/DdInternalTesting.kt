/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.internaltesting

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod

/**
 * The entry point to use Datadog's internal testing feature.
 */
class DdInternalTesting(
    reactContext: ReactApplicationContext
) : NativeDdInternalTestingSpec(reactContext) {

    private val implementation = DdInternalTestingImplementation()

    override fun getName(): String = DdInternalTestingImplementation.NAME

    /**
     * Clears all data for all features.
     */
    @ReactMethod
    override fun clearData(promise: Promise) {
        implementation.clearData(promise)
    }

    /**
     * Retrieves the list of events for a given feature.
     */
    @ReactMethod
    override fun getAllEvents(feature: String, promise: Promise) {
        implementation.getAllEvents(feature, promise)
    }
    
    /**
     * Enable native testing module.
     */
    @ReactMethod
    override fun enable(promise: Promise) {
        implementation.enable(promise)
    }
}
