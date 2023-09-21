/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.Context
import com.datadog.android.api.SdkCore
import com.datadog.android.rum.tracking.ViewTrackingStrategy

/**
 * No-op implementation of the [ViewTrackingStrategy].
 */
object NoOpViewTrackingStrategy : ViewTrackingStrategy {
    override fun register(sdkCore: SdkCore, context: Context) {
        // No-op
    }

    override fun unregister(context: Context?) {
        // No-op
    }
}
