/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation

/// Local equivalents of `RCTPromiseResolveBlock`/`RCTPromiseRejectBlock` from `React/RCTBridgeModule.h`.
///
/// Using these plain Swift closure types instead of React's typealiases keeps the generated
/// Objective-C interface header (`-Swift.h`) from referencing `RCTPromiseResolveBlock`/`RCTPromiseRejectBlock`
/// by name: Swift emits the underlying block signature directly instead, so the header no longer
/// depends on `RCTBridgeModule.h` being importable wherever it is consumed. The block signatures are
/// structurally identical to React's, so `.mm` callers can pass `RCTPromiseResolveBlock`/`RCTPromiseRejectBlock`
/// values through unchanged.
public typealias RCTPromiseResolve = (Any?) -> Void
public typealias RCTPromiseReject = (String, String, NSError?) -> Void
