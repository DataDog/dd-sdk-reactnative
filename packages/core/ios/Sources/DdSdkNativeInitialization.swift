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

@objc
public class DdSdkNativeInitialization: NSObject {
    let jsonFileReader: ResourceFileReader
    
    @objc
    public convenience override init() {
        self.init(jsonFileReader: JSONFileReader())
    }

    init(
        jsonFileReader: ResourceFileReader
    ) {
        self.jsonFileReader = jsonFileReader
    }
    
    internal func initialize(sdkConfiguration: DdSdkConfiguration) {
        // TODO: see if this `if` is still needed
        if DatadogSDKWrapper.shared.isInitialized() {
            // Initializing the SDK twice results in Global.rum and
            // Global.sharedTracer to be set to no-op instances
            consolePrint("Datadog SDK is already initialized, skipping initialization.", .debug)
            DatadogSDKWrapper.shared.telemetryDebug(id: "datadog_react_native: RN  SDK was already initialized in native", message: "RN SDK was already initialized in native")
            return
        }
        self.setVerbosityLevel(configuration: sdkConfiguration)

        let coreConfiguration = self.buildSDKConfiguration(configuration: sdkConfiguration)
        DatadogSDKWrapper.shared.initialize(
            coreConfiguration: coreConfiguration,
            loggerConfiguration: DatadogLogs.Logger.Configuration(sdkConfiguration),
            trackingConsent: sdkConfiguration.trackingConsent
        )

        self.enableFeatures(sdkConfiguration: sdkConfiguration)
    }
    
    internal func getConfigurationFromJSONFile() -> DdSdkConfiguration? {
        if let jsonResult = jsonFileReader.parseResourceFile(resourcePath: "datadog-configuration") as? Dictionary<String, AnyObject> {
            do {
                return try jsonResult.asDdSdkConfigurationFromJSON()
            } catch {
                consolePrint("Error parsing datadog-configuration.json file: \(error)", .critical)
            }
        } else {
           consolePrint("datadog-configuration.json file cannot be parsed. Make sure it is valid.", .critical)
        }
        return nil
    }

    @objc
    public func initializeFromNative() -> Void {
        if let configuration = getConfigurationFromJSONFile() {
            self.initialize(sdkConfiguration: configuration)
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
            // This is applied to make sure we also add headers to requests made on the native side.
            // The sampling rate here does not impact the sampling rate for JS requests.
            urlSessionTracking = RUM.Configuration.URLSessionTracking(
                firstPartyHostsTracing: .traceWithHeaders(
                    hostsWithHeaders: firstPartyHosts,
                    sampleRate: (configuration.resourceTracingSamplingRate as? NSNumber)?.floatValue ?? Float(DefaultConfiguration.resourceTracingSamplingRate)
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
            sessionSampleRate: (configuration.sampleRate as? NSNumber)?.floatValue ?? Float(DefaultConfiguration.sessionSamplingRate),
            uiKitViewsPredicate: uiKitViewsPredicate,
            uiKitActionsPredicate: uiKitActionsPredicate,
            urlSessionTracking: urlSessionTracking,
            trackFrustrations: configuration.trackFrustrations ?? true,
            trackBackgroundEvents: configuration.trackBackgroundEvents ?? false,
            longTaskThreshold: longTaskThreshold,
            appHangThreshold: configuration.appHangThreshold,
            trackWatchdogTerminations: configuration.trackWatchdogTerminations,
            vitalsUpdateFrequency: configuration.vitalsUpdateFrequency,
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
            telemetrySampleRate: (configuration.telemetrySampleRate as? NSNumber)?.floatValue ?? Float(DefaultConfiguration.telemetrySampleRate)
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
}
