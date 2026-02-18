/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import React

struct NativeTestConfig {
    let scenario: String
    let runType: String
    let clientToken: String
    let applicationID: String
    let apiKey: String
    let env: String

    init(from dict: NSDictionary) {
        self.scenario = dict["scenario"] as? String ?? ""
        self.runType = dict["runType"] as? String ?? ""
        self.clientToken = dict["clientToken"] as? String ?? ""
        self.applicationID = dict["applicationID"] as? String ?? ""
        self.apiKey = dict["apiKey"] as? String ?? ""
        self.env = dict["env"] as? String ?? ""
    }
}

@objc
public class BenchmarkVitalsImplementation: NSObject {
  
  var vitals: Vitals?

  @objc
  public func startCollectingVitals(config: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) -> Void {
    let nativeConfig = NativeTestConfig(from: config)
    
    let appId = Bundle.main.bundleIdentifier ?? "unknown.bundle.id"
    let appName = Bundle.main.object(forInfoDictionaryKey: "CFBundleExecutable") as! String
    let appVersion = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as! String
    let osName = UIDevice.current.systemName
    let osVersion = UIDevice.current.systemVersion
    let deviceModel = UIDevice.current.model

    let context = Benchmarks.Configuration.Context(
                                      applicationIdentifier: appId,
                                      applicationName: appName,
                                      applicationVersion: appVersion,
                                      env: nativeConfig.env,
                                      sdkVersion: "",
                                      deviceModel: deviceModel,
                                      osName: osName,
                                      osVersion: osVersion,
                                      run: nativeConfig.runType,
                                      scenario: nativeConfig.scenario,
                                      branch: "")
    let configuration = Benchmarks.Configuration(clientToken: nativeConfig.clientToken, apiKey: nativeConfig.apiKey, context: context)
    let vitals = Vitals(
      provider: Benchmarks.meterProvider(
        with: configuration
      )
    )
      
    vitals.observeCPU()
    vitals.observeMemory()
    vitals.observeFPS()
      
      
    self.vitals = vitals
    resolve(true)
  }

  @objc
  public func stopCollectingVitals(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) -> Void {
      vitals = nil
      resolve(true)
  }
}
