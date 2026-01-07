/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import DatadogCore
import DatadogFlags
import DatadogInternal
import DatadogRUM
import Foundation

extension NSDictionary {

    func asDdSdkConfiguration() -> DdSdkConfiguration {
        let additionalConfiguration = self["additionalConfiguration"] as? NSDictionary

        let clientToken = (self["clientToken"] as? String) ?? ""
        let env = (self["env"] as? String) ?? ""

        let siteString = self["site"] as? NSString
        let site = siteString.asSite()

        let service = self["service"] as? NSString
        let verbosity = self["verbosity"] as? NSString

        let nativeCrashReportEnabled = self["nativeCrashReportEnabled"] as? Bool
        let nativeLongTaskThresholdMs = self["nativeLongTaskThresholdMs"] as? Double

        let trackingConsentString = self["trackingConsent"] as? NSString
        let trackingConsent = trackingConsentString.asTrackingConsent()

        let uploadFrequencyString = self["uploadFrequency"] as? NSString
        let uploadFrequency = uploadFrequencyString.asUploadFrequency()

        let batchSizeString = self["batchSize"] as? NSString
        let batchSize = batchSizeString.asBatchSize()

        let batchProcessingLevelString = self["batchProcessingLevel"] as? NSString
        let batchProcessingLevel = batchProcessingLevelString.asBatchProcessingLevel()

        let proxyConfigurationDict = self["proxyConfiguration"] as? NSDictionary
        let proxyConfiguration = proxyConfigurationDict?.asProxyConfiguration()

        let firstPartyHostsArray = self["firstPartyHosts"] as? NSArray
        let firstPartyHosts = firstPartyHostsArray?.asFirstPartyHosts()

        // MARK: - RUM configuration

        let rumConfigurationDict = self["rumConfiguration"] as? NSDictionary
        let rumConfiguration: RumConfiguration?

        if let rumDict = rumConfigurationDict {
            let applicationId = (rumDict["applicationId"] as? String) ?? ""

            let trackFrustrations = rumDict["trackFrustrations"] as? Bool
            let longTaskThresholdMs = rumDict["longTaskThresholdMs"] as? Double
            let sessionSampleRate = rumDict["sessionSampleRate"] as? Double
            let vitalsUpdateFrequencyString = rumDict["vitalsUpdateFrequency"] as? NSString
            let vitalsUpdateFrequency = vitalsUpdateFrequencyString.asVitalsUpdateFrequency()

            let trackBackgroundEvents = rumDict["trackBackgroundEvents"] as? Bool
            let nativeViewTracking = rumDict["nativeViewTracking"] as? Bool
            let nativeInteractionTracking = rumDict["nativeInteractionTracking"] as? Bool

            let appHangThreshold = rumDict["appHangThreshold"] as? Double
            let trackWatchdogTerminations = rumDict["trackWatchdogTerminations"] as? Bool
            let initialResourceThreshold = rumDict["initialResourceThreshold"] as? Double
            let trackMemoryWarnings = rumDict["trackMemoryWarnings"] as? Bool
            let telemetrySampleRate = rumDict["telemetrySampleRate"] as? Double
            let customEndpoint = rumDict["customEndpoint"] as? String

            rumConfiguration = RumConfiguration(
                applicationId: applicationId,
                trackFrustrations: trackFrustrations ?? DefaultConfiguration.trackFrustrations,
                longTaskThresholdMs: longTaskThresholdMs
                    ?? DefaultConfiguration.longTaskThresholdMs,
                sessionSampleRate: sessionSampleRate ?? DefaultConfiguration.sessionSamplingRate,
                vitalsUpdateFrequency: vitalsUpdateFrequency,
                trackBackgroundEvents: trackBackgroundEvents
                    ?? DefaultConfiguration.trackBackgroundEvents,
                nativeViewTracking: nativeViewTracking ?? DefaultConfiguration.nativeViewTracking,
                nativeInteractionTracking: nativeInteractionTracking
                    ?? DefaultConfiguration.nativeInteractionTracking,
                appHangThreshold: appHangThreshold,
                trackWatchdogTerminations: trackWatchdogTerminations
                    ?? DefaultConfiguration.trackWatchdogTerminations,
                initialResourceThreshold: initialResourceThreshold,
                trackMemoryWarnings: trackMemoryWarnings
                    ?? DefaultConfiguration.trackMemoryWarnings,
                telemetrySampleRate: telemetrySampleRate
                    ?? DefaultConfiguration.telemetrySampleRate,
                customEndpoint: customEndpoint
            )
        } else {
            rumConfiguration = nil
        }

        // MARK: - Logs configuration

        let logsConfigurationDict = self["logsConfiguration"] as? NSDictionary
        let logsConfiguration: LogsConfiguration?

        if let logsDict = logsConfigurationDict {
            let bundleLogsWithRum = logsDict["bundleLogsWithRum"] as? Bool
            let bundleLogsWithTraces = logsDict["bundleLogsWithTraces"] as? Bool
            let customEndpoint = logsDict["customEndpoint"] as? String

            logsConfiguration = LogsConfiguration(
                bundleLogsWithRum: bundleLogsWithRum ?? DefaultConfiguration.bundleLogsWithRum,
                bundleLogsWithTraces: bundleLogsWithTraces
                    ?? DefaultConfiguration.bundleLogsWithTraces,
                customEndpoint: customEndpoint
            )
        } else {
            logsConfiguration = nil
        }

        // MARK: - Trace configuration (TraceNativeConfiguration)

        let traceConfigurationDict = self["traceConfiguration"] as? NSDictionary
        let traceConfiguration: TraceConfiguration?

        if let traceDict = traceConfigurationDict {
            let resourceTraceSampleRate = traceDict["resourceTraceSampleRate"] as? Double
            let customEndpoint = traceDict["customEndpoint"] as? String

            traceConfiguration = TraceConfiguration(
                resourceTraceSampleRate: resourceTraceSampleRate
                    ?? DefaultConfiguration.resourceTraceSampleRate,
                customEndpoint: customEndpoint
            )
        } else {
            traceConfiguration = nil
        }

        // MARK: - ConfigurationForTelemetry

        let configurationForTelemetryDict = self["configurationForTelemetry"] as? NSDictionary
        let configurationForTelemetry = configurationForTelemetryDict?.asConfigurationForTelemetry()

        return DdSdkConfiguration(
            additionalConfiguration: additionalConfiguration,
            clientToken: clientToken,
            env: env,
            site: site,
            service: service,
            verbosity: verbosity,
            nativeCrashReportEnabled: nativeCrashReportEnabled
                ?? DefaultConfiguration.nativeCrashReportEnabled,
            nativeLongTaskThresholdMs: nativeLongTaskThresholdMs
                ?? DefaultConfiguration.nativeLongTaskThresholdMs,
            trackingConsent: trackingConsent,
            uploadFrequency: uploadFrequency,
            batchSize: batchSize,
            batchProcessingLevel: batchProcessingLevel,
            proxyConfiguration: proxyConfiguration,
            firstPartyHosts: firstPartyHosts,
            rumConfiguration: rumConfiguration,
            logsConfiguration: logsConfiguration,
            traceConfiguration: traceConfiguration,
            configurationForTelemetry: configurationForTelemetry
        )
    }

