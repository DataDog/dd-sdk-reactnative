/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.tools.unit.forge

import com.datadog.android.privacy.TrackingConsent
import com.datadog.android.telemetry.model.TelemetryConfigurationEvent
import fr.xgouchet.elmyr.Forge
import fr.xgouchet.elmyr.ForgeryFactory
import fr.xgouchet.elmyr.jvm.ext.aTimestamp
import java.util.UUID

internal class TelemetryConfigurationEventForgeryFactory :
    ForgeryFactory<TelemetryConfigurationEvent> {

    override fun getForgery(forge: Forge): TelemetryConfigurationEvent {
        return TelemetryConfigurationEvent(
            date = forge.aTimestamp(),
            source = forge.aValueFrom(TelemetryConfigurationEvent.Source::class.java),
            service = forge.anAlphabeticalString(),
            version = forge.anAlphabeticalString(),
            application = forge.aNullable {
                TelemetryConfigurationEvent.Application(
                    forge.getForgery<UUID>().toString()
                )
            },
            session = forge.aNullable {
                TelemetryConfigurationEvent.Session(
                    forge.getForgery<UUID>().toString()
                )
            },
            view = forge.aNullable {
                TelemetryConfigurationEvent.View(
                    forge.getForgery<UUID>().toString()
                )
            },
            action = forge.aNullable {
                TelemetryConfigurationEvent.Action(
                    forge.getForgery<UUID>().toString()
                )
            },
            dd = TelemetryConfigurationEvent.Dd(),
            telemetry = TelemetryConfigurationEvent.Telemetry(
                configuration = TelemetryConfigurationEvent.Configuration(
                    sessionSampleRate = forge.aNullable { aLong() },
                    telemetrySampleRate = forge.aNullable { aLong() },
                    telemetryConfigurationSampleRate = forge.aNullable { aLong() },
                    telemetryUsageSampleRate = forge.aNullable { aLong() },
                    traceSampleRate = forge.aNullable { aLong() },
                    traceContextInjection = forge.aNullable {
                        aValueFrom(
                            TelemetryConfigurationEvent.TraceContextInjection::class.java
                        )
                    },
                    premiumSampleRate = forge.aNullable { aLong() },
                    replaySampleRate = forge.aNullable { aLong() },
                    sessionReplaySampleRate = forge.aNullable { aLong() },
                    trackingConsent = forge.aNullable {
                        aValueFrom(
                            TelemetryConfigurationEvent.TrackingConsent::class.java
                        )
                    },
                    startSessionReplayRecordingManually = forge.aNullable { aBool() },
                    useProxy = forge.aNullable { aBool() },
                    useBeforeSend = forge.aNullable { aBool() },
                    silentMultipleInit = forge.aNullable { aBool() },
                    trackSessionAcrossSubdomains = forge.aNullable { aBool() },
                    trackResources = forge.aNullable { aBool() },
                    trackLongTask = forge.aNullable { aBool() },
                    useCrossSiteSessionCookie = forge.aNullable { aBool() },
                    usePartitionedCrossSiteSessionCookie = forge.aNullable { aBool() },
                    useSecureSessionCookie = forge.aNullable { aBool() },
                    allowFallbackToLocalStorage = forge.aNullable { aBool() },
                    storeContextsAcrossPages = forge.aNullable { aBool() },
                    allowUntrustedEvents = forge.aNullable { aBool() },
                    actionNameAttribute = forge.aNullable { aString() },
                    useAllowedTracingOrigins = forge.aNullable { aBool() },
                    useAllowedTracingUrls = forge.aNullable { aBool() },
                    selectedTracingPropagators = forge.aNullable {
                        aList {
                            aValueFrom(
                                TelemetryConfigurationEvent.SelectedTracingPropagator::class.java
                            )
                        }
                    },
                    defaultPrivacyLevel = forge.aNullable { aString() },
                    enablePrivacyForActionName = forge.aNullable { aBool() },
                    useExcludedActivityUrls = forge.aNullable { aBool() },
                    useWorkerUrl = forge.aNullable { aBool() },
                    compressIntakeRequests = forge.aNullable { aBool() },
                    trackFrustrations = forge.aNullable { aBool() },

                    trackViewsManually = forge.aNullable { aBool() },
                    trackInteractions = forge.aNullable { aBool() },
                    trackUserInteractions = forge.aNullable { aBool() },
                    forwardErrorsToLogs = forge.aNullable { aBool() },
                    forwardConsoleLogs = forge.aNullable { aList { aString() } },
                    forwardReports = forge.aNullable { aList { aString() } },
                    useLocalEncryption = forge.aNullable { aBool() },
                    viewTrackingStrategy = forge.aNullable {
                        aValueFrom(TelemetryConfigurationEvent.ViewTrackingStrategy::class.java)
                    },
                    trackBackgroundEvents = forge.aNullable { aBool() },
                    mobileVitalsUpdatePeriod = forge.aNullable { aLong() },
                    trackErrors = forge.aNullable { aBool() },
                    trackNetworkRequests = forge.aNullable { aBool() },
                    useTracing = forge.aNullable { aBool() },
                    trackNativeViews = forge.aNullable { aBool() },
                    trackNativeErrors = forge.aNullable { aBool() },
                    trackNativeLongTasks = forge.aNullable { aBool() },
                    trackCrossPlatformLongTasks = forge.aNullable { aBool() },
                    useFirstPartyHosts = forge.aNullable { aBool() },
                    initializationType = forge.aNullable { aString() },
                    trackFlutterPerformance = forge.aNullable { aBool() },
                    batchSize = forge.aNullable { aLong() },
                    batchUploadFrequency = forge.aNullable { aLong() }
                )
            )
        )
    }
}
