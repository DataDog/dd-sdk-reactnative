/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.profiling

import com.datadog.android.api.feature.FeatureSdkCore
import com.datadog.android.profiling.ExperimentalProfilingApi
import com.datadog.android.profiling.Profiling
import com.datadog.android.profiling.ProfilingConfiguration

internal class ProfilingSDKWrapper : ProfilingWrapper {
    @OptIn(ExperimentalProfilingApi::class)
    override fun enable(configuration: ProfilingConfiguration, sdkCore: FeatureSdkCore) {
        Profiling.enable(configuration, sdkCore)
    }
}
