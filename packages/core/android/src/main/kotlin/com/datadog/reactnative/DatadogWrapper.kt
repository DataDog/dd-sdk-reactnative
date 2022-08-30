/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.Context
import com.datadog.android.core.configuration.Configuration
import com.datadog.android.core.configuration.Credentials
import com.datadog.android.privacy.TrackingConsent
import com.datadog.android.rum.RumMonitor

interface DatadogWrapper {

    fun setVerbosity(level: Int)

    fun initialize(
        context: Context,
        credentials: Credentials,
        configuration: Configuration,
        consent: TrackingConsent
    )

    fun setUserInfo(
        id: String?,
        name: String?,
        email: String?,
        extraInfo: Map<String, Any?>
    )

    fun registerRumMonitor(rumMonitor: RumMonitor)

    fun addRumGlobalAttributes(attributes: Map<String, Any?>)

    fun setTrackingConsent(trackingConsent: TrackingConsent)
}
