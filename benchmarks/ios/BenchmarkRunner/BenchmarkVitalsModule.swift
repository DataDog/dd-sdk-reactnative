/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import React

@objc(BenchmarkVitals)
class BenchmarkVitalsModule: NSObject {
//  var vitals: Vitals?
  
  @objc
  func startCollectingVitals(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    resolve(true)
  }
  
  @objc func stopCollectingVitals(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    resolve(true)
  }
}
