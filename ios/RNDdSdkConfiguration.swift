/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import DatadogSDKBridge

extension NSDictionary {

    func asDdSdkConfiguration() -> DdSdkConfiguration {
        let clientToken = object(forKey: "clientToken") as? NSString
        let env = object(forKey: "env") as? NSString
        let applicationId = object(forKey: "applicationId") as? NSString
        let nativeCrashReportEnabled = object(forKey: "nativeCrashReportEnabled") as? Bool
        let sampleRate = object(forKey: "sampleRate") as? Double
        let site = object(forKey: "site") as? NSString
        let trackingConsent = object(forKey: "trackingConsent") as? NSString
        let additionalConfig = object(forKey: "additionalConfig") as? NSDictionary
        let manualTracingEnabled = object(forKey: "manualTracingEnabled") as? Bool
        return DdSdkConfiguration(
            clientToken: (clientToken != nil) ? clientToken! : NSString(),
            env: (env != nil) ? env! : NSString(),
            applicationId: applicationId,
            nativeCrashReportEnabled: nativeCrashReportEnabled,
            sampleRate: sampleRate,
            site: site,
            trackingConsent: trackingConsent,
            additionalConfig: additionalConfig,
            manualTracingEnabled: manualTracingEnabled
        )
    }
}
