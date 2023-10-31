/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2020 Datadog, Inc.
 */

import XCTest
@testable import DatadogSDKReactNative
@testable import DatadogCore
@testable import DatadogRUM
@testable import DatadogInternal
@testable import DatadogLogs
@testable import DatadogTrace
@testable import DatadogCrashReporting
import DatadogLogs

final class DispatchQueueMock: DispatchQueueType {
    func async(execute work: @escaping @convention(block) () -> Void) {
        work()
    }
    
    func isSameQueue(queue: DispatchQueueType) -> Bool {
        guard let queueAsMock = queue as? DispatchQueueMock else {
            return false
        }
        return self === queueAsMock
    }
}

internal class DdSdkTests: XCTestCase {
    private func mockResolve(args: Any?) {}
    private func mockReject(args: String?, arg: String?, err: Error?) {}

    func testSDKInitialization() {
        let originalConsolePrint = consolePrint
        defer { consolePrint = originalConsolePrint }

        var printedMessage = ""
        consolePrint = { msg in printedMessage += msg }

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(configuration: .mockAny(), resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(printedMessage, "")

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(configuration: .mockAny(), resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(printedMessage, "Datadog SDK is already initialized, skipping initialization.")

        Datadog.internalFlushAndDeinitialize()
    }

    func testBuildConfigurationNoUIKitViewsByDefault() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.uiKitViewsPredicate)
    }

