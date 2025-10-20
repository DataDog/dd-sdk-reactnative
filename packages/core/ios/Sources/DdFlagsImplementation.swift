/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation

@objc
public class DdFlagsImplementation: NSObject {
    @objc
    public func getConstant(_ resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) -> Void {
        // FIXME: This is a temporary method to test whether the native library setup is working.
        resolve(43)
    }
}