    func asConfigurationForTelemetry() -> ConfigurationForTelemetry {
        let initializationType = object(forKey: "initializationType") as? NSString
        let trackErrors = object(forKey: "trackErrors") as? Bool
        let trackInteractions = object(forKey: "trackInteractions") as? Bool
        let trackNetworkRequests = object(forKey: "trackNetworkRequests") as? Bool
        let reactVersion = object(forKey: "reactVersion") as? NSString
        let reactNativeVersion = object(forKey: "reactNativeVersion") as? NSString

        return ConfigurationForTelemetry(
            initializationType: initializationType,
            trackErrors: trackErrors,
            trackInteractions: trackInteractions,
            trackNetworkRequests: trackNetworkRequests,
            reactVersion: reactVersion,
            reactNativeVersion: reactNativeVersion
        )
    }

    func asConfigurationForFlags() -> Flags.Configuration? {
        let enabled = object(forKey: "enabled") as? Bool ?? false

        if !enabled {
            return nil
        }

        // Hard set `gracefulModeEnabled` to `true` because this misconfiguration is handled on JS side.
        let gracefulModeEnabled = true

        let customFlagsHeaders = object(forKey: "customFlagsHeaders") as? [String: String]
        let trackExposures = object(forKey: "trackExposures") as? Bool
        let rumIntegrationEnabled = object(forKey: "rumIntegrationEnabled") as? Bool

        var customFlagsEndpointURL: URL? = nil
        if let customFlagsEndpoint = object(forKey: "customFlagsEndpoint") as? String {
            customFlagsEndpointURL = URL(string: "\(customFlagsEndpoint)/precompute-assignments" as String)
        }
        var customExposureEndpointURL: URL? = nil
        if let customExposureEndpoint = object(forKey: "customExposureEndpoint") as? String {
            customExposureEndpointURL = URL(string: "\(customExposureEndpoint)/api/v2/exposures" as String)
        }

        return Flags.Configuration(
            gracefulModeEnabled: gracefulModeEnabled,
            customFlagsEndpoint: customFlagsEndpointURL,
            customFlagsHeaders: customFlagsHeaders,
            customExposureEndpoint: customExposureEndpointURL,
            trackExposures: trackExposures ?? true,
            rumIntegrationEnabled: rumIntegrationEnabled ?? true
        )
    }