    func testBuildConfigurationUIKitViewsTrackingDisabled() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.native_view_tracking": false])

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.uiKitViewsPredicate)
    }

    func testBuildConfigurationUIKitViewsTrackingEnabled() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.native_view_tracking": true])

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        XCTAssertNotNil(ddConfig.uiKitViewsPredicate)
    }
    
    func testBuildConfigurationNoUIKitUserActionsByDefault() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.uiKitActionsPredicate)
    }

    func testBuildConfigurationUIKitUserActionsTrackingDisabled() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.native_interaction_tracking": false])

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.uiKitActionsPredicate)
    }

    func testBuildConfigurationUIKitUserActionsTrackingEnabled() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.native_interaction_tracking": true])

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        XCTAssertNotNil(ddConfig.uiKitActionsPredicate)
    }

    func testSDKInitializationWithVerbosityDebug() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: ["_dd.sdk_verbosity": "debug"])

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(Datadog.verbosityLevel, CoreLoggerLevel.debug)

        Datadog.internalFlushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityInfo() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: ["_dd.sdk_verbosity": "info"])

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(Datadog.verbosityLevel, CoreLoggerLevel.debug)

        Datadog.internalFlushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityWarn() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: ["_dd.sdk_verbosity": "warn"])

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(Datadog.verbosityLevel, CoreLoggerLevel.warn)

        Datadog.internalFlushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityError() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: ["_dd.sdk_verbosity": "error"])

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(Datadog.verbosityLevel, CoreLoggerLevel.error)

        Datadog.internalFlushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityNil() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: nil)

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertNil(Datadog.verbosityLevel)

        Datadog.internalFlushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityUnknown() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: ["_dd.sdk_verbosity": "foo"])

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertNil(Datadog.verbosityLevel)

        Datadog.internalFlushAndDeinitialize()
    }
    
    func testEnableAllFeatures() {
        let core = MockDatadogCore()
        let configuration: DdSdkConfiguration = .mockAny()

        DdSdkImplementation().enableFeatures(sdkConfiguration: configuration, core: core)
        
        XCTAssertNotNil(core.features[RUMFeature.name])
        XCTAssertNotNil(core.features[LogsFeature.name])
        XCTAssertNotNil(core.features[TraceFeature.name])
    }

    func testBuildConfigurationDefaultEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .us1)
    }

    func testBuildConfigurationUSEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US")

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .us1)
    }

    func testBuildConfigurationUS1Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US1")

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .us1)
    }

    func testBuildConfigurationUS3Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US3")

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .us3)
    }

    func testBuildConfigurationUS5Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US5")

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .us5)
    }

    func testBuildConfigurationUS1FEDEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US1_FED")

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .us1_fed)
    }

    func testBuildConfigurationGOVEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "GOV")

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .us1_fed)
    }

    func testBuildConfigurationEUEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "EU")

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .eu1)
    }

    func testBuildConfigurationEU1Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "EU1")

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .eu1)
    }

    func testBuildConfigurationAP1Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "AP1")

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .ap1)
    }

    func testBuildConfigurationAdditionalConfig() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["foo": "test", "bar": 42])

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        // swiftlint:disable force_cast
        XCTAssertEqual(ddConfig.additionalConfiguration["foo"] as! String, "test")
        XCTAssertEqual(ddConfig.additionalConfiguration["bar"] as! Int, 42)
        // swiftlint:enable force_cast
    }

    func testBuildConfigurationWithNilServiceNameByDefault() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.service)
    }

    func testBuildConfigurationWithServiceName() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.service_name": "com.example.app"])

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.service, "com.example.app")
    }

    func testBuildConfigurationNoCrashReportByDefault() {
        let core = MockDatadogCore()
        let configuration: DdSdkConfiguration = .mockAny(nativeCrashReportEnabled: nil)

        DdSdkImplementation().enableFeatures(sdkConfiguration: configuration, core: core)
        
        XCTAssertNil(core.features[CrashReportingFeature.name])
    }

    func testBuildConfigurationNoCrashReport() {
        let core = MockDatadogCore()
        let configuration: DdSdkConfiguration = .mockAny(nativeCrashReportEnabled: false)

        DdSdkImplementation().enableFeatures(sdkConfiguration: configuration, core: core)
        
        XCTAssertNil(core.features[CrashReportingFeature.name])
    }

    func testBuildConfigurationWithCrashReport() {
        let core = MockDatadogCore()
        let configuration: DdSdkConfiguration = .mockAny(nativeCrashReportEnabled: true)

        DdSdkImplementation().enableFeatures(sdkConfiguration: configuration, core: core)
        
        XCTAssertNotNil(core.features[CrashReportingFeature.name])
    }
    
    func testBuildConfigurationWithVersionSuffix() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.version_suffix": ":codepush-3"])

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration, defaultAppVersion: "1.2.3")

        XCTAssertEqual(ddConfig.additionalConfiguration["_dd.version"] as! String, "1.2.3:codepush-3")
    }
    
    func testBuildConfigurationFrustrationTrackingEnabledByDefault() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.trackFrustrations, true)
    }
    
    func testBuildConfigurationFrustrationTrackingEnabledExplicitly() {
        let configuration: DdSdkConfiguration = .mockAny(trackFrustrations: true)

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.trackFrustrations, true)
    }
    
    func testBuildConfigurationFrustrationTrackingDisabled() {
        let configuration: DdSdkConfiguration = .mockAny(trackFrustrations: false)

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.trackFrustrations, false)
    }

    func testSettingUserInfo() throws {
        let bridge = DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        )
        bridge.initialize(configuration: .mockAny(), resolve: mockResolve, reject: mockReject)

        bridge.setUser(
            user: NSDictionary(
                dictionary: [
                    "id": "abc-123",
                    "name": "John Doe",
                    "email": "john@doe.com",
                    "extra-info-1": 123,
                    "extra-info-2": "abc",
                    "extra-info-3": true
                ]
            ),
            resolve: mockResolve,
            reject: mockReject
        )

        let ddContext = try XCTUnwrap(CoreRegistry.default as? DatadogCore).contextProvider.read()
        let userInfo = try XCTUnwrap(ddContext.userInfo)

        XCTAssertEqual(userInfo.id, "abc-123")
        XCTAssertEqual(userInfo.name, "John Doe")
        XCTAssertEqual(userInfo.email, "john@doe.com")
        XCTAssertEqual(userInfo.extraInfo["extra-info-1"] as? Int64, 123)
        XCTAssertEqual(userInfo.extraInfo["extra-info-2"] as? String, "abc")
        XCTAssertEqual(userInfo.extraInfo["extra-info-3"] as? Bool, true)

        Datadog.internalFlushAndDeinitialize()
    }

    func testSettingAttributes() {
        let rumMonitorMock = MockRUMMonitor()
        let bridge = DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { rumMonitorMock },
            RUMMonitorInternalProvider: { nil }
        )
        bridge.initialize(configuration: .mockAny(), resolve: mockResolve, reject: mockReject)

        bridge.setAttributes(
            attributes: NSDictionary(
                dictionary: [
                    "attribute-1": 123,
                    "attribute-2": "abc",
                    "attribute-3": true
                ]
            ),
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertEqual(rumMonitorMock.addedAttributes["attribute-1"] as? Int64, 123)
        XCTAssertEqual(rumMonitorMock.addedAttributes["attribute-2"] as? String, "abc")
        XCTAssertEqual(rumMonitorMock.addedAttributes["attribute-3"] as? Bool, true)

        XCTAssertEqual(GlobalState.globalAttributes["attribute-1"] as? Int64, 123)
        XCTAssertEqual(GlobalState.globalAttributes["attribute-2"] as? String, "abc")
        XCTAssertEqual(GlobalState.globalAttributes["attribute-3"] as? Bool, true)

        GlobalState.globalAttributes.removeAll()
        Datadog.internalFlushAndDeinitialize()
    }

    func testBuildTrackingConsentPending() {
        let consent: NSString? = "pending"
        let trackingConsent = DdSdkImplementation().buildTrackingConsent(consent: consent)

        XCTAssertEqual(trackingConsent, TrackingConsent.pending)
    }

    func testBuildTrackingConsentGranted() {
        let consent: NSString? = "granted"
        let trackingConsent = DdSdkImplementation().buildTrackingConsent(consent: consent)

        XCTAssertEqual(trackingConsent, TrackingConsent.granted)
    }

    func testBuildTrackingConsentNotGranted() {
        let consent: NSString? = "not_granted"
        let trackingConsent = DdSdkImplementation().buildTrackingConsent(consent: consent)

        XCTAssertEqual(trackingConsent, TrackingConsent.notGranted)
    }

    func testBuildTrackingConsentNil() {
        let consent: NSString? = nil
        let trackingConsent = DdSdkImplementation().buildTrackingConsent(consent: consent)

        XCTAssertEqual(trackingConsent, TrackingConsent.pending)
    }

    func testBuildLongTaskThreshold() {
        let configuration: DdSdkConfiguration = .mockAny(nativeLongTaskThresholdMs: 2_500)

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.longTaskThreshold, 2.5)
    }
    
    func testBuildNoLongTaskTracking() {
        let configuration: DdSdkConfiguration = .mockAny(nativeLongTaskThresholdMs: 0)

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.longTaskThreshold, nil)
    }

    func testBuildFirstPartyHosts() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.first_party_hosts": [
            ["match": "example.com", "propagatorTypes": ["datadog", "b3"]],
            ["match": "datadog.com",  "propagatorTypes": ["b3multi", "tracecontext"]]
        ]])

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        let expectedFirstPartyHosts: [String: Set<TracingHeaderType>]? = ["example.com": [.datadog, .b3], "datadog.com": [.b3multi, .tracecontext]]
        var actualFirstPartyHosts: [String: Set<TracingHeaderType>]?
        switch ddConfig.urlSessionTracking?.firstPartyHostsTracing {
            case .trace(_,_): break
            case let .traceWithHeaders(hostsWithHeaders, _):
                return actualFirstPartyHosts = hostsWithHeaders
            case .none: break
        }

        XCTAssertEqual(actualFirstPartyHosts, expectedFirstPartyHosts)
    }
    
    func testBuildMalformedFirstPartyHosts() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.first_party_hosts": [
            ["match": "example.com", "propagatorTypes": ["badPropagatorType", "b3"]],
        ]])

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)
        
        let expectedFirstPartyHosts: [String: Set<TracingHeaderType>]? = ["example.com": [.b3]]
        var actualFirstPartyHosts: [String: Set<TracingHeaderType>]?
        switch ddConfig.urlSessionTracking?.firstPartyHostsTracing {
            case .trace(_,_): break
            case let .traceWithHeaders(hostsWithHeaders, _):
                return actualFirstPartyHosts = hostsWithHeaders
            case .none: break
        }

        XCTAssertEqual(actualFirstPartyHosts, expectedFirstPartyHosts)
    }
    
    func testBuildFirstPartyHostsWithDuplicatedMatchKey() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.first_party_hosts": [
            ["match": "example.com", "propagatorTypes": ["b3"]],
            ["match": "example.com", "propagatorTypes": ["tracecontext"]],
        ]])

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)
        
        let expectedFirstPartyHosts: [String: Set<TracingHeaderType>]? = ["example.com": [.b3, .tracecontext]]
        var actualFirstPartyHosts: [String: Set<TracingHeaderType>]?
        switch ddConfig.urlSessionTracking?.firstPartyHostsTracing {
            case .trace(_,_): break
            case let .traceWithHeaders(hostsWithHeaders, _):
                return actualFirstPartyHosts = hostsWithHeaders
            case .none: break
        }

        XCTAssertEqual(actualFirstPartyHosts, expectedFirstPartyHosts)
    }

    func testBuildTelemetrySampleRate() {
        let configuration: DdSdkConfiguration = .mockAny(telemetrySampleRate: 42.0)

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.telemetrySampleRate, 42.0)
    }

    func testBuildProxyConfiguration() {
        let configuration: NSMutableDictionary = [
            "_dd.proxy.address": "host",
            "_dd.proxy.port": 99,
            "_dd.proxy.username": "username",
            "_dd.proxy.password": "pwd"
        ]

        var proxy = DdSdkImplementation().buildProxyConfiguration(config: configuration)

        XCTAssertEqual(proxy?[kCFProxyUsernameKey] as? String, "username")
        XCTAssertEqual(proxy?[kCFProxyPasswordKey] as? String, "pwd")

        configuration.setValue("http", forKey: "_dd.proxy.type")
        proxy = DdSdkImplementation().buildProxyConfiguration(config: configuration)
        XCTAssertEqual(proxy?["HTTPEnable"] as? Int, 1)
        XCTAssertEqual(proxy?["HTTPProxy"] as? String, "host")
        XCTAssertEqual(proxy?["HTTPPort"] as? Int, 99)
        XCTAssertEqual(proxy?["HTTPSEnable"] as? Int, 1)
        XCTAssertEqual(proxy?["HTTPSProxy"] as? String, "host")
        XCTAssertEqual(proxy?["HTTPSPort"] as? Int, 99)

        configuration.setValue("https", forKey: "_dd.proxy.type")
        proxy = DdSdkImplementation().buildProxyConfiguration(config: configuration)
        XCTAssertEqual(proxy?["HTTPEnable"] as? Int, 1)
        XCTAssertEqual(proxy?["HTTPProxy"] as? String, "host")
        XCTAssertEqual(proxy?["HTTPPort"] as? Int, 99)
        XCTAssertEqual(proxy?["HTTPSEnable"] as? Int, 1)
        XCTAssertEqual(proxy?["HTTPSProxy"] as? String, "host")
        XCTAssertEqual(proxy?["HTTPSPort"] as? Int, 99)

        configuration.setValue("socks", forKey: "_dd.proxy.type")
        proxy = DdSdkImplementation().buildProxyConfiguration(config: configuration)
        XCTAssertEqual(proxy?["SOCKSEnable"] as? Int, 1)
        XCTAssertEqual(proxy?["SOCKSProxy"] as? String, "host")
        XCTAssertEqual(proxy?["SOCKSPort"] as? Int, 99)

        configuration.setValue("99", forKey: "_dd.proxy.port")
        proxy = DdSdkImplementation().buildProxyConfiguration(config: configuration)
        XCTAssertEqual(proxy?["SOCKSPort"] as? NSNumber, 99)
    }

    func testProxyConfiguration() {
        let configuration: DdSdkConfiguration = .mockAny(
            additionalConfig: [
                "_dd.proxy.address": "host",
                "_dd.proxy.port": 99,
                "_dd.proxy.type": "http",
                "_dd.proxy.username": "username",
                "_dd.proxy.password": "pwd"
            ]
        )

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.proxyConfiguration?["HTTPProxy"] as? String, "host")
        XCTAssertEqual(ddConfig.proxyConfiguration?["HTTPPort"] as? NSNumber, 99)
        XCTAssertEqual(ddConfig.proxyConfiguration?[kCFProxyUsernameKey] as? String, "username")
        XCTAssertEqual(ddConfig.proxyConfiguration?[kCFProxyPasswordKey] as? String, "pwd")
    }

    func testBuildConfigurationAverageVitalsUpdateFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(vitalsUpdateFrequency: "average")

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.vitalsUpdateFrequency, .average)
    }

    func testBuildConfigurationNeverVitalsUpdateFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(vitalsUpdateFrequency: "never")

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.vitalsUpdateFrequency, nil)
    }

    func testBuildConfigurationAverageUploadFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(uploadFrequency: "AVERAGE")

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.uploadFrequency, .average)
    }

    func testBuildConfigurationFrequentUploadFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(uploadFrequency: "FREQUENT")

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.uploadFrequency, .frequent)
    }

    func testBuildConfigurationRareUploadFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(uploadFrequency: "RARE")

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.uploadFrequency, .rare)
    }

    func testBuildConfigurationMediumBatchSize() {
        let configuration: DdSdkConfiguration = .mockAny(batchSize: "MEDIUM")

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.batchSize, .medium)
    }

    func testBuildConfigurationLargeBatchSize() {
        let configuration: DdSdkConfiguration = .mockAny(batchSize: "LARGE")

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.batchSize, .large)
    }

    func testBuildConfigurationSmallBatchSize() {
        let configuration: DdSdkConfiguration = .mockAny(batchSize: "SMALL")

        let ddConfig = DdSdkImplementation().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.batchSize, .small)
    }
    
    func testJsRefreshRateInitializationWithLongTaskDisabled() {
        let mockRefreshRateMonitor = MockJSRefreshRateMonitor()
        let rumMonitorMock = MockRUMMonitor()

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: mockRefreshRateMonitor,
            RUMMonitorProvider: { rumMonitorMock },
            RUMMonitorInternalProvider: { rumMonitorMock._internalMock }
        ).initialize(configuration: .mockAny(longTaskThresholdMs: 0.0), resolve: mockResolve, reject: mockReject)

        XCTAssertTrue(mockRefreshRateMonitor.isStarted)

        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.20)
        XCTAssertEqual(rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds], 0.20)
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.count, 0)

        Datadog.internalFlushAndDeinitialize()
    }

    func testJsRefreshRateInitializationNeverVitalsUpdateFrequency() {
        let mockRefreshRateMonitor = MockJSRefreshRateMonitor()
        let rumMonitorMock = MockRUMMonitor()

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: mockRefreshRateMonitor,
            RUMMonitorProvider: { rumMonitorMock },
            RUMMonitorInternalProvider: { rumMonitorMock._internalMock }
        ).initialize(configuration: .mockAny(longTaskThresholdMs: 0.0, vitalsUpdateFrequency: "never"), resolve: mockResolve, reject: mockReject)

        XCTAssertFalse(mockRefreshRateMonitor.isStarted)

        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.20)
        XCTAssertEqual(rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds], nil)
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.count, 0)

        Datadog.internalFlushAndDeinitialize()
    }
    
    func testJsLongTaskCollectionWithRefreshRateInitializationNeverVitalsUpdateFrequency() {
        let mockRefreshRateMonitor = MockJSRefreshRateMonitor()
        let rumMonitorMock = MockRUMMonitor()

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: mockRefreshRateMonitor,
            RUMMonitorProvider: { rumMonitorMock },
            RUMMonitorInternalProvider: { rumMonitorMock._internalMock }
        ).initialize(configuration: .mockAny(longTaskThresholdMs: 0.2, vitalsUpdateFrequency: "never"), resolve: mockResolve, reject: mockReject)

        XCTAssertTrue(mockRefreshRateMonitor.isStarted)

        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.25)
        XCTAssertEqual(rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds], nil)
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.count, 1)
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.first?.value, 0.25)

        Datadog.internalFlushAndDeinitialize()
    }
    
    func testJsLongTaskCollection() {
        let mockRefreshRateMonitor = MockJSRefreshRateMonitor()
        let rumMonitorMock = MockRUMMonitor()

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: mockRefreshRateMonitor,
            RUMMonitorProvider: { rumMonitorMock },
            RUMMonitorInternalProvider: { rumMonitorMock._internalMock }
        ).initialize(configuration: .mockAny(longTaskThresholdMs: 200, vitalsUpdateFrequency: "average"), resolve: mockResolve, reject: mockReject)

        XCTAssertTrue(mockRefreshRateMonitor.isStarted)
        
        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.05)
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.count, 0)

        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.25)
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.count, 1)
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.first?.value, 0.25)
        XCTAssertEqual(rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds], 0.25)

        Datadog.internalFlushAndDeinitialize()
    }

    func testBackgroundTrackingEnabled() {
        let configuration: DdSdkConfiguration = .mockAny(trackBackgroundEvents: true)

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.trackBackgroundEvents, true)
    }

    func testBackgroundTrackingDisabled() {
        let configuration: DdSdkConfiguration = .mockAny(trackBackgroundEvents: false)

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.trackBackgroundEvents, false)
    }

    func testBackgroundTrackingUndefined() {
        let configuration: DdSdkConfiguration = .mockAny(trackBackgroundEvents: nil)

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.trackBackgroundEvents, false)
    }

    func testConfigurationTelemetryOverride() throws {
        let core = MockDatadogCore()
        let configuration: DdSdkConfiguration = .mockAny(
            nativeCrashReportEnabled: false,
            nativeLongTaskThresholdMs: 0.0,
            longTaskThresholdMs: 0.1,
            configurationForTelemetry: ["initializationType": "LEGACY", "trackErrors": true, "trackInteractions": true, "trackNetworkRequests": true, "reactVersion": "18.2.0", "reactNativeVersion": "0.71.0"]
        )
        
        DdSdkImplementation().overrideReactNativeTelemetry(rnConfiguration: configuration, core: core)

        XCTAssertEqual(core.configuration?.initializationType, "LEGACY")
        XCTAssertEqual(core.configuration?.trackErrors, true)
        XCTAssertEqual(core.configuration?.trackInteractions, true)
        XCTAssertEqual(core.configuration?.trackNetworkRequests, true)
        XCTAssertEqual(core.configuration?.trackNativeErrors, false)
        XCTAssertEqual(core.configuration?.trackNativeLongTasks, false)
        XCTAssertEqual(core.configuration?.trackLongTask, true)
        XCTAssertEqual(core.configuration?.reactVersion, "18.2.0")
        XCTAssertEqual(core.configuration?.reactNativeVersion, "0.71.0")
    }

    func testDropsResourceMarkedAsDropped() throws {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        let resourceEventMapper = try XCTUnwrap(ddConfig.resourceEventMapper)

        let mockDroppedResourceEvent = RUMResourceEvent.mockRandomDropped()
        let mappedDroppedEvent = resourceEventMapper(mockDroppedResourceEvent)
        XCTAssertNil(mappedDroppedEvent)

        let mockResourceEvent = RUMResourceEvent.mockRandom()
        let mappedEvent = resourceEventMapper(mockResourceEvent)
        XCTAssertNotNil(mappedEvent)
    }

    func testDropsActionMarkedAsDropped() throws {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkImplementation().buildRUMConfiguration(configuration: configuration)

        let actionEventMapper = try XCTUnwrap(ddConfig.actionEventMapper)

        let mockDroppedActionEvent = RUMActionEvent.mockRandomDropped()
        let mappedDroppedEvent = actionEventMapper(mockDroppedActionEvent)
        XCTAssertNil(mappedDroppedEvent)

        let mockActionEvent = RUMActionEvent.mockRandom()
        let mappedEvent = actionEventMapper(mockActionEvent)
        XCTAssertNotNil(mappedEvent)
    }

    func testReactNativeThreadMonitorsRunOnBridge() throws {
        let bridge = DispatchQueueMock()
        let mockJSRefreshRateMonitor = MockJSRefreshRateMonitor()

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: bridge,
            jsRefreshRateMonitor: mockJSRefreshRateMonitor,
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(configuration: .mockAny(longTaskThresholdMs: 0.2), resolve: mockResolve, reject: mockReject)

        XCTAssertTrue(bridge.isSameQueue(queue: mockJSRefreshRateMonitor.jsQueue!))

        Datadog.internalFlushAndDeinitialize()
    }

    func testConsumeWebviewEventBeforeInitialization() throws {
        XCTAssertNoThrow(try DdSdkImplementation().consumeWebviewEvent(message: "TestMessage", resolve: mockResolve, reject: mockReject))
    }

    func testConsumeWebviewEvent() throws {
        let sdk = DdSdkImplementation()
        let configuration: DdSdkConfiguration = .mockAny()
        let core = MockDatadogCore()

        sdk.enableFeatures(sdkConfiguration: configuration, core: core)
        
        sdk.consumeWebviewEvent(message: "{\"eventType\":\"RUM\",\"event\":{\"blabla\":\"custom message\"}}", resolve: mockResolve, reject: mockReject)
        
        XCTAssertNotNil(core.baggages["browser-rum-event"])
    }
}

