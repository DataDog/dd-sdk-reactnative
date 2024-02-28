/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import DatadogCore
import DatadogRUM
import DatadogLogs
import DatadogTrace
import DatadogCrashReporting
import DatadogWebViewTracking
import DatadogInternal
import React

func getDefaultAppVersion() -> String {
    let bundleShortVersion = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
    let bundleVersion = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String
    return bundleShortVersion ?? bundleVersion ?? "0.0.0"
}

@objc
public class DdSdkImplementation: NSObject {
    let jsDispatchQueue: DispatchQueueType
    let jsRefreshRateMonitor: RefreshRateMonitor
    let mainDispatchQueue: DispatchQueueType
    let RUMMonitorProvider: () -> RUMMonitorProtocol
    let RUMMonitorInternalProvider: () -> RUMMonitorInternalProtocol?
    var webviewMessageEmitter: InternalExtension<WebViewTracking>.AbstractMessageEmitter?

    private let jsLongTaskThresholdInSeconds: TimeInterval = 0.1;

    @objc
    public convenience init(bridge: RCTBridge) {
        self.init(
            mainDispatchQueue: DispatchQueue.main,
            jsDispatchQueue: bridge,
            jsRefreshRateMonitor: JSRefreshRateMonitor.init(),
            RUMMonitorProvider: { RUMMonitor.shared() },
            RUMMonitorInternalProvider: { RUMMonitor.shared()._internal }
        )
    }
    
    init(
        mainDispatchQueue: DispatchQueueType,
        jsDispatchQueue: DispatchQueueType,
        jsRefreshRateMonitor: RefreshRateMonitor,
        RUMMonitorProvider: @escaping () -> RUMMonitorProtocol,
        RUMMonitorInternalProvider: @escaping () -> RUMMonitorInternalProtocol?
    ) {
        self.mainDispatchQueue = mainDispatchQueue
        self.jsDispatchQueue = jsDispatchQueue
        self.jsRefreshRateMonitor = jsRefreshRateMonitor
        self.RUMMonitorProvider = RUMMonitorProvider
        self.RUMMonitorInternalProvider = RUMMonitorInternalProvider
        super.init()
    }
    
    // Using @escaping RCTPromiseResolveBlock type will result in an issue when compiling the Swift header file.
    @objc
    public func initialize(configuration: NSDictionary, resolve:@escaping ((Any?) -> Void), reject:RCTPromiseRejectBlock) -> Void {
        let sdkConfiguration = configuration.asDdSdkConfiguration()
        let nativeInitialization = DdSdkNativeInitialization(mainDispatchQueue: mainDispatchQueue)

        nativeInitialization.initialize(sdkConfiguration: sdkConfiguration)
        self.startJSRefreshRateMonitoring(sdkConfiguration: sdkConfiguration)
        overrideReactNativeTelemetry(rnConfiguration: sdkConfiguration)

        resolve(nil)
    }

    @objc
    public func setAttributes(attributes: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        let castedAttributes = castAttributesToSwift(attributes)
        for (key, value) in castedAttributes {
            RUMMonitorProvider().addAttribute(forKey: key, value: value)
            GlobalState.addAttribute(forKey: key, value: value)
        }
        
        resolve(nil)
    }

    @objc
    public func setUser(user: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        var castedUser = castAttributesToSwift(user)
        let id = castedUser.removeValue(forKey: "id") as? String
        let name = castedUser.removeValue(forKey: "name") as? String
        let email = castedUser.removeValue(forKey: "email") as? String
        let extraInfo: [String: Encodable] = castedUser // everything what's left is an `extraInfo`

        Datadog.setUserInfo(id: id, name: name, email: email, extraInfo: extraInfo)
        resolve(nil)
    }

    @objc
    public func setTrackingConsent(trackingConsent: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        Datadog.set(trackingConsent: (trackingConsent as NSString?).asTrackingConsent())
        resolve(nil)
    }
    
    @objc
    public func telemetryDebug(message: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        DatadogSDKWrapper.shared.telemetryDebug(id: "datadog_react_native:\(message)", message: message as String)
        resolve(nil)
    }
    
