/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.tools.unit.forge

import com.datadog.reactnative.ConfigurationForTelemetry
import com.datadog.reactnative.DdSdkConfiguration
import fr.xgouchet.elmyr.Forge
import fr.xgouchet.elmyr.ForgeryFactory
import java.util.UUID

class DdSdkConfigurationForgeryFactory : ForgeryFactory<DdSdkConfiguration> {
    override fun getForgery(forge: Forge): DdSdkConfiguration {
        return DdSdkConfiguration(
            clientToken = forge.aStringMatching("pub[a-f0-9]{32}"),
            env = forge.anAlphabeticalString(),
            applicationId = forge.aNullable { getForgery<UUID>().toString() },
            nativeCrashReportEnabled = forge.aNullable { aBool() },
            nativeLongTaskThresholdMs = forge.aNullable { aDouble(100.0, 5000.0) },
            longTaskThresholdMs = forge.aDouble(0.0, 100.0),
            sampleRate = forge.aNullable { aDouble(0.0, 100.0) },
            telemetrySampleRate = forge.aNullable { aDouble(0.0, 100.0) },
            vitalsUpdateFrequency = forge.aNullable {
                anElementFrom(
                    "RARE",
                    "NEVER",
                    "FREQUENT",
                    "AVERAGE"
                )
            },
            site = forge.aNullable { anElementFrom("US", "EU", "GOV") },
            additionalConfig = forge.aMap {
                forge.anAsciiString() to forge.anElementFrom(
                    forge.aMap { forge.anAsciiString() to forge.aString() },
                    forge.aString(),
                    null
                )
            },
            trackingConsent = forge.aNullable {
                anElementFrom("pending", "granted", "not_granted")
            },
            uploadFrequency = forge.aNullable {
                anElementFrom(
                    "RARE",
                    "FREQUENT",
                    "AVERAGE"
                )
            },
            configurationForTelemetry = ConfigurationForTelemetry(
                initializationType = forge.anAlphabeticalString(),
                trackErrors = forge.aBool(),
                trackInteractions = forge.aBool(),
                trackNetworkRequests = forge.aBool(),
                reactVersion = forge.aString(),
                reactNativeVersion = forge.aString(),
            ),
            trackFrustrations = forge.aNullable { aBool() },
        )
    }
}
