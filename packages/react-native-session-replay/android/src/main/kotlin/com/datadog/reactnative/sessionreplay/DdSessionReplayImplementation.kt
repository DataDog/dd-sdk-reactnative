/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import com.facebook.react.bridge.Promise

/**
 * The entry point to use Datadog's Session Replay feature.
 */
class DdSessionReplayImplementation() {
    fun enable(promise: Promise) {
        promise.resolve(null)
    }

    companion object {
        internal const val NAME = "DdSessionReplay"
    }
}
