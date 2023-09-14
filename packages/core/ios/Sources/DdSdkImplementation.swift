/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import Datadog
import DatadogCrashReporting
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
    
    private let jsLongTaskThresholdInSeconds: TimeInterval = 0.1;

    @objc
    public convenience init(bridge: RCTBridge) {
        self.init(mainDispatchQueue: DispatchQueue.main, jsDispatchQueue: bridge, jsRefreshRateMonitor: JSRefreshRateMonitor.init())
    }
    
    init(mainDispatchQueue: DispatchQueueType, jsDispatchQueue: DispatchQueueType, jsRefreshRateMonitor: RefreshRateMonitor) {
        self.mainDispatchQueue = mainDispatchQueue
        self.jsDispatchQueue = jsDispatchQueue
        self.jsRefreshRateMonitor = jsRefreshRateMonitor
        super.init()
    }
    
    // Using @escaping RCTPromiseResolveBlock type will result in an issue when compiling the Swift header file.
    @objc
    public func initialize(configuration: NSDictionary, resolve:@escaping ((Any?) -> Void), reject:RCTPromiseRejectBlock) -> Void {
        // Datadog SDK init needs to happen on the main thread: https://github.com/DataDog/dd-sdk-reactnative/issues/198
        self.mainDispatchQueue.async {
            let sdkConfiguration = configuration.asDdSdkConfiguration()
            
            if Datadog.isInitialized {
                // Initializing the SDK twice results in Global.rum and
                // Global.sharedTracer to be set to no-op instances
                consolePrint("Datadog SDK is already initialized, skipping initialization.")
                Datadog._internal.telemetry.debug(id: "datadog_react_native: RN  SDK was already initialized in native", message: "RN SDK was already initialized in native")
                
                // This block is called when SDK is reinitialized and the javascript has been wiped out.
                // In this case, we need to restart the refresh rate monitor, as the javascript thread 
                // appears to change at that moment.
                self.startJSRefreshRateMonitoring(sdkConfiguration: sdkConfiguration)
                resolve(nil)
                return
            }
            self.setVerbosityLevel(additionalConfig: sdkConfiguration.additionalConfig)

            let ddConfig = self.buildConfiguration(configuration: sdkConfiguration)
            let consent = self.buildTrackingConsent(consent: sdkConfiguration.trackingConsent)
            Datadog.initialize(appContext: Datadog.AppContext(), trackingConsent: consent, configuration: ddConfig)
            self.sendConfigurationAsTelemetry(rnConfiguration: sdkConfiguration)

            Global.rum = RUMMonitor.initialize()

            self.startJSRefreshRateMonitoring(sdkConfiguration: sdkConfiguration)
            
            resolve(nil)
        }
    }

    @objc
    public func setAttributes(attributes: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        let castedAttributes = castAttributesToSwift(attributes)
        for (key, value) in castedAttributes {
            Global.rum.addAttribute(forKey: key, value: value)
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
        Datadog.set(trackingConsent: buildTrackingConsent(consent: trackingConsent))
        resolve(nil)
    }
    
    @objc
    public func telemetryDebug(message: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        Datadog._internal.telemetry.debug(id: "datadog_react_native:\(message)", message: message as String)
        resolve(nil)
    }
    
    @objc
    public func telemetryError(message: NSString, stack: NSString, kind: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        Datadog._internal.telemetry.error(id: "datadog_react_native:\(String(describing: kind)):\(message)", message: message as String, kind: kind as? String, stack: stack as? String)
        resolve(nil)
    }
    
    @objc
    public func consumeWebviewEvent(message: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        do{
            try Datadog._internal.webEventBridge.send(message)
        } catch {
            Datadog._internal.telemetry.error(id: "datadog_react_native:\(error.localizedDescription)", message: "The message being sent was:\(message)" as String, kind: "WebViewEventBridgeError" as String, stack: String(describing: error) as String)
        }
        resolve(nil)
    }
    
    func sendConfigurationAsTelemetry(rnConfiguration: DdSdkConfiguration) -> Void {
        Datadog._internal.telemetry.setConfigurationMapper { event in
            var event = event

            var configuration = event.telemetry.configuration
            configuration.initializationType = rnConfiguration.configurationForTelemetry?.initializationType as? String
            configuration.trackErrors = rnConfiguration.configurationForTelemetry?.trackErrors
            configuration.trackInteractions = rnConfiguration.configurationForTelemetry?.trackInteractions
            configuration.trackResources = rnConfiguration.configurationForTelemetry?.trackNetworkRequests
            configuration.trackNetworkRequests = rnConfiguration.configurationForTelemetry?.trackNetworkRequests
            configuration.reactVersion = rnConfiguration.configurationForTelemetry?.reactVersion as? String
            configuration.reactNativeVersion = rnConfiguration.configurationForTelemetry?.reactNativeVersion as? String

            // trackCrossPlatformLongTasks will be deprecated for trackLongTask
            configuration.trackCrossPlatformLongTasks = rnConfiguration.longTaskThresholdMs != 0
            configuration.trackLongTask = rnConfiguration.longTaskThresholdMs != 0
            configuration.trackNativeErrors = rnConfiguration.nativeCrashReportEnabled
            configuration.trackNativeLongTasks = rnConfiguration.nativeLongTaskThresholdMs != 0
            event.telemetry.configuration = configuration

            return event
        }
    }

    func buildConfiguration(configuration: DdSdkConfiguration, defaultAppVersion: String = getDefaultAppVersion()) -> Datadog.Configuration {
        let ddConfigBuilder: Datadog.Configuration.Builder
        if let rumAppID = configuration.applicationId {
            ddConfigBuilder = Datadog.Configuration.builderUsing(
                rumApplicationID: rumAppID,
                clientToken: configuration.clientToken,
                environment: configuration.env
            )
            .set(rumSessionsSamplingRate: Float(configuration.sampleRate ?? 100.0))
        } else {
            ddConfigBuilder = Datadog.Configuration.builderUsing(
                clientToken: configuration.clientToken,
                environment: configuration.env
            )
        }

        switch configuration.site?.lowercased ?? "us" {
        case "us1", "us":
            _ = ddConfigBuilder.set(endpoint: .us1)
        case "eu1", "eu":
            _ = ddConfigBuilder.set(endpoint: .eu1)
        case "us3":
            _ = ddConfigBuilder.set(endpoint: .us3)
        case "us5":
            _ = ddConfigBuilder.set(endpoint: .us5)
        case "us1_fed", "gov":
            _ = ddConfigBuilder.set(endpoint: .us1_fed)
        case "ap1":
            _ = ddConfigBuilder.set(endpoint: .ap1)
        default:
            _ = ddConfigBuilder.set(endpoint: .us1)
        }
        
        _ = ddConfigBuilder.set(mobileVitalsFrequency: buildVitalsUpdateFrequency(frequency: configuration.vitalsUpdateFrequency))

        _ = ddConfigBuilder.set(uploadFrequency: buildUploadFrequency(frequency: configuration.uploadFrequency))

        _ = ddConfigBuilder.set(batchSize: buildBatchSize(batchSize: configuration.batchSize))

        if var telemetrySampleRate = (configuration.telemetrySampleRate as? NSNumber)?.floatValue {
            _ = ddConfigBuilder.set(sampleTelemetry: telemetrySampleRate)
        }
        
        if var trackFrustrations = (configuration.trackFrustrations) {
            _ = ddConfigBuilder.trackFrustrations(trackFrustrations)
        }

        if var trackBackgroundEvents = (configuration.trackBackgroundEvents) {
            _ = ddConfigBuilder.trackBackgroundEvents(trackBackgroundEvents)
        }

        if let threshold = configuration.nativeLongTaskThresholdMs as? TimeInterval {
            if (threshold != 0) {
                // `nativeLongTaskThresholdMs` attribute is in milliseconds
                _ = ddConfigBuilder.trackRUMLongTasks(threshold: threshold / 1_000)
            }
        }

        let additionalConfig = configuration.additionalConfig

        if var additionalConfiguration = additionalConfig as? [String: Any] {
            if let versionSuffix = additionalConfig?[InternalConfigurationAttributes.versionSuffix] as? String {
                let datadogVersion = defaultAppVersion + versionSuffix
                additionalConfiguration[CrossPlatformAttributes.version] = datadogVersion
            }
            
            _ = ddConfigBuilder.set(additionalConfiguration: additionalConfiguration)
        }

        if let enableViewTracking = additionalConfig?[InternalConfigurationAttributes.nativeViewTracking] as? Bool, enableViewTracking {
            _ = ddConfigBuilder.trackUIKitRUMViews()
        }

        if let enableInteractionTracking = additionalConfig?[InternalConfigurationAttributes.nativeInteractionTracking] as? Bool, enableInteractionTracking {
            _ = ddConfigBuilder.trackUIKitRUMActions()
        }

        if let serviceName = additionalConfig?[InternalConfigurationAttributes.serviceName] as? String {
            _ = ddConfigBuilder.set(serviceName: serviceName)
        }

        if let firstPartyHosts = additionalConfig?[InternalConfigurationAttributes.firstPartyHosts] as? NSArray {
            // We will always fall under this condition as firstPartyHosts is an empty array by default
            _ = ddConfigBuilder.trackURLSession(firstPartyHostsWithHeaderTypes: firstPartyHosts.asFirstPartyHosts())
        }

        if let proxyConfiguration = buildProxyConfiguration(config: additionalConfig) {
            _ = ddConfigBuilder.set(proxyConfiguration: proxyConfiguration)
        }

        if configuration.nativeCrashReportEnabled ?? false {
            _ = ddConfigBuilder.enableCrashReporting(using: DDCrashReportingPlugin())
        }

        _ = ddConfigBuilder.setRUMResourceEventMapper({ resourceEvent in
            if resourceEvent.context?.contextInfo[InternalConfigurationAttributes.dropResource] != nil {
                return nil
            }
            return resourceEvent
        })

        _ = ddConfigBuilder.setRUMActionEventMapper({ actionEvent in
            if actionEvent.context?.contextInfo[InternalConfigurationAttributes.dropResource] != nil {
                return nil
            }
            return actionEvent
        })

        return ddConfigBuilder.build()
    }

    func buildProxyConfiguration(config: NSDictionary?) -> [AnyHashable: Any]? {
        guard let address = config?[ProxyAttributes.address] as? String else {
            return nil
        }

        var proxy: [AnyHashable: Any] = [:]
        proxy[kCFProxyUsernameKey] = config?[ProxyAttributes.username]
        proxy[kCFProxyPasswordKey] = config?[ProxyAttributes.password]

        let type = config?[ProxyAttributes.type] as? String
        var port = config?[ProxyAttributes.port] as? Int
        if let string = config?[ProxyAttributes.port] as? String {
            port = Int(string)
        }

        switch type {
        case "http", "https":
            // CFNetwork support HTTP and tunneling HTTPS proxies.
            // As intakes will most likely be https, we enable both channels.
            //
            // We use constants string keys because there is an issue with
            // cross-platform availability for proxy configuration symbols.
            // see. https://developer.apple.com/forums/thread/19356?answerId=131709022#131709022
            proxy["HTTPEnable"] = 1
            proxy["HTTPProxy"] = address
            proxy["HTTPPort"] = port
            proxy["HTTPSEnable"] = 1
            proxy["HTTPSProxy"] = address
            proxy["HTTPSPort"] = port
        case "socks":
            proxy["SOCKSEnable"] = 1
            proxy["SOCKSProxy"] = address
            proxy["SOCKSPort"] = port
        default:
            break
        }

        return proxy
    }

    func buildTrackingConsent(consent: NSString?) -> TrackingConsent {
        let trackingConsent: TrackingConsent
        switch consent?.lowercased {
        case "pending":
            trackingConsent = .pending
        case "granted":
            trackingConsent = .granted
        case "not_granted":
            trackingConsent = .notGranted
        default:
            trackingConsent = .pending
        }
        return trackingConsent
    }

    func buildVitalsUpdateFrequency(frequency: NSString?) -> Datadog.Configuration.VitalsFrequency {
        let vitalsFrequency: Datadog.Configuration.VitalsFrequency
        switch frequency?.lowercased {
        case "never":
            vitalsFrequency = .never
        case "rare":
            vitalsFrequency = .rare
        case "average":
            vitalsFrequency = .average
        case "frequent":
            vitalsFrequency = .frequent
        default:
            vitalsFrequency = .average
        }
        return vitalsFrequency
    }

    func buildUploadFrequency(frequency: NSString?) -> Datadog.Configuration.UploadFrequency {
        let uploadFrequency: Datadog.Configuration.UploadFrequency
        switch frequency?.lowercased {
        case "rare":
            uploadFrequency = .rare
        case "average":
            uploadFrequency = .average
        case "frequent":
            uploadFrequency = .frequent
        default:
            uploadFrequency = .average
        }
        return uploadFrequency
    }

    func buildBatchSize(batchSize: NSString?) -> Datadog.Configuration.BatchSize {
        let size: Datadog.Configuration.BatchSize
        switch batchSize?.lowercased {
        case "small":
            size = .small
        case "medium":
            size = .medium
        case "large":
            size = .large
        default:
            size = .medium
        }
        return size
    }

    func setVerbosityLevel(additionalConfig: NSDictionary?) {
        let verbosityLevel = (additionalConfig?[InternalConfigurationAttributes.sdkVerbosity]) as? NSString
        switch verbosityLevel?.lowercased {
        case "debug":
            Datadog.verbosityLevel = .debug
        case "info":
            Datadog.verbosityLevel = .info
        case "warn":
            Datadog.verbosityLevel = .warn
        case "error":
            Datadog.verbosityLevel = .error
        default:
            Datadog.verbosityLevel = nil
        }
    }
    
    func startJSRefreshRateMonitoring(sdkConfiguration: DdSdkConfiguration) {
        if let frameTimeCallback = buildFrameTimeCallback(sdkConfiguration: sdkConfiguration) {
            // Falling back to mainDispatchQueue if bridge is nil is only useful for tests
            self.jsRefreshRateMonitor.startMonitoring(jsQueue: jsDispatchQueue ?? mainDispatchQueue, frameTimeCallback: frameTimeCallback)
        }
    }

    func buildFrameTimeCallback(sdkConfiguration: DdSdkConfiguration)-> ((Double) -> ())? {
        let jsRefreshRateMonitoringEnabled = buildVitalsUpdateFrequency(frequency: sdkConfiguration.vitalsUpdateFrequency) != .never
        let jsLongTaskMonitoringEnabled = sdkConfiguration.longTaskThresholdMs != 0
        
        if (!jsRefreshRateMonitoringEnabled && !jsLongTaskMonitoringEnabled) {
            return nil
        }

        func frameTimeCallback(frameTime: Double) {
            if (jsRefreshRateMonitoringEnabled && frameTime > 0) {
                Global.rum._internal.updatePerformanceMetric(at: Date(), metric: .jsFrameTimeSeconds, value: frameTime)
            }
            if (jsLongTaskMonitoringEnabled && frameTime > sdkConfiguration.longTaskThresholdMs / 1_000) {
                Global.rum._internal.addLongTask(at: Date(), duration: frameTime, attributes: ["long_task.target": "javascript"])
            }
        }
        
        return frameTimeCallback
    }

}
