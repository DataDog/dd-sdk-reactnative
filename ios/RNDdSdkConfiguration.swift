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
        return DdSdkConfiguration(
            clientToken: (clientToken != nil) ? clientToken! : NSString(),
            env: (env != nil) ? env! : NSString(),
            applicationId: applicationId
        )
    }
}
