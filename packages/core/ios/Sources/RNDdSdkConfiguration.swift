/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Datadog
import Foundation

extension NSDictionary {

    func asDdSdkConfiguration() -> DdSdkConfiguration {
        let clientToken = object(forKey: "clientToken") as? String
        let env = object(forKey: "env") as? String
        let applicationId = object(forKey: "applicationId") as? String
        let nativeCrashReportEnabled = object(forKey: "nativeCrashReportEnabled") as? Bool
        let nativeLongTaskThresholdMs = object(forKey: "nativeLongTaskThresholdMs") as? Double
        let longTaskThresholdMs = object(forKey: "longTaskThresholdMs") as? Double
        let sampleRate = object(forKey: "sampleRate") as? Double
        let site = object(forKey: "site") as? NSString
        let trackingConsent = object(forKey: "trackingConsent") as? NSString
        let telemetrySampleRate = object(forKey: "telemetrySampleRate") as? Double
        let vitalsUpdateFrequency = object(forKey: "vitalsUpdateFrequency") as? NSString
        let additionalConfig = object(forKey: "additionalConfig") as? NSDictionary
        let configurationForTelemetry = object(forKey: "configurationForTelemetry") as? NSDictionary
        return DdSdkConfiguration(
            clientToken: (clientToken != nil) ? clientToken! : String(),
            env: (env != nil) ? env! : String(),
            applicationId: applicationId,
            nativeCrashReportEnabled: nativeCrashReportEnabled,
            nativeLongTaskThresholdMs: nativeLongTaskThresholdMs,
            longTaskThresholdMs: (longTaskThresholdMs != nil) ? longTaskThresholdMs! : Double(),
            sampleRate: sampleRate,
            site: site,
            trackingConsent: trackingConsent,
            telemetrySampleRate: telemetrySampleRate,
            vitalsUpdateFrequency: vitalsUpdateFrequency,
            additionalConfig: additionalConfig,
            configurationForTelemetry: configurationForTelemetry?.asConfigurationForTelemetry()
        )
    }
    
    func asConfigurationForTelemetry() -> ConfigurationForTelemetry {
        let initializationType = object(forKey: "initializationType") as? NSString
        let trackErrors = object(forKey: "trackErrors") as? Bool
        let trackInteractions = object(forKey: "trackInteractions") as? Bool
        let trackNetworkRequests = object(forKey: "trackNetworkRequests") as? Bool

        return ConfigurationForTelemetry(
            initializationType: initializationType,
            trackErrors: trackErrors,
            trackInteractions: trackInteractions,
            trackNetworkRequests: trackNetworkRequests
        )
    }
}

extension NSArray {
    /*
     * Adapts the data format from the React Native SDK configuration to match with the
     * iOS SDK configuration. For example:
     *
     * RN config: [{ match: "example.com", propagatorTypes: [DATADOG, B3] }]
     * iOS config: { "example.com": [DATADOG, B3] }
     */
    func asFirstPartyHosts() -> [String: Set<TracingHeaderType>] {
        return reduce(into: [:], { firstPartyHosts, h in
           let host = (h as? NSDictionary)

            if let match = (host?.value(forKey: "match") as? String),
               let propagatorTypes = (host?.value(forKey: "propagatorTypes") as? NSArray) {
                if let hostPropagatorTypes = firstPartyHosts[match] {
                    firstPartyHosts[match] = hostPropagatorTypes.union(propagatorTypes.asTracingHeaderType())
                } else {
                    firstPartyHosts[match] = propagatorTypes.asTracingHeaderType()
                }
            }
        })
    }
    
    func asTracingHeaderType() -> Set<TracingHeaderType> {
        return Set(compactMap { headerType in
            switch(headerType as? String) {
            case "datadog":
                return TracingHeaderType.datadog
            case "b3":
                return TracingHeaderType.b3
            case "b3multi":
                return TracingHeaderType.b3multi
            case "tracecontext":
                return TracingHeaderType.tracecontext
            default:
                return nil
            }
        })
    }
}
