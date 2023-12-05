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

/**
 * The entry point to use Datadog's Core Tests feature.
 */
class DdCoreTests(
    reactContext: ReactApplicationContext,
) : NativeDdCoreTestsSpec(reactContext) {

    private val implementation = DdCoreTestsImplementation()

    override fun getName(): String = DdCoreTestsImplementation.NAME

    @ReactMethod
    override fun clearData(promise: Promise) {
        implementation.clearData(promise)
    }

    @ReactMethod
    override fun getAllEventsData(feature: String, promise: Promise) {
        implementation.getAllEventsData(feature, promise)
    }
}
