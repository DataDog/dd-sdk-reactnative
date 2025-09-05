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

    fun telemetryDebug(message: String) {
        telemetryProxy?.debug(message)
    }

    fun telemetryError(message: String, stack: String?, kind: String?) {
        telemetryProxy?.error(message, stack, kind)
    }

    fun telemetryError(message: String, throwable: Throwable?) {
        telemetryProxy?.error(message, throwable)
    }
}

