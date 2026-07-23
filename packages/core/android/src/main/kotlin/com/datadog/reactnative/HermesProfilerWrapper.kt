/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.facebook.hermes.instrumentation.HermesSamplingProfiler

/**
 * Wrapper around Hermes's built-in JS sampling profiler.
 */
interface HermesProfilerWrapper {
    /**
     * Enables the Hermes JS sampling profiler.
     */
    fun enable()

    /**
     * Disables the Hermes JS sampling profiler.
     */
    fun disable()

    /**
     * Dumps the sampled trace collected so far to the given file path.
     * @param path The absolute path of the file to dump the trace to.
     */
    fun dumpSampledTraceToFile(path: String)
}

/**
 * Default [HermesProfilerWrapper] implementation, delegating to [HermesSamplingProfiler].
 */
class HermesSamplingProfilerWrapper : HermesProfilerWrapper {
    override fun enable() {
        HermesSamplingProfiler.enable()
    }

    override fun disable() {
        HermesSamplingProfiler.disable()
    }

    override fun dumpSampledTraceToFile(path: String) {
        HermesSamplingProfiler.dumpSampledTraceToFile(path)
    }
}
