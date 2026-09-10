/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.profiling

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

/**
 * The entry point to use Datadog's Profiling feature.
 */
class DdProfiling(
    reactContext: ReactApplicationContext
) : NativeDdProfilingSpec(reactContext) {

    private val implementation = DdProfilingImplementation()

    override fun getName(): String = DdProfilingImplementation.NAME

    /**
     * Enable native profiling.
     * @param applicationLaunchSampleRate The sample rate applied for application-launch profiling.
     * @param continuousSampleRate The sample rate applied for continuous profiling.
     * @param customEndpoint Custom server url for sending profiling data.
     */
    override fun enable(
        applicationLaunchSampleRate: Double,
        continuousSampleRate: Double,
        customEndpoint: String,
        promise: Promise
    ) {
        implementation.enable(
            applicationLaunchSampleRate,
            continuousSampleRate,
            customEndpoint,
            promise
        )
    }
}
