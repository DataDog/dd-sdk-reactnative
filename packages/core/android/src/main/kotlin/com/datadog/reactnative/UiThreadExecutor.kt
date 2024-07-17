/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.facebook.react.bridge.UiThreadUtil

/**
 * Simple UI Thread Executor. By default it is based on [UiThreadUtil.runOnUiThread].
 */
interface UiThreadExecutor {
    /**
     * Runs the given runnable on the UI Thread.
     */
    fun runOnUiThread(runnable: Runnable)
}

internal class ReactUiThreadExecutor : UiThreadExecutor {
    override fun runOnUiThread(runnable: Runnable) {
        UiThreadUtil.runOnUiThread(runnable)
    }
}
