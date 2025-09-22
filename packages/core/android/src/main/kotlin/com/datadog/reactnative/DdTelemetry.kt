/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.Datadog
import com.datadog.android._InternalProxy
import com.datadog.android.api.InternalLogger
import com.datadog.android.api.feature.FeatureSdkCore
import com.facebook.react.bridge.ReadableMap

/**
 * **[INTERNAL USAGE]**
 *
 * Utility class used by React Native modules to forward telemetry events to the Datadog SDK.
 *
 * This class is **public only for Datadog internal package visibility** and should not be used.
 */
class DdTelemetry {

    // We use Kotlin backing field here to initialize once the telemetry proxy
    // and make sure it is only after SDK is initialized.
    private var telemetryProxy: _InternalProxy._TelemetryProxy? = null
        get() {
            if (field == null && Datadog.isInitialized()) {
                field = Datadog._internalProxy()._telemetry
            }

            return field
        }

    /**
     * **[INTERNAL USAGE]**
     *
     * Sends a telemetry log message with additional attributes and configuration options.
     *
     * @param message the message to log
     * @param attributes additional key–value properties to include in the log
     * @param config configuration options for the telemetry log (e.g. `onlyOnce` flag)
     */
    fun sendTelemetryLog(message: String, attributes: ReadableMap, config: ReadableMap) {
        val core = Datadog.getInstance() as FeatureSdkCore?
        val logger = core?.internalLogger;

        val additionalProperties = attributes.toMap()
        val telemetryConfig = config.toMap()

        logger?.log(
            level = InternalLogger.Level.INFO,
            target = InternalLogger.Target.TELEMETRY,
            messageBuilder = { message },
            onlyOnce = (telemetryConfig["onlyOnce"] as? Boolean) ?: true,
            additionalProperties = additionalProperties
        )
    }

    /**
     * **[INTERNAL USAGE]**
     *
     * Sends a debug-level telemetry message.
     *
     * @param message the debug message
     */
    fun telemetryDebug(message: String) {
        telemetryProxy?.debug(message)
    }

    /**
     * **[INTERNAL USAGE]**
     *
     * Sends an error-level telemetry message with optional details.
     *
     * @param message the error message
     * @param stack an optional stack trace string
     * @param kind an optional error kind or category
     */
    fun telemetryError(message: String, stack: String?, kind: String?) {
        telemetryProxy?.error(message, stack, kind)
    }

    /**
     * **[INTERNAL USAGE]**
     *
     * Sends an error-level telemetry message with an attached [Throwable].
     *
     * @param message the error message
     * @param throwable the throwable associated with the error
     */
    fun telemetryError(message: String, throwable: Throwable?) {
        telemetryProxy?.error(message, throwable)
    }
}