private final class MockJSRefreshRateMonitor: RefreshRateMonitor {
    private var refreshRateListener: RefreshRateListener?
    private var frameTimeCallback: frame_time_callback?
    var isStarted: Bool = false
    private(set) var jsQueue: DispatchQueueType?
    
    init() {}
    
    public func startMonitoring(jsQueue: DispatchQueueType, frameTimeCallback: @escaping frame_time_callback) {
        self.frameTimeCallback = frameTimeCallback
        self.jsQueue = jsQueue
        isStarted = true
    }
    
    func executeFrameCallback(frameTime: TimeInterval) {
        self.frameTimeCallback?(frameTime)
    }
}

extension DdSdkConfiguration {
    static func mockAny(
        clientToken: NSString = "client-token",
        env: NSString = "env",
        applicationId: NSString = "app-id",
        nativeCrashReportEnabled: Bool? = nil,
        nativeLongTaskThresholdMs: Double? = nil,
        longTaskThresholdMs: Double = 0.0,
        sampleRate: Double = 75.0,
        site: NSString? = nil,
        trackingConsent: NSString = "pending",
        telemetrySampleRate: Double = 45.0,
        vitalsUpdateFrequency: NSString = "average",
        trackFrustrations: Bool? = nil,
        additionalConfig: NSDictionary? = nil,
        configurationForTelemetry: NSDictionary? = nil,
        uploadFrequency: NSString = "AVERAGE",
        batchSize: NSString = "MEDIUM",
        trackBackgroundEvents: Bool? = nil
    ) -> DdSdkConfiguration {
        DdSdkConfiguration(
            clientToken: clientToken as String,
            env: env as String,
            applicationId: applicationId as String,
            nativeCrashReportEnabled: nativeCrashReportEnabled,
            nativeLongTaskThresholdMs: nativeLongTaskThresholdMs,
            longTaskThresholdMs: longTaskThresholdMs,
            sampleRate: sampleRate,
            site: site,
            trackingConsent: trackingConsent,
            telemetrySampleRate: telemetrySampleRate,
            vitalsUpdateFrequency: vitalsUpdateFrequency,
            trackFrustrations: trackFrustrations,
            uploadFrequency: uploadFrequency,
            batchSize: batchSize,
            trackBackgroundEvents: trackBackgroundEvents,
            additionalConfig: additionalConfig,
            configurationForTelemetry: configurationForTelemetry?.asConfigurationForTelemetry()
        )
    }
}

