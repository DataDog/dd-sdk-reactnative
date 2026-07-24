/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.profiling

import com.datadog.android.api.feature.FeatureSdkCore
import com.datadog.android.profiling.ExperimentalProfilingApi
import com.datadog.android.profiling.ProfilingConfiguration

/**
 * Wraps calls to the native Profiling SDK, so they can be mocked in tests.
 */
interface ProfilingWrapper {
    @OptIn(ExperimentalProfilingApi::class)
    fun enable(configuration: ProfilingConfiguration, sdkCore: FeatureSdkCore)
}
