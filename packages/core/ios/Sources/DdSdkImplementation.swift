/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import DatadogCore
import DatadogCrashReporting
import DatadogInternal
import DatadogLogs
import DatadogRUM
import DatadogTrace
import DatadogWebViewTracking
import Foundation
import React

#if os(iOS)
import DatadogWebViewTracking
#endif

func getDefaultAppVersion() -> String {
    let bundleShortVersion =
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
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

#if os(iOS)
    var webviewMessageEmitter: InternalExtension<WebViewTracking>.AbstractMessageEmitter?
#endif

    private let jsLongTaskThresholdInSeconds: TimeInterval = 0.1

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
    public func initialize(
        configuration: NSDictionary, resolve: @escaping ((Any?) -> Void),
        reject: RCTPromiseRejectBlock
    ) {
        let sdkConfiguration = configuration.asDdSdkConfiguration()
        let nativeInitialization = DdSdkNativeInitialization()

        nativeInitialization.initialize(sdkConfiguration: sdkConfiguration)
        self.startJSRefreshRateMonitoring(sdkConfiguration: sdkConfiguration)
        self.overrideReactNativeTelemetry(rnConfiguration: sdkConfiguration)

        resolve(nil)
    }
    
    @objc
    public func addAttribute(key: AttributeKey, value: NSDictionary,  resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        if let attributeValue = value.object(forKey: "value") {
            let castedValue = castValueToSwift(attributeValue)
            RUMMonitorProvider().addAttribute(forKey: key, value: castedValue)
            GlobalState.addAttribute(forKey: key, value: castedValue)
        }
        
        resolve(nil)
    }
    
    @objc
    public func removeAttribute(key: AttributeKey, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        RUMMonitorProvider().removeAttribute(forKey: key)
        GlobalState.removeAttribute(key: key)
        
        resolve(nil)
    }

    @objc
    public func addAttributes(attributes: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        let castedAttributes = castAttributesToSwift(attributes)
        for (key, value) in castedAttributes {
            RUMMonitorProvider().addAttribute(forKey: key, value: value)
            GlobalState.addAttribute(forKey: key, value: value)
        }

        resolve(nil)
    }
    
    @objc
    public func removeAttributes(keys: [AttributeKey], resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        RUMMonitorProvider().removeAttributes(forKeys: keys)
        for (key) in keys {
            GlobalState.removeAttribute(key: key)
        }
        
        resolve(nil)
    }

    @objc
    public func setUserInfo(
        userInfo: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock
    ) {
        let castedUserInfo = castAttributesToSwift(userInfo)
        let id = castedUserInfo["id"] as? String
        let name = castedUserInfo["name"] as? String
        let email = castedUserInfo["email"] as? String
        var extraInfo: [AttributeKey: AttributeValue] = [:]

        if let extraInfoEncodable = castedUserInfo["extraInfo"] as? AnyEncodable,
            let extraInfoDict = extraInfoEncodable.value as? [String: Any]
        {
            extraInfo = castAttributesToSwift(extraInfoDict)
        }

        if let validId = id {
            Datadog.setUserInfo(id: validId, name: name, email: email, extraInfo: extraInfo)
        }

        resolve(nil)
    }
    
    @objc
    public func addUserExtraInfo(
        extraInfo: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock
    ) {
        let castedExtraInfo = castAttributesToSwift(extraInfo)

        Datadog.addUserExtraInfo(castedExtraInfo)
        resolve(nil)
    }

    @objc
    public func clearUserInfo(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        Datadog.clearUserInfo()
        resolve(nil)
    }

    @objc
    public func setAccountInfo(
        accountInfo: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock
    ) {
        let castedAccountInfo = castAttributesToSwift(accountInfo)
        let id = castedAccountInfo["id"] as? String
        let name = castedAccountInfo["name"] as? String
        var extraInfo: [AttributeKey: AttributeValue] = [:]

        if let extraInfoEncodable = castedAccountInfo["extraInfo"] as? AnyEncodable,
            let extraInfoDict = extraInfoEncodable.value as? [String: Any]
        {
            extraInfo = castAttributesToSwift(extraInfoDict)
        }

        if let validId = id {
            Datadog.setAccountInfo(id: validId, name: name, extraInfo: extraInfo)
        }

        resolve(nil)
    }

    @objc
    public func addAccountExtraInfo(
        extraInfo: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock
    ) {
        let castedExtraInfo = castAttributesToSwift(extraInfo)

        Datadog.addAccountExtraInfo(castedExtraInfo)
        resolve(nil)
    }

    @objc
    public func clearAccountInfo(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        Datadog.clearAccountInfo()
        resolve(nil)
    }

    @objc
    public func setTrackingConsent(
        trackingConsent: NSString, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock
    ) {
        Datadog.set(trackingConsent: (trackingConsent as NSString?).asTrackingConsent())
        resolve(nil)
    }

    @objc
    public func sendTelemetryLog(
        message: NSString, attributes: NSDictionary, config: NSDictionary,
        resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock
    ) {
        let castedAttributes = castAttributesToSwift(attributes)
        let castedConfig = castAttributesToSwift(config)
        DdTelemetry.sendTelemetryLog(
            message: message as String, attributes: castedAttributes, config: castedConfig)
        resolve(nil)
    }

    @objc

    public func telemetryDebug(message: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        DdTelemetry.telemetryDebug(id: "datadog_react_native:\(message)", message: message as String)
        resolve(nil)
    }
    
    @objc
    public func telemetryError(message: NSString, stack: NSString, kind: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        DdTelemetry.telemetryError(id: "datadog_react_native:\(String(describing: kind)):\(message)", message: message as String, kind: kind as String, stack: stack as String)
        resolve(nil)
    }

#if os(iOS)
    @objc
    public func consumeWebviewEvent(
        message: NSString, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock
    ) {
        do {
            try DatadogSDKWrapper.shared.sendWebviewMessage(body: message)
        } catch {
            DdTelemetry.telemetryError(
                id: "datadog_react_native:\(error.localizedDescription)",
                message: "The message being sent was:\(message)" as String,
                kind: "WebViewEventBridgeError" as String,
                stack: String(describing: error) as String)
        }

        resolve(nil)
    }

#endif
    
    @objc
    public func clearAllData(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        Datadog.clearAllData()
        resolve(nil)
    }

    func overrideReactNativeTelemetry(rnConfiguration: DdSdkConfiguration) {
        DdTelemetry.overrideTelemetryConfiguration(
            initializationType: rnConfiguration.configurationForTelemetry?.initializationType
                as? String,
            reactNativeVersion: rnConfiguration.configurationForTelemetry?.reactNativeVersion
                as? String,
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
            self.jsRefreshRateMonitor.startMonitoring(
                jsQueue: jsDispatchQueue, frameTimeCallback: frameTimeCallback)
        }
    }

    func buildFrameTimeCallback(sdkConfiguration: DdSdkConfiguration) -> ((Double) -> Void)? {
        let jsRefreshRateMonitoringEnabled = sdkConfiguration.vitalsUpdateFrequency != nil
        let jsLongTaskMonitoringEnabled = sdkConfiguration.longTaskThresholdMs != 0

        if !jsRefreshRateMonitoringEnabled && !jsLongTaskMonitoringEnabled {
            return nil
        }

        func frameTimeCallback(frameTime: Double) {
            // These checks happen before dispatching because they are quick and less overhead than the dispatch itself.
            let shouldRecordFrameTime = jsRefreshRateMonitoringEnabled && frameTime > 0
            let shouldRecordLongTask =
                jsLongTaskMonitoringEnabled
                && frameTime > sdkConfiguration.longTaskThresholdMs / 1_000
            guard shouldRecordFrameTime || shouldRecordLongTask,
                let rumMonitorInternal = RUMMonitorInternalProvider()
            else { return }

            // Record current timestamp, it may change slightly before event is created on background thread.
            let now = Date()
            // Leave JS thread ASAP to give as much time to JS engine work.
            sharedQueue.async {
                if (shouldRecordFrameTime) {
                    let normalizedFrameTimeSeconds = DdSdkImplementation.normalizeFrameTimeForDeviceRefreshRate(frameTime)
                    rumMonitorInternal.updatePerformanceMetric(at: now, metric: .jsFrameTimeSeconds, value: normalizedFrameTimeSeconds, attributes: [:])
                }
                if shouldRecordLongTask {
                    rumMonitorInternal.addLongTask(
                        at: now, duration: frameTime, attributes: ["long_task.target": "javascript"]
                    )
                }
            }
        }

        return frameTimeCallback
    }
    
    // Normalizes frameTime values so when they are turned into FPS metrics they are normalized on a range between 0 and fpsBudget. If fpsBudget is not provided it will default to 60hz.
    public static func normalizeFrameTimeForDeviceRefreshRate(_ frameTime: Double, fpsBudget: Double? = nil, deviceDisplayFps: Double? = nil) -> Double {
        let DEFAULT_REFRESH_HZ = 60.0
        let frameTimeMs: Double = frameTime * 1000.0
        let frameBudgetHz: Double = fpsBudget ?? DEFAULT_REFRESH_HZ
        let maxDeviceDisplayHz = deviceDisplayFps ?? Double(UIScreen.main.maximumFramesPerSecond)
        let maxDeviceFrameTimeMs = 1000.0 / maxDeviceDisplayHz
        let budgetFrameTimeMs = 1000.0 / frameBudgetHz
                
        guard maxDeviceDisplayHz > 0, frameTimeMs.isFinite, frameTimeMs > 0, frameBudgetHz > 0, budgetFrameTimeMs.isFinite, budgetFrameTimeMs > 0, maxDeviceFrameTimeMs.isFinite, maxDeviceFrameTimeMs > 0 else {
            return 1.0 / DEFAULT_REFRESH_HZ
        }
                
        var normalizedFrameTimeMs = frameTimeMs / (maxDeviceFrameTimeMs / budgetFrameTimeMs)
        normalizedFrameTimeMs = max(normalizedFrameTimeMs, maxDeviceFrameTimeMs)

        return normalizedFrameTimeMs / 1000.0 // in seconds
    }
}
