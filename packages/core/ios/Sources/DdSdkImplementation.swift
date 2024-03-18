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
        // Datadog SDK init needs to happen on the main thread: https://github.com/DataDog/dd-sdk-reactnative/issues/198
        self.mainDispatchQueue.async {
            let sdkConfiguration = configuration.asDdSdkConfiguration()
            
            // TODO: see if this `if` is still needed
            if DatadogSDKWrapper.shared.isInitialized() {
                // Initializing the SDK twice results in Global.rum and
                // Global.sharedTracer to be set to no-op instances
                consolePrint("Datadog SDK is already initialized, skipping initialization.", .debug)
                DatadogSDKWrapper.shared.telemetryDebug(id: "datadog_react_native: RN  SDK was already initialized in native", message: "RN SDK was already initialized in native")
                
                // This block is called when SDK is reinitialized and the javascript has been wiped out.
                // In this case, we need to restart the refresh rate monitor, as the javascript thread 
                // appears to change at that moment.
                self.startJSRefreshRateMonitoring(sdkConfiguration: sdkConfiguration)
                resolve(nil)
                return
            }
            self.setVerbosityLevel(configuration: sdkConfiguration)

            let coreConfiguration = self.buildSDKConfiguration(configuration: sdkConfiguration)
            let consent = self.buildTrackingConsent(consent: sdkConfiguration.trackingConsent)

            DatadogSDKWrapper.shared.initialize(
                coreConfiguration: coreConfiguration,
                loggerConfiguration: Logger.Configuration(configuration),
                trackingConsent: consent
            )

            self.enableFeatures(sdkConfiguration: sdkConfiguration)
            self.startJSRefreshRateMonitoring(sdkConfiguration: sdkConfiguration)

            resolve(nil)
        }
    }
    
    func enableFeatures(sdkConfiguration: DdSdkConfiguration) {
        let rumConfig = buildRUMConfiguration(configuration: sdkConfiguration)
        DatadogSDKWrapper.shared.enableRUM(with: rumConfig)
        
        let logsConfig = buildLogsConfiguration(configuration: sdkConfiguration)
        DatadogSDKWrapper.shared.enableLogs(with: logsConfig)
        
        let traceConfig = buildTraceConfiguration(configuration: sdkConfiguration)
        DatadogSDKWrapper.shared.enableTrace(with: traceConfig)

        if sdkConfiguration.nativeCrashReportEnabled ?? false {
            DatadogSDKWrapper.shared.enableCrashReporting()
        }
        
        DatadogSDKWrapper.shared.enableWebviewTracking()

        overrideReactNativeTelemetry(rnConfiguration: sdkConfiguration)
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
        DatadogSDKWrapper.shared.telemetryDebug(id: "datadog_react_native:\(message)", message: message as String)
        resolve(nil)
    }
    
    @objc
    public func telemetryError(message: NSString, stack: NSString, kind: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        DatadogSDKWrapper.shared.telemetryError(id: "datadog_react_native:\(String(describing: kind)):\(message)", message: message as String, kind: kind as? String, stack: stack as? String)
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

    func buildSDKConfiguration(configuration: DdSdkConfiguration, defaultAppVersion: String = getDefaultAppVersion()) -> Datadog.Configuration {
        var config = Datadog.Configuration(
            clientToken: configuration.clientToken,
            env: configuration.env,
            site: configuration.site,
            service: configuration.serviceName as? String,
            batchSize: configuration.batchSize,
            uploadFrequency: configuration.uploadFrequency,
            proxyConfiguration: configuration.proxyConfig
        )

        if var additionalConfiguration = configuration.additionalConfig as? [String: Any] {
            if let versionSuffix = additionalConfiguration[InternalConfigurationAttributes.versionSuffix] as? String {
                let datadogVersion = defaultAppVersion + versionSuffix
                additionalConfiguration[CrossPlatformAttributes.version] = datadogVersion
            }

            config._internal_mutation {
              $0.additionalConfiguration = additionalConfiguration
            }
        }

        return config
    }
    
    func buildRUMConfiguration(configuration: DdSdkConfiguration) -> RUM.Configuration {
        var longTaskThreshold: TimeInterval? = nil
        if let threshold = configuration.nativeLongTaskThresholdMs {
            if (threshold != 0) {
                // `nativeLongTaskThresholdMs` attribute is in milliseconds
                longTaskThreshold = threshold / 1_000
            }
        }
        
        var uiKitViewsPredicate: UIKitRUMViewsPredicate? = nil
        if let enableViewTracking = configuration.nativeViewTracking, enableViewTracking {
            uiKitViewsPredicate = DefaultUIKitRUMViewsPredicate()
        }

        var uiKitActionsPredicate: UIKitRUMActionsPredicate? = nil
        if let enableInteractionTracking = configuration.nativeInteractionTracking, enableInteractionTracking {
            uiKitActionsPredicate = DefaultUIKitRUMActionsPredicate()
        }
        
        var urlSessionTracking: RUM.Configuration.URLSessionTracking? = nil
        if let firstPartyHosts = configuration.firstPartyHosts {
            // We will always fall under this condition as firstPartyHosts is an empty array by default
            urlSessionTracking = RUM.Configuration.URLSessionTracking(
                firstPartyHostsTracing: .traceWithHeaders(
                    hostsWithHeaders: firstPartyHosts,
                    sampleRate: 100.0
                )
            )
        }
        
        var customRUMEndpointURL: URL? = nil
        if let customRUMEndpoint = configuration.customEndpoints?.rum as? NSString {
            if (customRUMEndpoint != "") {
                customRUMEndpointURL = URL(string: "\(customRUMEndpoint)/api/v2/rum" as String)
            }
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
            customEndpoint: customRUMEndpointURL,
            telemetrySampleRate: (configuration.telemetrySampleRate as? NSNumber)?.floatValue ?? 20.0
        )
    }
    
    func buildLogsConfiguration(configuration: DdSdkConfiguration) -> Logs.Configuration {
        var customLogsEndpointURL: URL? = nil
        if let customLogsEndpoint = configuration.customEndpoints?.logs as? NSString {
            if (customLogsEndpoint != "") {
                customLogsEndpointURL = URL(string: "\(customLogsEndpoint)/api/v2/logs" as String)
            }
        }
        
        return Logs.Configuration(customEndpoint: customLogsEndpointURL)
    }
    
    
    func buildTraceConfiguration(configuration: DdSdkConfiguration) -> Trace.Configuration {
        var customTraceEndpointURL: URL? = nil
        if let customTraceEndpoint = configuration.customEndpoints?.trace as? NSString {
            if (customTraceEndpoint != "") {
                customTraceEndpointURL = URL(string: "\(customTraceEndpoint)/api/v2/spans" as String)
            }
        }
        
        return Trace.Configuration(customEndpoint: customTraceEndpointURL)
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

    func setVerbosityLevel(configuration: DdSdkConfiguration) {
        switch configuration.verbosity?.lowercased {
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
