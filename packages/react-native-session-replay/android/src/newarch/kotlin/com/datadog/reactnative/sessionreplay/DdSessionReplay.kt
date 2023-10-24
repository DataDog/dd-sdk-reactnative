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

    private val implementation = DdSessionReplayImplementation()

    override fun getName(): String = DdSessionReplayImplementation.NAME

    @ReactMethod
    override fun enable(promise: Promise) {
        implementation.enable(promise)
    }
}