extension NSDictionary {
    static func mockAny(
        clientToken: NSString = "client-token",
        env: NSString = "env",
        applicationId: NSString = "app-id",
        nativeCrashReportEnabled: Bool? = nil,
        nativeLongTaskThresholdMs: Double? = nil,
        longTaskThresholdMs: Double = 0.0,
        sampleRate: Double = 75.0,
        site: NSString? = nil,
        trackingConsent: NSString = "pending",
        telemetrySampleRate: Double = 45.0,
        vitalsUpdateFrequency: NSString = "average",
        additionalConfig: NSDictionary? = nil,
        configurationForTelemetry: NSDictionary? = nil,
        uploadFrequency: NSString = "AVERAGE",
        batchSize: NSString = "MEDIUM",
        trackBackgroundEvents: Bool? = nil
    ) -> NSDictionary {
        NSDictionary(
            dictionary: [
                "clientToken": clientToken,
                "env": env,
                "applicationId": applicationId,
                "nativeCrashReportEnabled": nativeCrashReportEnabled,
                "nativeLongTaskThresholdMs": nativeLongTaskThresholdMs,
                "longTaskThresholdMs": longTaskThresholdMs,
                "sampleRate": sampleRate,
                "site": site,
                "trackingConsent": trackingConsent,
                "telemetrySampleRate": telemetrySampleRate,
                "vitalsUpdateFrequency": vitalsUpdateFrequency,
                "additionalConfig": additionalConfig,
                "configurationForTelemetry": configurationForTelemetry,
                "trackBackgroundEvents": trackBackgroundEvents,
                "uploadFrequency": uploadFrequency,
                "batchSize": batchSize
            ]
        )
    }
}

