/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation

extension NSDictionary {

    func asDdSdkConfiguration() -> DdSdkConfiguration {
        let clientToken = object(forKey: "clientToken") as? String
        let env = object(forKey: "env") as? String
        let applicationId = object(forKey: "applicationId") as? String
        let nativeCrashReportEnabled = object(forKey: "nativeCrashReportEnabled") as? Bool
        let sampleRate = object(forKey: "sampleRate") as? Double
        let site = object(forKey: "site") as? NSString
        let trackingConsent = object(forKey: "trackingConsent") as? NSString
        let telemetrySampleRate = object(forKey: "telemetrySampleRate") as? Double
        let vitalsUpdateFrequency = object(forKey: "vitalsUpdateFrequency") as? NSString
        let additionalConfig = object(forKey: "additionalConfig") as? NSDictionary
        return DdSdkConfiguration(
            clientToken: (clientToken != nil) ? clientToken! : String(),
            env: (env != nil) ? env! : String(),
            applicationId: applicationId,
            nativeCrashReportEnabled: nativeCrashReportEnabled,
            sampleRate: sampleRate,
            site: site,
            trackingConsent: trackingConsent,
            telemetrySampleRate: telemetrySampleRate,
            vitalsUpdateFrequency: vitalsUpdateFrequency,
            additionalConfig: additionalConfig
        )
    }
}
