/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.Datadog
import com.datadog.android.core.DatadogCoreProxy
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap

/**
 * The entry point to use Datadog's Core Tests feature.
 */
class DdCoreTestsImplementation() {
    fun clearData(promise: Promise) {
        val core = Datadog.getInstance() as DatadogCoreProxy
        core.clearData("logs")
        core.clearData("rum")
        core.clearData("tracing")
        core.clearData("session-replay")

        promise.resolve(null)
    }

    fun getAllEventsData(feature: String, promise: Promise) {
        val core = Datadog.getInstance() as DatadogCoreProxy
        val events = core.eventsWritten(feature)
        promise.resolve(events)
    }

    companion object {
        internal const val NAME = "DdCoreTests"
    }
}
