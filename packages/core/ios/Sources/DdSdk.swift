/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import Datadog
import DatadogCrashReporting

func getDefaultAppVersion() -> String {
    let bundleShortVersion = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
    let bundleVersion = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String
    return bundleShortVersion ?? bundleVersion ?? "0.0.0"
}

@objc(DdSdk)
class RNDdSdk: NSObject {
    @objc(requiresMainQueueSetup)
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    let mainDispatchQueue: DispatchQueueType
    @objc(methodQueue)
    let methodQueue: DispatchQueue = sharedQueue
    
    convenience override init() {
        self.init(mainDispatchQueue: DispatchQueue.main)
    }
    
    init(mainDispatchQueue: DispatchQueueType) {
        self.mainDispatchQueue = mainDispatchQueue
        super.init()
    }


    @objc(initialize:withResolver:withRejecter:)
    func initialize(configuration: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
        // Datadog SDK init needs to happen on the main thread: https://github.com/DataDog/dd-sdk-reactnative/issues/198
        self.mainDispatchQueue.async {
            if Datadog.isInitialized {
                // Initializing the SDK twice results in Global.rum and
                // Global.sharedTracer to be set to no-op instances
                consolePrint("Datadog SDK is already initialized, skipping initialization.")
                Datadog._internal._telemetry.debug(id: "datadog_react_native: RN  SDK was already initialized in native", message: "RN SDK was already initialized in native")
                resolve(nil)
                return
            }
            let sdkConfiguration = configuration.asDdSdkConfiguration()
            self.setVerbosityLevel(additionalConfig: sdkConfiguration.additionalConfig)

            let ddConfig = self.buildConfiguration(configuration: sdkConfiguration)
            let consent = self.buildTrackingConsent(consent: sdkConfiguration.trackingConsent)
            Datadog.initialize(appContext: Datadog.AppContext(), trackingConsent: consent, configuration: ddConfig)

            Global.rum = RUMMonitor.initialize()

            resolve(nil)
        }
    }

    @objc(setAttributes:withResolver:withRejecter:)
    func setAttributes(attributes: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        let castedAttributes = castAttributesToSwift(attributes)
        for (key, value) in castedAttributes {
            Global.rum.addAttribute(forKey: key, value: value)
            GlobalState.addAttribute(forKey: key, value: value)
        }
        
        resolve(nil)
    }

    @objc(setUser:withResolver:withRejecter:)
    func setUser(user: NSDictionary, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        var castedUser = castAttributesToSwift(user)
        let id = castedUser.removeValue(forKey: "id") as? String
        let name = castedUser.removeValue(forKey: "name") as? String
        let email = castedUser.removeValue(forKey: "email") as? String
        let extraInfo: [String: Encodable] = castedUser // everything what's left is an `extraInfo`

        Datadog.setUserInfo(id: id, name: name, email: email, extraInfo: extraInfo)
        resolve(nil)
    }

    @objc(setTrackingConsent:withResolver:withRejecter:)
    func setTrackingConsent(trackingConsent: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        Datadog.set(trackingConsent: buildTrackingConsent(consent: trackingConsent))
        resolve(nil)
    }
    
    @objc(telemetryDebug:withResolver:withRejecter:)
    func telemetryDebug(message: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        Datadog._internal._telemetry.debug(id: "datadog_react_native:\(message)", message: message as String)
        resolve(nil)
    }
    
    @objc(telemetryError:withStack:withKind:withResolver:withRejecter:)
    func telemetryDebug(message: NSString, stack: NSString, kind: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        Datadog._internal._telemetry.error(id: "datadog_react_native:\(String(describing: kind)):\(message)", message: message as String, kind: kind as? String, stack: stack as? String)
        resolve(nil)
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
        default:
            _ = ddConfigBuilder.set(endpoint: .us1)
        }

        if var telemetrySampleRate = (configuration.telemetrySampleRate as? NSNumber)?.floatValue {
            _ = ddConfigBuilder.set(sampleTelemetry: telemetrySampleRate)
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

        if let serviceName = additionalConfig?[InternalConfigurationAttributes.serviceName] as? String {
            _ = ddConfigBuilder.set(serviceName: serviceName)
        }

        if let threshold = additionalConfig?[InternalConfigurationAttributes.longTaskThreshold] as? TimeInterval {
            // `_dd.long_task.threshold` attribute is in milliseconds
            _ = ddConfigBuilder.trackRUMLongTasks(threshold: threshold / 1_000)
        }

        if let firstPartyHosts = additionalConfig?[InternalConfigurationAttributes.firstPartyHosts] as? [String] {
            _ = ddConfigBuilder.trackURLSession(firstPartyHosts: Set(firstPartyHosts))
        }

        if let proxyConfiguration = buildProxyConfiguration(config: additionalConfig) {
            _ = ddConfigBuilder.set(proxyConfiguration: proxyConfiguration)
        }

        if configuration.nativeCrashReportEnabled ?? false {
            _ = ddConfigBuilder.enableCrashReporting(using: DDCrashReportingPlugin())
        }

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
}
