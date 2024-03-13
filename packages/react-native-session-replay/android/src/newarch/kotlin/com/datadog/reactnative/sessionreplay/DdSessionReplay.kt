/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod

/**
 * The entry point to use Datadog's Session Replay feature.
 */
class DdSessionReplay(
    reactContext: ReactApplicationContext
) : NativeDdSessionReplaySpec(reactContext) {

    private val implementation = DdSessionReplayImplementation(reactContext)

    override fun getName(): String = DdSessionReplayImplementation.NAME
    
    /**
     * Enable session replay and start recording session.
     * @param replaySampleRate The sample rate applied for session replay.
     * @param defaultPrivacyLevel The privacy level used for replay.
     * @param customEndpoint Custom server url for sending replay data.
     */
    @ReactMethod
    override fun enable(
        replaySampleRate: Double,
        defaultPrivacyLevel: String,
        customEndpoint: String,
        promise: Promise
    ) {
        implementation.enable(replaySampleRate, defaultPrivacyLevel, customEndpoint, promise)
    }
}
