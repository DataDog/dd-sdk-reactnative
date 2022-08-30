package com.datadog.tools.unit.forge

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
            sampleRate = forge.aNullable { aDouble(0.0, 100.0) },
            site = forge.aNullable { anElementFrom("US", "EU", "GOV") },
            additionalConfig = forge.aMap {
                forge.anAsciiString() to forge.anElementFrom(
                    forge.aMap { forge.anAsciiString() to forge.aString() },
                    forge.aString(),
                    null
                )
            },
            trackingConsent = forge.aNullable { anElementFrom("pending", "granted", "not_granted") }
        )
    }
}