    func asProxyConfiguration() -> [AnyHashable: Any]? {
        guard let address = object(forKey: "address") as? String else {
            return nil
        }

        var proxy: [AnyHashable: Any] = [:]
        proxy[kCFProxyUsernameKey] = object(forKey: "username")
        proxy[kCFProxyPasswordKey] = object(forKey: "password")

        let type = object(forKey: "type") as? String
        var port = object(forKey: "port") as? Int
        if let string = object(forKey: "port") as? String {
            port = Int(string)
        }

        switch type?.lowercased() {
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
}

extension NSArray {
    /*
     * Adapts the data format from the React Native SDK configuration to match with the
     * iOS SDK configuration. For example:
     *
     * RN config: [{ match: "example.com", propagatorTypes: [DATADOG, B3] }]
     * iOS config: { "example.com": [DATADOG, B3] }
     */
    func asFirstPartyHosts() -> [String: Set<TracingHeaderType>] {
        return reduce(
            into: [:],
            { firstPartyHosts, h in
                let host = (h as? NSDictionary)

                if let match = (host?.value(forKey: "match") as? String),
                    let propagatorTypes = (host?.value(forKey: "propagatorTypes") as? NSArray)
                {
                    if let hostPropagatorTypes = firstPartyHosts[match] {
                        firstPartyHosts[match] = hostPropagatorTypes.union(
                            propagatorTypes.asTracingHeaderType())
                    } else {
                        firstPartyHosts[match] = propagatorTypes.asTracingHeaderType()
                    }
                }
            })
    }

    func asTracingHeaderType() -> Set<TracingHeaderType> {
        return Set(
            compactMap { headerType in
                switch (headerType as? String)?.lowercased() {
                case "datadog":
                    return TracingHeaderType.datadog
                case "b3":
                    return TracingHeaderType.b3
                case "b3multi":
                    return TracingHeaderType.b3multi
                case "tracecontext":
                    return TracingHeaderType.tracecontext
                default:
                    return nil
                }
            })
    }
}

internal struct DefaultConfiguration {
    static let nativeCrashReportEnabled = false
    static let sessionSamplingRate = 100.0
    static let resourceTraceSampleRate = 100.0
    static let longTaskThresholdMs = 0.0
    static let nativeLongTaskThresholdMs = 200.0
    static let nativeViewTracking = false
    static let nativeInteractionTracking = false
    static let firstPartyHosts: [String: Set<TracingHeaderType>] = [:]
    static let telemetrySampleRate = 20.0
    static let trackFrustrations = true
    static let trackBackgroundEvents = false
    static let bundleLogsWithRum = true
    static let bundleLogsWithTraces = true
    static let trackWatchdogTerminations = false
    static let trackMemoryWarnings = true
}

extension Dictionary where Key == String, Value == AnyObject {
    func asDdSdkConfigurationFromJSON() throws -> DdSdkConfiguration {
        guard let configuration = self["configuration"] as? [String: Any?] else {
            throw ProgrammerError(
                description: "JSON configuration file is missing top-level \"configuration\" key.")
        }

        let additionalConfiguration: NSDictionary = [
            CrossPlatformAttributes.ddsource: "react-native",
            CrossPlatformAttributes.sdkVersion: SdkVersion,
        ]

        let clientToken = (configuration["clientToken"] as? String) ?? ""
        let env = (configuration["env"] as? String) ?? ""

        let siteString = configuration["site"] as? NSString
        let site = siteString.asSite()

        let service = configuration["service"] as? NSString
        let verbosity = configuration["verbosity"] as? NSString

        let nativeCrashReportEnabled = configuration["nativeCrashReportEnabled"] as? Bool

        let nativeLongTaskRaw = configuration["nativeLongTaskThresholdMs"]
        let nativeLongTaskThresholdMs: Double? = {
            if let v = nativeLongTaskRaw as? Double { return v }
            if let v = nativeLongTaskRaw as? Int { return Double(v) }
            if let v = nativeLongTaskRaw as? Bool, v == false { return 0.0 }
            return nil
        }()

        let trackingConsentString = configuration["trackingConsent"] as? NSString
        let trackingConsent = trackingConsentString.asTrackingConsent()

        let uploadFrequency = (configuration["uploadFrequency"] as? NSString).asUploadFrequency()
        let batchSize = (configuration["batchSize"] as? NSString).asBatchSize()
        let batchProcessingLevel = (configuration["batchProcessingLevel"] as? NSString)
            .asBatchProcessingLevel()

        let proxyDict = configuration["proxyConfiguration"] as? NSDictionary
        let proxyConfiguration = proxyDict?.asProxyConfiguration()

        let firstPartyHostsArray = configuration["firstPartyHosts"] as? NSArray
        let firstPartyHosts =
            firstPartyHostsArray?.asFirstPartyHosts() ?? DefaultConfiguration.firstPartyHosts

        // MARK: - RUM configuration

        let rumDict = configuration["rumConfiguration"] as? [String: Any?]
        let rumConfiguration: RumConfiguration?

        if let rum = rumDict,
            let applicationId = rum["applicationId"] as? String,
            !applicationId.isEmpty
        {

            let longTaskRaw = rum["longTaskThresholdMs"]
            let longTaskThresholdMs: Double? = {
                if let v = longTaskRaw as? Double { return v }
                if let v = longTaskRaw as? Int { return Double(v) }
                if let v = longTaskRaw as? Bool, v == false { return 0.0 }
                return nil
            }()

            let sessionSampleRate: Double? = {
                if let v = rum["sessionSampleRate"] as? Double { return v }
                if let v = rum["sessionSampleRate"] as? Int { return Double(v) }
                return nil
            }()

            let vitalsUpdateFrequency =
                (rum["vitalsUpdateFrequency"] as? NSString).asVitalsUpdateFrequency()

            rumConfiguration = RumConfiguration(
                applicationId: applicationId,
                trackFrustrations: rum["trackFrustrations"] as? Bool
                    ?? DefaultConfiguration.trackFrustrations,
                longTaskThresholdMs: longTaskThresholdMs
                    ?? DefaultConfiguration.longTaskThresholdMs,
                sessionSampleRate: sessionSampleRate ?? DefaultConfiguration.sessionSamplingRate,
                vitalsUpdateFrequency: vitalsUpdateFrequency,
                trackBackgroundEvents: rum["trackBackgroundEvents"] as? Bool
                    ?? DefaultConfiguration.trackBackgroundEvents,
                nativeViewTracking: rum["nativeViewTracking"] as? Bool
                    ?? DefaultConfiguration.nativeViewTracking,
                nativeInteractionTracking: rum["nativeInteractionTracking"] as? Bool
                    ?? DefaultConfiguration.nativeInteractionTracking,
                appHangThreshold: rum["appHangThreshold"] as? Double,
                trackWatchdogTerminations: rum["trackWatchdogTerminations"] as? Bool
                    ?? DefaultConfiguration.trackWatchdogTerminations,
                initialResourceThreshold: rum["initialResourceThreshold"] as? Double,
                trackMemoryWarnings: rum["trackMemoryWarnings"] as? Bool
                    ?? DefaultConfiguration.trackMemoryWarnings,
                telemetrySampleRate: (rum["telemetrySampleRate"] as? Double)
                    ?? DefaultConfiguration.telemetrySampleRate,
                customEndpoint: rum["customEndpoint"] as? String
            )
        } else {
            rumConfiguration = nil
        }

        // MARK: - Logs configuration

        let logsDict = configuration["logsConfiguration"] as? [String: Any?]
        let logsConfiguration: LogsConfiguration?

        if let logs = logsDict {
            logsConfiguration = LogsConfiguration(
                bundleLogsWithRum: logs["bundleLogsWithRum"] as? Bool
                    ?? DefaultConfiguration.bundleLogsWithRum,
                bundleLogsWithTraces: logs["bundleLogsWithTraces"] as? Bool
                    ?? DefaultConfiguration.bundleLogsWithTraces,
                customEndpoint: logs["customEndpoint"] as? String
            )
        } else {
            logsConfiguration = nil
        }

        // MARK: - Trace configuration

        let traceDict = configuration["traceConfiguration"] as? [String: Any?]
        let traceConfiguration: TraceConfiguration?

        if let trace = traceDict {
            traceConfiguration = TraceConfiguration(
                resourceTraceSampleRate:
                    trace["resourceTraceSampleRate"] as? Double
                    ?? DefaultConfiguration.resourceTraceSampleRate,
                customEndpoint: trace["customEndpoint"] as? String
            )
        } else {
            traceConfiguration = nil
        }

        // MARK: - configurationForTelemetry

        let telemetryDict = configuration["configurationForTelemetry"] as? NSDictionary
        let configurationForTelemetry = telemetryDict?.asConfigurationForTelemetry()

        return DdSdkConfiguration(
            additionalConfiguration: additionalConfiguration,
            clientToken: clientToken,
            env: env,
            site: site,
            service: service,
            verbosity: verbosity,
            nativeCrashReportEnabled: nativeCrashReportEnabled
                ?? DefaultConfiguration.nativeCrashReportEnabled,
            nativeLongTaskThresholdMs: nativeLongTaskThresholdMs
                ?? DefaultConfiguration.nativeLongTaskThresholdMs,
            trackingConsent: trackingConsent,
            uploadFrequency: uploadFrequency,
            batchSize: batchSize,
            batchProcessingLevel: batchProcessingLevel,
            proxyConfiguration: proxyConfiguration,
            firstPartyHosts: firstPartyHosts,
            rumConfiguration: rumConfiguration,
            logsConfiguration: logsConfiguration,
            traceConfiguration: traceConfiguration,
            configurationForTelemetry: configurationForTelemetry
        )
    }
}

extension NSString? {
    func asTrackingConsent() -> TrackingConsent {
        switch self?.lowercased {
        case "pending":
            return .pending
        case "granted":
            return .granted
        case "not_granted":
            return .notGranted
        default:
            return .pending
        }
    }

    func asVitalsUpdateFrequency() -> RUM.Configuration.VitalsFrequency? {
        switch self?.lowercased {
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

    func asUploadFrequency() -> Datadog.Configuration.UploadFrequency {
        switch self?.lowercased {
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

    func asBatchSize() -> Datadog.Configuration.BatchSize {
        switch self?.lowercased {
        case "small":
            return .small
        case "medium":
            return .medium
        case "large":
            return .large
        default:
            return .medium
        }
    }

    func asSite() -> DatadogSite {
        switch self?.lowercased {
        case "us1", "us":
            return .us1
        case "eu1", "eu":
            return .eu1
        case "us3":
            return .us3
        case "us5":
            return .us5
        case "us1_fed", "gov":
            return .us1_fed
        case "ap1":
            return .ap1
        case "ap2":
            return .ap2
        default:
            return .us1
        }
    }

    func asBatchProcessingLevel() -> Datadog.Configuration.BatchProcessingLevel {
        switch self?.lowercased {
        case "low":
            return .low
        case "medium":
            return .medium
        case "high":
            return .high
        default:
            return .medium
        }
    }
}
