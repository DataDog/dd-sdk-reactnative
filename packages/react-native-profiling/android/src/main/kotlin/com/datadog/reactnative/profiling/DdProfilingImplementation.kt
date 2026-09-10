/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.profiling

import android.annotation.SuppressLint
import android.os.Build
import com.datadog.android.Datadog
import com.datadog.android.api.feature.FeatureSdkCore
import com.datadog.android.profiling.ProfilingConfiguration
import com.facebook.react.bridge.Promise

/**
 * The entry point to use Datadog's native Profiling feature.
 */
class DdProfilingImplementation(
    private val sdkVersionProvider: () -> Int = { Build.VERSION.SDK_INT },
    private val profilingProvider: () -> ProfilingWrapper = {
        ProfilingSDKWrapper()
    }
) {

    /**
     * Enable native profiling.
     * @param applicationLaunchSampleRate The sample rate applied for application-launch profiling.
     * @param continuousSampleRate The sample rate applied for continuous profiling.
     * @param customEndpoint Custom server url for sending profiling data.
     */
    // Lint cannot see through `sdkVersionProvider` — which is indirected so the API-level gate
    // below can be exercised in unit tests — to prove that `ProfilingWrapper.enable` is only ever
    // reached on API 35+. The early return immediately below is that proof.
    @SuppressLint("NewApi")
    fun enable(
        applicationLaunchSampleRate: Double,
        continuousSampleRate: Double,
        customEndpoint: String,
        promise: Promise
    ) {
        if (sdkVersionProvider() < MIN_PROFILING_API_LEVEL) {
            promise.resolve(null)
            return
        }

        val configurationBuilder = ProfilingConfiguration.Builder()
            .setApplicationLaunchSampleRate(applicationLaunchSampleRate.toFloat())
            .setContinuousSampleRate(continuousSampleRate.toFloat())

        if (customEndpoint != "") {
            configurationBuilder.useCustomEndpoint(customEndpoint)
        }

        profilingProvider().enable(
            configurationBuilder.build(),
            Datadog.getInstance() as FeatureSdkCore
        )
        promise.resolve(null)
    }

    internal companion object {
        internal const val NAME = "DdProfiling"
    }
}
