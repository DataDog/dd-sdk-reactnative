/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import DatadogCore
import DatadogRUM
import DatadogInternal
import Foundation

extension NSDictionary {

    func asDdSdkConfiguration() -> DdSdkConfiguration {
        let clientToken = object(forKey: "clientToken") as? String
        let env = object(forKey: "env") as? String
        let applicationId = object(forKey: "applicationId") as? String
        let nativeCrashReportEnabled = object(forKey: "nativeCrashReportEnabled") as? Bool
        let nativeLongTaskThresholdMs = object(forKey: "nativeLongTaskThresholdMs") as? Double
        let longTaskThresholdMs = object(forKey: "longTaskThresholdMs") as? Double
        let sampleRate = object(forKey: "sampleRate") as? Double
        let site = object(forKey: "site") as? NSString
        let trackingConsent = object(forKey: "trackingConsent") as? NSString
        let telemetrySampleRate = object(forKey: "telemetrySampleRate") as? Double
        let vitalsUpdateFrequency = object(forKey: "vitalsUpdateFrequency") as? NSString
        let trackFrustrations = object(forKey: "trackFrustrations") as? Bool
        let uploadFrequency = object(forKey: "uploadFrequency") as? NSString
        let batchSize = object(forKey: "batchSize") as? NSString
        let trackBackgroundEvents = object(forKey: "trackBackgroundEvents") as? Bool
        let customEndpoints = object(forKey: "customEndpoints") as? NSDictionary
        let additionalConfig = object(forKey: "additionalConfiguration") as? NSDictionary
        let configurationForTelemetry = object(forKey: "configurationForTelemetry") as? NSDictionary
        let nativeViewTracking = object(forKey: "nativeViewTracking") as? Bool
        let nativeInteractionTracking = object(forKey: "nativeInteractionTracking") as? Bool
        let verbosity = object(forKey: "verbosity") as? NSString
        let proxyConfig = object(forKey: "proxyConfig") as? NSDictionary
        let serviceName = object(forKey: "serviceName") as? NSString
        let firstPartyHosts = object(forKey: "firstPartyHosts") as? NSArray
        let resourceTracingSamplingRate = object(forKey: "resourceTracingSamplingRate") as? Double

        return DdSdkConfiguration(
            clientToken: (clientToken != nil) ? clientToken! : String(),
            env: (env != nil) ? env! : String(),
            applicationId: (applicationId != nil) ? applicationId! : String(),
            nativeCrashReportEnabled: nativeCrashReportEnabled,
            nativeLongTaskThresholdMs: nativeLongTaskThresholdMs,
            longTaskThresholdMs: (longTaskThresholdMs != nil) ? longTaskThresholdMs! : Double(),
            sampleRate: sampleRate,
            site: site.asSite(),
            trackingConsent: trackingConsent.asTrackingConsent(),
            telemetrySampleRate: telemetrySampleRate,
            vitalsUpdateFrequency: vitalsUpdateFrequency.asVitalsUpdateFrequency(),
            trackFrustrations: trackFrustrations,
            uploadFrequency: uploadFrequency.asUploadFrequency(),
            batchSize: batchSize.asBatchSize(),
            trackBackgroundEvents: trackBackgroundEvents,
            customEndpoints: customEndpoints?.asCustomEndpoints(),
            additionalConfig: additionalConfig,
            configurationForTelemetry: configurationForTelemetry?.asConfigurationForTelemetry(),
            nativeViewTracking: nativeViewTracking,
            nativeInteractionTracking: nativeInteractionTracking,
            verbosity: verbosity,
            proxyConfig: proxyConfig?.asProxyConfig(),
            serviceName: serviceName,
            firstPartyHosts: firstPartyHosts?.asFirstPartyHosts(),
            resourceTracingSamplingRate: resourceTracingSamplingRate
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
    
    func asCustomEndpoints() -> CustomEndpoints {
        let rum = object(forKey: "rum") as? NSString
        let logs = object(forKey: "logs") as? NSString
        let trace = object(forKey: "trace") as? NSString
        
        return CustomEndpoints(
            rum: rum,
            logs: logs,
            trace: trace
        )
    }
    
    func asProxyConfig() -> [AnyHashable: Any]? {
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
        return reduce(into: [:], { firstPartyHosts, h in
           let host = (h as? NSDictionary)

            if let match = (host?.value(forKey: "match") as? String),
               let propagatorTypes = (host?.value(forKey: "propagatorTypes") as? NSArray) {
                if let hostPropagatorTypes = firstPartyHosts[match] {
                    firstPartyHosts[match] = hostPropagatorTypes.union(propagatorTypes.asTracingHeaderType())
                } else {
                    firstPartyHosts[match] = propagatorTypes.asTracingHeaderType()
                }
            }
        })
    }
    
    func asTracingHeaderType() -> Set<TracingHeaderType> {
        return Set(compactMap { headerType in
            switch((headerType as? String)?.lowercased()) {
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
    static let resourceTracingSamplingRate = 20.0
    static let longTaskThresholdMs = 0.0
    static let nativeLongTaskThresholdMs = 200.0
    static let nativeViewTracking = false
    static let nativeInteractionTracking = false
    static let firstPartyHosts: [String: Set<TracingHeaderType>] = [:]
    static let telemetrySampleRate = 20.0
    static let trackFrustrations = true
    static let trackBackgroundEvents = false
}

extension Dictionary where Key == String, Value == AnyObject {
    func asDdSdkConfigurationFromJSON() throws -> DdSdkConfiguration {
        guard let configuration = self["configuration"] as? Dictionary<String, Any?> else {
            throw ProgrammerError(description: "JSON configuration file is missing top-level \"configuration\" key.")
        }

        let clientToken = configuration["clientToken"] as? String
        let env = configuration["env"] as? String
        let applicationId = configuration["applicationId"] as? String
        let nativeCrashReportEnabled = configuration["nativeCrashReportEnabled"] as? Bool
        let nativeLongTaskThresholdMs = configuration["nativeLongTaskThresholdMs"] as? Double
        let longTaskThresholdMs = configuration["longTaskThresholdMs"] as? Double
        let sampleRate = configuration["sessionSamplingRate"] as? Double
        let site = configuration["site"] as? NSString
        let trackingConsent = configuration["trackingConsent"] as? NSString
        let telemetrySampleRate = configuration["telemetrySampleRate"] as? Double
        let vitalsUpdateFrequency = configuration["vitalsUpdateFrequency"] as? NSString
        let trackFrustrations = configuration["trackFrustrations"] as? Bool
        let uploadFrequency = configuration["uploadFrequency"] as? NSString
        let batchSize = configuration["batchSize"] as? NSString
        let trackBackgroundEvents = configuration["trackBackgroundEvents"] as? Bool
        let customEndpoints = configuration["customEndpoints"] as? NSDictionary
        let configurationForTelemetry = configuration["configurationForTelemetry"] as? NSDictionary
        let nativeViewTracking = configuration["nativeViewTracking"] as? Bool
        let nativeInteractionTracking = configuration["nativeInteractionTracking"] as? Bool
        let verbosity = configuration["verbosity"] as? NSString
        let proxyConfig = configuration["proxy"] as? NSDictionary
        let serviceName = configuration["serviceName"] as? NSString
        let firstPartyHosts = configuration["firstPartyHosts"] as? NSArray
        let resourceTracingSamplingRate = configuration["resourceTracingSamplingRate"] as? Double

        return DdSdkConfiguration(
            clientToken: clientToken ?? String(),
            env: env ?? String(),
            applicationId: applicationId ?? String(),
            nativeCrashReportEnabled: nativeCrashReportEnabled ?? DefaultConfiguration.nativeCrashReportEnabled,
            nativeLongTaskThresholdMs: nativeLongTaskThresholdMs ?? DefaultConfiguration.nativeLongTaskThresholdMs,
            longTaskThresholdMs: (longTaskThresholdMs != nil) ? longTaskThresholdMs! : DefaultConfiguration.longTaskThresholdMs,
            sampleRate: sampleRate ?? DefaultConfiguration.sessionSamplingRate,
            site: site.asSite(),
            trackingConsent: trackingConsent.asTrackingConsent(),
            telemetrySampleRate: telemetrySampleRate ?? DefaultConfiguration.telemetrySampleRate,
            vitalsUpdateFrequency: vitalsUpdateFrequency.asVitalsUpdateFrequency(),
            trackFrustrations: trackFrustrations ?? DefaultConfiguration.trackFrustrations,
            uploadFrequency: uploadFrequency.asUploadFrequency(),
            batchSize: batchSize.asBatchSize(),
            trackBackgroundEvents: trackBackgroundEvents ?? DefaultConfiguration.trackBackgroundEvents,
            customEndpoints: customEndpoints?.asCustomEndpoints(),
            additionalConfig: [
                CrossPlatformAttributes.ddsource: "react-native",
                CrossPlatformAttributes.sdkVersion: SdkVersion
            ],
            configurationForTelemetry: configurationForTelemetry?.asConfigurationForTelemetry(),
            nativeViewTracking: nativeViewTracking ?? DefaultConfiguration.nativeViewTracking,
            nativeInteractionTracking: nativeInteractionTracking ?? DefaultConfiguration.nativeInteractionTracking,
            verbosity: verbosity,
            proxyConfig: proxyConfig?.asProxyConfig(),
            serviceName: serviceName,
            firstPartyHosts: firstPartyHosts?.asFirstPartyHosts() ?? DefaultConfiguration.firstPartyHosts,
            resourceTracingSamplingRate: resourceTracingSamplingRate ?? DefaultConfiguration.resourceTracingSamplingRate
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
        default:
            return .us1
        }
    }
}
