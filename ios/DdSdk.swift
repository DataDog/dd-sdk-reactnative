/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import Datadog

@objc(DdSdk)
class RNDdSdk: NSObject {

    let nativeInstance: DdSdk = Bridge.getDdSdk()

    @objc(initialize:withResolver:withRejecter:)
    func initialize(configuration: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        nativeInstance.initialize(configuration: configuration.asDdSdkConfiguration())
        resolve(nil)
    }

}