    @objc
    public func telemetryError(message: NSString, stack: NSString, kind: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        DatadogSDKWrapper.shared.telemetryError(id: "datadog_react_native:\(String(describing: kind)):\(message)", message: message as String, kind: kind as String, stack: stack as String)
        resolve(nil)
    }
    
    @objc
    public func consumeWebviewEvent(message: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        do{
            try DatadogSDKWrapper.shared.sendWebviewMessage(body: message)
        } catch {
            DatadogSDKWrapper.shared.telemetryError(id: "datadog_react_native:\(error.localizedDescription)", message: "The message being sent was:\(message)" as String, kind: "WebViewEventBridgeError" as String, stack: String(describing: error) as String)
        }
        resolve(nil)
    }
    
    @objc
    public func clearAllData(resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        DatadogSDKWrapper.shared.clearAllData()
        resolve(nil)
    }

    func overrideReactNativeTelemetry(rnConfiguration: DdSdkConfiguration) -> Void {
        DatadogSDKWrapper.shared.overrideTelemetryConfiguration(
            initializationType: rnConfiguration.configurationForTelemetry?.initializationType as? String,
            reactNativeVersion: rnConfiguration.configurationForTelemetry?.reactNativeVersion as? String,
            reactVersion: rnConfiguration.configurationForTelemetry?.reactVersion as? String,
            trackCrossPlatformLongTasks: rnConfiguration.longTaskThresholdMs != 0,
            trackErrors: rnConfiguration.configurationForTelemetry?.trackErrors,
            trackInteractions: rnConfiguration.configurationForTelemetry?.trackInteractions,
            trackLongTask: rnConfiguration.longTaskThresholdMs != 0,
            trackNativeErrors: rnConfiguration.nativeLongTaskThresholdMs != 0,
            trackNativeLongTasks: rnConfiguration.nativeLongTaskThresholdMs != 0,
            trackNetworkRequests: rnConfiguration.configurationForTelemetry?.trackNetworkRequests
        )
    }

    func startJSRefreshRateMonitoring(sdkConfiguration: DdSdkConfiguration) {
        if let frameTimeCallback = buildFrameTimeCallback(sdkConfiguration: sdkConfiguration) {
            // Falling back to mainDispatchQueue if bridge is nil is only useful for tests
            self.jsRefreshRateMonitor.startMonitoring(jsQueue: jsDispatchQueue, frameTimeCallback: frameTimeCallback)
        }
    }

    func buildFrameTimeCallback(sdkConfiguration: DdSdkConfiguration)-> ((Double) -> ())? {
        let jsRefreshRateMonitoringEnabled = sdkConfiguration.vitalsUpdateFrequency.asVitalsUpdateFrequency() != nil
        let jsLongTaskMonitoringEnabled = sdkConfiguration.longTaskThresholdMs != 0
        
        if (!jsRefreshRateMonitoringEnabled && !jsLongTaskMonitoringEnabled) {
            return nil
        }

        func frameTimeCallback(frameTime: Double) {
            // These checks happen before dispatching because they are quick and less overhead than the dispatch itself.
            let shouldRecordFrameTime = jsRefreshRateMonitoringEnabled && frameTime > 0
            let shouldRecordLongTask = jsLongTaskMonitoringEnabled && frameTime > sdkConfiguration.longTaskThresholdMs / 1_000
            guard shouldRecordFrameTime || shouldRecordLongTask,
                  let rumMonitorInternal = RUMMonitorInternalProvider() else { return }

            // Record current timestamp, it may change slightly before event is created on background thread.
            let now = Date()
            // Leave JS thread ASAP to give as much time to JS engine work.
            sharedQueue.async {
                if (shouldRecordFrameTime) {
                    rumMonitorInternal.updatePerformanceMetric(at: now, metric: .jsFrameTimeSeconds, value: frameTime, attributes: [:])
                }
                if (shouldRecordLongTask) {
                    rumMonitorInternal.addLongTask(at: now, duration: frameTime, attributes: ["long_task.target": "javascript"])
                }
            }
        }
        
        return frameTimeCallback
    }

}
