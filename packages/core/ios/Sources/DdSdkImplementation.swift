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
        // Datadog SDK init needs to happen on the main thread: https://github.com/DataDog/dd-sdk-reactnative/issues/198
        self.mainDispatchQueue.async {
            let sdkConfiguration = configuration.asDdSdkConfiguration()
            
            // TODO: see if this `if` is still needed
            if Datadog.isInitialized() {
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

            let sdkConfig = self.buildSDKConfiguration(configuration: sdkConfiguration)
            let consent = self.buildTrackingConsent(consent: sdkConfiguration.trackingConsent)
            Datadog.initialize(with: sdkConfig, trackingConsent: consent)

            self.enableFeatures(sdkConfiguration: sdkConfiguration)
            self.sendConfigurationAsTelemetry(rnConfiguration: sdkConfiguration)
            self.startJSRefreshRateMonitoring(sdkConfiguration: sdkConfiguration)

            resolve(nil)
        }
    }
    
    func enableFeatures(sdkConfiguration: DdSdkConfiguration) {
        let rumConfig = self.buildRUMConfiguration(configuration: sdkConfiguration)
        RUM.enable(with: rumConfig)
        
        Logs.enable(with: Logs.Configuration())
        
        Trace.enable(with: Trace.Configuration())

        if sdkConfiguration.nativeCrashReportEnabled ?? false {
            CrashReporting.enable()
        }
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
            // TODO: memoize message emitter once core is initialized
            let messageEmitter = WebViewTracking._internal.messageEmitter(in: CoreRegistry.default)
            try messageEmitter.send(body: message)
        } catch {
            Datadog._internal.telemetry.error(id: "datadog_react_native:\(error.localizedDescription)", message: "The message being sent was:\(message)" as String, kind: "WebViewEventBridgeError" as String, stack: String(describing: error) as String)
        }
        resolve(nil)
    }
    
    func sendConfigurationAsTelemetry(rnConfiguration: DdSdkConfiguration) -> Void {
        // TODO: missing some keys: initializationType, reactVersion, reactNativeVersion, trackNativeErrors
        let telemetry = TelemetryCore(core: CoreRegistry.default)
        telemetry.configuration(
            trackCrossPlatformLongTasks: rnConfiguration.longTaskThresholdMs != 0,
            trackErrors: rnConfiguration.configurationForTelemetry?.trackErrors,
            trackInteractions: rnConfiguration.configurationForTelemetry?.trackInteractions,
            trackLongTask: rnConfiguration.longTaskThresholdMs != 0,
            trackNativeLongTasks: rnConfiguration.nativeLongTaskThresholdMs != 0,
            trackNetworkRequests: rnConfiguration.configurationForTelemetry?.trackNetworkRequests
        )
    }

    func buildSDKConfiguration(configuration: DdSdkConfiguration) -> Datadog.Configuration {
        // TODO: Add version to config once this is released on iOS
        var config = Datadog.Configuration(
            clientToken: configuration.clientToken,
            env: configuration.env,
            site: configuration.site,
            service: configuration.additionalConfig?[InternalConfigurationAttributes.serviceName] as? String ?? nil,
            batchSize: configuration.batchSize,
            uploadFrequency: configuration.uploadFrequency,
            proxyConfiguration: buildProxyConfiguration(config: configuration.additionalConfig)
        )
        if let additionalConfiguration = configuration.additionalConfig as? [String: Any] {
            config._internal_mutation {
              $0.additionalConfiguration = additionalConfiguration
            }
        }

        return config
    }
    
    func buildRUMConfiguration(configuration: DdSdkConfiguration) -> RUM.Configuration {
        var longTaskThreshold: TimeInterval? = nil
        if let threshold = configuration.nativeLongTaskThresholdMs as? TimeInterval {
            if (threshold != 0) {
                // `nativeLongTaskThresholdMs` attribute is in milliseconds
                longTaskThreshold = threshold / 1_000
            }
        }
        
        var uiKitViewsPredicate: UIKitRUMViewsPredicate? = nil
        if let enableViewTracking = configuration.additionalConfig?[InternalConfigurationAttributes.nativeViewTracking] as? Bool, enableViewTracking {
            uiKitViewsPredicate = DefaultUIKitRUMViewsPredicate()
        }

        var uiKitActionsPredicate: UIKitRUMActionsPredicate? = nil
        if let enableInteractionTracking = configuration.additionalConfig?[InternalConfigurationAttributes.nativeInteractionTracking] as? Bool, enableInteractionTracking {
            uiKitActionsPredicate = DefaultUIKitRUMActionsPredicate()
        }
        
        var urlSessionTracking: RUM.Configuration.URLSessionTracking? = nil
        if let firstPartyHosts = configuration.additionalConfig?[InternalConfigurationAttributes.firstPartyHosts] as? NSArray {
            // We will always fall under this condition as firstPartyHosts is an empty array by default
            urlSessionTracking = RUM.Configuration.URLSessionTracking(
                firstPartyHostsTracing: .traceWithHeaders(
                    hostsWithHeaders: firstPartyHosts.asFirstPartyHosts(),
                    sampleRate: 100.0
                )
            )
        }
        
        return RUM.Configuration(
            applicationID: configuration.applicationId,
            sessionSampleRate: (configuration.sampleRate as? NSNumber)?.floatValue ?? 100.0,
            uiKitViewsPredicate: uiKitViewsPredicate,
            uiKitActionsPredicate: uiKitActionsPredicate,
            urlSessionTracking: urlSessionTracking,
            trackFrustrations: configuration.trackFrustrations ?? true,
            trackBackgroundEvents: configuration.trackBackgroundEvents ?? false,
            longTaskThreshold: longTaskThreshold,
            vitalsUpdateFrequency: buildVitalsUpdateFrequency(frequency: configuration.vitalsUpdateFrequency),
            resourceEventMapper: { resourceEvent in
                if resourceEvent.context?.contextInfo[InternalConfigurationAttributes.dropResource] != nil {
                    return nil
                }
                return resourceEvent
            },
            actionEventMapper: { actionEvent in
                if actionEvent.context?.contextInfo[InternalConfigurationAttributes.dropResource] != nil {
                    return nil
                }
                return actionEvent
            },
            telemetrySampleRate: (configuration.telemetrySampleRate as? NSNumber)?.floatValue ?? 20.0
        )
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

    func buildVitalsUpdateFrequency(frequency: NSString?) -> RUM.Configuration.VitalsFrequency? {
        switch frequency?.lowercased {
        case "never":
            return nil
        case "rare":
            return .rare
        case "average":
            return .average
        case "frequent":
            return .frequent
        default:
            return .average
        }
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
            // .info is mapped to .debug
            Datadog.verbosityLevel = .debug
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
            self.jsRefreshRateMonitor.startMonitoring(jsQueue: jsDispatchQueue, frameTimeCallback: frameTimeCallback)
        }
    }

    func buildFrameTimeCallback(sdkConfiguration: DdSdkConfiguration)-> ((Double) -> ())? {
        let jsRefreshRateMonitoringEnabled = buildVitalsUpdateFrequency(frequency: sdkConfiguration.vitalsUpdateFrequency) != nil
        let jsLongTaskMonitoringEnabled = sdkConfiguration.longTaskThresholdMs != 0
        
        if (!jsRefreshRateMonitoringEnabled && !jsLongTaskMonitoringEnabled) {
            return nil
        }

        func frameTimeCallback(frameTime: Double) {
            if (jsRefreshRateMonitoringEnabled && frameTime > 0) {
                RUMMonitorInternalProvider()?.updatePerformanceMetric(at: Date(), metric: .jsFrameTimeSeconds, value: frameTime, attributes: [:])
            }
            if (jsLongTaskMonitoringEnabled && frameTime > sdkConfiguration.longTaskThresholdMs / 1_000) {
                RUMMonitorInternalProvider()?.addLongTask(at: Date(), duration: frameTime, attributes: ["long_task.target": "javascript"])
            }
        }
        
        return frameTimeCallback
    }

}
