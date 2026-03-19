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
import Foundation
import React

#if os(iOS)
    import DatadogWebViewTracking
#endif

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
        if Datadog.isInitialized(instanceName: CoreRegistry.defaultInstanceName) {
            // Initializing the SDK twice results in Global.rum and Global.sharedTracer to be set to no-op instances
            consolePrint("Datadog SDK is already initialized, skipping initialization.", .debug)
            DdTelemetry.telemetryDebug(
                id: "datadog_react_native: RN  SDK was already initialized in native",
                message: "RN SDK was already initialized in native"
            )
            
            RUMMonitor.shared().currentSessionID { sessionId in
                guard let id = sessionId else { return }
                DdSdkSessionStartedListener.instance.rumSessionListener?(id, false)
            }

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
        if let jsonResult = jsonFileReader.parseResourceFile(resourcePath: "datadog-configuration")
            as? [String: AnyObject]
        {
            do {
                return try jsonResult.asDdSdkConfigurationFromJSON()
            } catch {
                consolePrint("Error parsing datadog-configuration.json file: \(error)", .critical)
            }
        } else {
            consolePrint(
                "datadog-configuration.json file cannot be parsed. Make sure it is valid.",
                .critical)
        }
        return nil
    }

    @objc
    public func initializeFromNative() {
        if let configuration = getConfigurationFromJSONFile() {
            self.initialize(sdkConfiguration: configuration)
        }
    }

    func enableFeatures(sdkConfiguration: DdSdkConfiguration) {
        
        if (sdkConfiguration.rumConfiguration != nil) {
            let rumConfig = buildRumConfiguration(configuration: sdkConfiguration)
            RUM.enable(with: rumConfig)
            
            if sdkConfiguration.rumConfiguration?.nativeCrashReportEnabled ?? false {
                CrashReporting.enable()
            }
        }

        if (sdkConfiguration.logsConfiguration != nil) {
            let logsConfig = buildLogsConfiguration(configuration: sdkConfiguration)
            Logs.enable(with: logsConfig)
        }

        if (sdkConfiguration.traceConfiguration != nil) {
            let traceConfig = buildTraceConfiguration(configuration: sdkConfiguration)
            Trace.enable(with: traceConfig)
        }

        #if os(iOS)
            DatadogSDKWrapper.shared.enableWebviewTracking()
        #endif
    }

    func buildSDKConfiguration(
        configuration: DdSdkConfiguration,
        defaultAppVersion: String = getDefaultAppVersion()
    ) -> Datadog.Configuration {
        var config = Datadog.Configuration(
            clientToken: configuration.clientToken,
            env: configuration.env,
            site: configuration.site,
            service: configuration.service as? String,
            batchSize: configuration.batchSize,
            uploadFrequency: configuration.uploadFrequency,
            proxyConfiguration: configuration.proxyConfiguration,
            batchProcessingLevel: configuration.batchProcessingLevel
        )

        if var additionalConfiguration = configuration.additionalConfiguration as? [String: Any] {
            if let versionSuffix = additionalConfiguration[
                InternalConfigurationAttributes.versionSuffix] as? String
            {
                let datadogVersion = defaultAppVersion + versionSuffix
                additionalConfiguration[CrossPlatformAttributes.version] = datadogVersion
            }

            config._internal_mutation {
                $0.additionalConfiguration = additionalConfiguration
            }
        }

        return config
    }

    func buildRumConfiguration(configuration: DdSdkConfiguration) -> RUM.Configuration {
        guard let rumConfig = configuration.rumConfiguration else {
            preconditionFailure("buildRumConfiguration called without rumConfiguration")
        }

        var longTaskThreshold: TimeInterval? = nil
        if let threshold = configuration.rumConfiguration?.nativeLongTaskThresholdMs, threshold != 0 {
            longTaskThreshold = threshold / 1_000
        }

        var uiKitViewsPredicate: UIKitRUMViewsPredicate? = nil
        if rumConfig.nativeViewTracking ?? false {
            uiKitViewsPredicate = DefaultUIKitRUMViewsPredicate()
        }

        var uiKitActionsPredicate: UIKitRUMActionsPredicate? = nil
        if rumConfig.nativeInteractionTracking ?? false {
            uiKitActionsPredicate = DefaultUIKitRUMActionsPredicate()
        }

        var urlSessionTracking: RUM.Configuration.URLSessionTracking? = nil
        if let firstPartyHosts = rumConfig.firstPartyHosts {
            urlSessionTracking = RUM.Configuration.URLSessionTracking(
                firstPartyHostsTracing: .traceWithHeaders(
                    hostsWithHeaders: firstPartyHosts,
                    sampleRate: Float(
                        configuration.rumConfiguration?.resourceTraceSampleRate
                            ?? DefaultConfiguration.resourceTraceSampleRate)
                ),
                resourceAttributesProvider: { request, _, _, _ in
                    let trackedBy = request.value(forHTTPHeaderField: InternalConfigurationAttributes.trackedByHeaderKey)
                    if trackedBy == InternalConfigurationAttributes.trackedByHeaderValue {
                        return [InternalConfigurationAttributes.dropResource: true]
                    }
                    return nil
                }
            )
        }

        var customRUMEndpointURL: URL? = nil
        if let customEndpoint = rumConfig.customEndpoint, !customEndpoint.isEmpty {
            customRUMEndpointURL = URL(string: "\(customEndpoint)/api/v2/rum")
        }

        var networkSettledResourcePredicate: TimeBasedTNSResourcePredicate? = nil
        if let initialThreshold = rumConfig.initialResourceThreshold {
            networkSettledResourcePredicate = TimeBasedTNSResourcePredicate(
                threshold: initialThreshold)
        }

        return RUM.Configuration(
            applicationID: rumConfig.applicationId,
            sessionSampleRate: Float(
                rumConfig.sessionSampleRate ?? DefaultConfiguration.sessionSamplingRate),
            uiKitViewsPredicate: uiKitViewsPredicate,
            uiKitActionsPredicate: uiKitActionsPredicate,
            urlSessionTracking: urlSessionTracking,
            trackFrustrations: rumConfig.trackFrustrations
                ?? DefaultConfiguration.trackFrustrations,
            trackBackgroundEvents: rumConfig.trackBackgroundEvents
                ?? DefaultConfiguration.trackBackgroundEvents,
            longTaskThreshold: longTaskThreshold,
            appHangThreshold: rumConfig.appHangThreshold,
            trackWatchdogTerminations: rumConfig.trackWatchdogTerminations,
            vitalsUpdateFrequency: rumConfig.vitalsUpdateFrequency,
            networkSettledResourcePredicate: networkSettledResourcePredicate
                ?? TimeBasedTNSResourcePredicate(),
            resourceEventMapper: { resourceEvent in
                if resourceEvent.context?.contextInfo[InternalConfigurationAttributes.dropResource]
                    != nil
                {
                    return nil
                }
                return resourceEvent
            },
            actionEventMapper: { actionEvent in
                if actionEvent.context?.contextInfo[InternalConfigurationAttributes.dropResource]
                    != nil
                {
                    return nil
                }
                return actionEvent
            },
            onSessionStart: DdSdkSessionStartedListener.instance.rumSessionListener,
            customEndpoint: customRUMEndpointURL,
            trackMemoryWarnings: rumConfig.trackMemoryWarnings
                ?? DefaultConfiguration.trackMemoryWarnings,
            telemetrySampleRate: Float(
                rumConfig.telemetrySampleRate ?? DefaultConfiguration.telemetrySampleRate)
        )
    }

    func buildLogsConfiguration(configuration: DdSdkConfiguration) -> Logs.Configuration {
        guard let logsConfig = configuration.logsConfiguration else {
            preconditionFailure("buildLogsConfiguration called without logsConfiguration")
        }
        
        var customLogsEndpointURL: URL? = nil
        if let customLogsEndpoint = logsConfig.customEndpoint as? NSString {
            if customLogsEndpoint != "" {
                customLogsEndpointURL = URL(string: "\(customLogsEndpoint)/api/v2/logs" as String)
            }
        }

        return Logs.Configuration(customEndpoint: customLogsEndpointURL)
    }

    func buildTraceConfiguration(configuration: DdSdkConfiguration) -> Trace.Configuration {
        guard let traceConfig = configuration.traceConfiguration else {
            preconditionFailure("buildTraceConfiguration called without traceConfiguration")
        }
        
        var customTraceEndpointURL: URL? = nil
        if let customTraceEndpoint = traceConfig.customEndpoint as? NSString {
            if customTraceEndpoint != "" {
                customTraceEndpointURL = URL(
                    string: "\(customTraceEndpoint)/api/v2/spans" as String)
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
