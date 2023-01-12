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
import java.lang.IllegalArgumentException

/**
 * Wrapper around [Datadog].
 */
interface DatadogWrapper {

    /**
     * Sets the verbosity of the Datadog library.
     *
     * Messages with a priority level equal or above the given level will be sent to Android's
     * Logcat.
     *
     * @param level one of the Android [android.util.Log] constants
     * ([android.util.Log.VERBOSE], [android.util.Log.DEBUG], [android.util.Log.INFO],
     * [android.util.Log.WARN], [android.util.Log.ERROR], [android.util.Log.ASSERT]).
     */
    fun setVerbosity(level: Int)

    /**
     * Initializes the Datadog SDK.
     * @param context your application context
     * @param credentials your organization credentials
     * @param configuration the configuration for the SDK library
     * @param trackingConsent as the initial state of the tracking consent flag.
     * @see [Credentials]
     * @see [Configuration]
     * @see [TrackingConsent]
     * @throws IllegalArgumentException if the env name is using illegal characters and your
     * application is in debug mode otherwise returns false and stops initializing the SDK
     */
    fun initialize(
        context: Context,
        credentials: Credentials,
        configuration: Configuration,
        consent: TrackingConsent
    )

    /**
     * Sets the user information.
     *
     * @param id (nullable) a unique user identifier (relevant to your business domain)
     * @param name (nullable) the user name or alias
     * @param email (nullable) the user email
     * @param extraInfo additional information. An extra information can be
     * nested up to 8 levels deep. Keys using more than 8 levels will be sanitized by SDK.
     */
    fun setUserInfo(
        id: String?,
        name: String?,
        email: String?,
        extraInfo: Map<String, Any?>
    )

    /**
     * Registers a given monitor in [GlobalRum].
     *
     * @param rumMonitor to register
     */
    fun registerRumMonitor(rumMonitor: RumMonitor)

    /**
     * Adds global attributes.
     *
     * @param attributes Attributes to add
     */
    fun addRumGlobalAttributes(attributes: Map<String, Any?>)

    /**
     * Sets tracking consent.
     */
    fun setTrackingConsent(trackingConsent: TrackingConsent)

    /**
     * Sends telemetry debug event.
     */
    fun telemetryDebug(message: String)

    /**
     * Sends telemetry error.
     */
    fun telemetryError(message: String, stack: String?, kind: String?)

    /**
     * Sends telemetry error.
     */
    fun telemetryError(message: String, throwable: Throwable?)
}