extension DdSdkImplementation {
    internal override convenience init() {
        self.init(
            mainDispatchQueue: DispatchQueue.main,
            jsDispatchQueue: DispatchQueue.main,
            jsRefreshRateMonitor: JSRefreshRateMonitor.init(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        )
    }
}

internal class MockDatadogCore: DatadogCoreProtocol {
    func set(baggage: @escaping () -> DatadogInternal.FeatureBaggage?, forKey key: String) {}
    
    func send(message: FeatureMessage, else fallback: @escaping () -> Void) {
        if  // Configuration Telemetry Message
            case .telemetry(let telemetry) = message,
            case .configuration(let configuration) = telemetry {
            self.configuration = configuration
        }
        
        if case .baggage(let key, let baggage) = message {
            self.baggages[key] = baggage
        }
    }
   
    private(set) var configuration: ConfigurationTelemetry?
    private(set) var features: [String: DatadogFeature] = [:]
    private(set) var baggages: [String: Any] = [:]

    func register<T>(feature: T) throws where T : DatadogFeature {
        features[T.name] = feature
    }
    
    func get<T>(feature type: T.Type) -> T? where T : DatadogFeature {
        return nil
    }
    
    func scope(for feature: String) -> FeatureScope? {
        return nil
    }
    
    func set(feature: String, attributes: @escaping () -> FeatureBaggage) {}
    
    func update(feature: String, attributes: @escaping () -> FeatureBaggage) {}
}
