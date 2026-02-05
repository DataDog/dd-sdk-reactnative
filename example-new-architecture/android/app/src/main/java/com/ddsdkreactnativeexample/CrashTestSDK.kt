/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.ddsdkreactnativeexample

import android.os.Handler
import android.os.Looper

object CrashTestSDK {
    init {
        System.loadLibrary("crashtest")
    }

    external fun crashNow()

    fun init(delayMs: Long) {
        Handler(Looper.getMainLooper()).postDelayed({
            // Kotlin Crash
            //throw RuntimeException("Kotlin crash")

            // CPP crash
            crashNow()
        }, delayMs)
    }
}
