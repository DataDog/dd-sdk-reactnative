/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.facebook.react.bridge.ReactApplicationContext

/**
 * Simple JS Thread Executor. By default it is based on [ReactApplicationContext.runOnJSQueueThread].
 */
interface JsThreadExecutor {
    /**
     * Runs the given runnable on the JS Thread.
     */
    fun runOnJsThread(runnable: Runnable)
}

internal class ReactJsThreadExecutor(
    private val reactContext: ReactApplicationContext
) : JsThreadExecutor {
    override fun runOnJsThread(runnable: Runnable) {
        reactContext.runOnJSQueueThread(runnable)
    }
}
