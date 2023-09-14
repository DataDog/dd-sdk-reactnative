/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2020 Datadog, Inc.
 */

import XCTest
@testable import DatadogSDKReactNative
@testable import Datadog

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

        DdSdkImplementation(mainDispatchQueue: DispatchQueueMock(), jsDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor()).initialize(configuration: .mockAny(), resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(printedMessage, "")

        DdSdkImplementation(mainDispatchQueue: DispatchQueueMock(), jsDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor()).initialize(configuration: .mockAny(), resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(printedMessage, "Datadog SDK is already initialized, skipping initialization.")

        Datadog.internalFlushAndDeinitialize()
    }

    func testBuildConfigurationNoUIKitViewsByDefault() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.rumUIKitViewsPredicate)
    }

    func testBuildConfigurationUIKitViewsTrackingDisabled() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.native_view_tracking": false])

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.rumUIKitViewsPredicate)
    }

    func testBuildConfigurationUIKitViewsTrackingEnabled() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.native_view_tracking": true])

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertNotNil(ddConfig.rumUIKitViewsPredicate)
    }
    
    func testBuildConfigurationNoUIKitUserActionsByDefault() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.rumUIKitUserActionsPredicate)
    }

    func testBuildConfigurationUIKitUserActionsTrackingDisabled() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.native_interaction_tracking": false])

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.rumUIKitUserActionsPredicate)
    }

    func testBuildConfigurationUIKitUserActionsTrackingEnabled() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.native_interaction_tracking": true])

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertNotNil(ddConfig.rumUIKitUserActionsPredicate)
    }

    func testSDKInitializationWithVerbosityDebug() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: ["_dd.sdk_verbosity": "debug"])

        DdSdkImplementation(mainDispatchQueue: DispatchQueueMock(), jsDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor()).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(Datadog.verbosityLevel, LogLevel.debug)

        Datadog.internalFlushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityInfo() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: ["_dd.sdk_verbosity": "info"])

        DdSdkImplementation(mainDispatchQueue: DispatchQueueMock(), jsDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor()).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(Datadog.verbosityLevel, LogLevel.info)

        Datadog.internalFlushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityWarn() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: ["_dd.sdk_verbosity": "warn"])

        DdSdkImplementation(mainDispatchQueue: DispatchQueueMock(), jsDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor()).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(Datadog.verbosityLevel, LogLevel.warn)

        Datadog.internalFlushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityError() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: ["_dd.sdk_verbosity": "error"])

        DdSdkImplementation(mainDispatchQueue: DispatchQueueMock(), jsDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor()).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(Datadog.verbosityLevel, LogLevel.error)

        Datadog.internalFlushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityNil() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: nil)

        DdSdkImplementation(mainDispatchQueue: DispatchQueueMock(), jsDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor()).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertNil(Datadog.verbosityLevel)

        Datadog.internalFlushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityUnknown() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: ["_dd.sdk_verbosity": "foo"])

        DdSdkImplementation(mainDispatchQueue: DispatchQueueMock(), jsDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor()).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertNil(Datadog.verbosityLevel)

        Datadog.internalFlushAndDeinitialize()
    }

    func testBuildConfigurationDefaultEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.datadogEndpoint, .us1)
    }

    func testBuildConfigurationUSEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US")

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.datadogEndpoint, .us1)
    }

    func testBuildConfigurationUS1Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US1")

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.datadogEndpoint, .us1)
    }

    func testBuildConfigurationUS3Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US3")

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.datadogEndpoint, .us3)
    }

    func testBuildConfigurationUS5Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US5")

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.datadogEndpoint, .us5)
    }

    func testBuildConfigurationUS1FEDEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US1_FED")

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.datadogEndpoint, .us1_fed)
    }

    func testBuildConfigurationGOVEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "GOV")

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.datadogEndpoint, .us1_fed)
    }

    func testBuildConfigurationEUEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "EU")

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.datadogEndpoint, .eu1)
    }

    func testBuildConfigurationEU1Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "EU1")

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.datadogEndpoint, .eu1)
    }

    func testBuildConfigurationAP1Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "AP1")

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.datadogEndpoint, .ap1)
    }

    func testBuildConfigurationAdditionalConfig() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["foo": "test", "bar": 42])

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        // swiftlint:disable force_cast
        XCTAssertEqual(ddConfig.additionalConfiguration["foo"] as! String, "test")
        XCTAssertEqual(ddConfig.additionalConfiguration["bar"] as! Int, 42)
        // swiftlint:enable force_cast
    }

    func testBuildConfigurationWithNilServiceNameByDefault() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.serviceName)
    }

    func testBuildConfigurationWithServiceName() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.service_name": "com.example.app"])

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.serviceName, "com.example.app")
    }

    func testBuildConfigurationNoCrashReportByDefault() {
        let configuration: DdSdkConfiguration = .mockAny(nativeCrashReportEnabled: nil)

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.crashReportingPlugin)
    }

    func testBuildConfigurationNoCrashReport() {
        let configuration: DdSdkConfiguration = .mockAny(nativeCrashReportEnabled: false)

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.crashReportingPlugin)
    }

    func testBuildConfigurationWithCrashReport() {
        let configuration: DdSdkConfiguration = .mockAny(
            nativeCrashReportEnabled: true
        )

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertNotNil(ddConfig.crashReportingPlugin)
    }
    
    func testBuildConfigurationWithVersionSuffix() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.version_suffix": ":codepush-3"])

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration, defaultAppVersion: "1.2.3")

        XCTAssertEqual(ddConfig.additionalConfiguration["_dd.version"] as! String, "1.2.3:codepush-3")
    }
    
    func testBuildConfigurationFrustrationTrackingEnabledByDefault() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.rumFrustrationSignalsTrackingEnabled, true)
    }
    
    func testBuildConfigurationFrustrationTrackingEnabledExplicitly() {
        let configuration: DdSdkConfiguration = .mockAny(trackFrustrations: true)

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.rumFrustrationSignalsTrackingEnabled, true)
    }
    
    func testBuildConfigurationFrustrationTrackingDisabled() {
        let configuration: DdSdkConfiguration = .mockAny(trackFrustrations: false)

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.rumFrustrationSignalsTrackingEnabled, false)
    }

    func testSettingUserInfo() throws {
        let bridge = DdSdkImplementation(mainDispatchQueue: DispatchQueueMock(), jsDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor())
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

        let receivedUserInfo = try XCTUnwrap(defaultDatadogCore as? DatadogCore).userInfoProvider.value
        XCTAssertEqual(receivedUserInfo.id, "abc-123")
        XCTAssertEqual(receivedUserInfo.name, "John Doe")
        XCTAssertEqual(receivedUserInfo.email, "john@doe.com")
        XCTAssertEqual(receivedUserInfo.extraInfo["extra-info-1"] as? Int64, 123)
        XCTAssertEqual(receivedUserInfo.extraInfo["extra-info-2"] as? String, "abc")
        XCTAssertEqual(receivedUserInfo.extraInfo["extra-info-3"] as? Bool, true)

        Datadog.internalFlushAndDeinitialize()
    }

    func testSettingAttributes() {
        let bridge = DdSdkImplementation(mainDispatchQueue: DispatchQueueMock(), jsDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor())
        bridge.initialize(configuration: .mockAny(), resolve: mockResolve, reject: mockReject)

        let rumMonitorMock = MockRUMMonitor()
        Global.rum = rumMonitorMock

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

        XCTAssertEqual(rumMonitorMock.receivedAttributes["attribute-1"] as? Int64, 123)
        XCTAssertEqual(rumMonitorMock.receivedAttributes["attribute-2"] as? String, "abc")
        XCTAssertEqual(rumMonitorMock.receivedAttributes["attribute-3"] as? Bool, true)

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

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.rumLongTaskDurationThreshold, 2.5)
    }
    
    func testBuildNoLongTaskTracking() {
        let configuration: DdSdkConfiguration = .mockAny(nativeLongTaskThresholdMs: 0)

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.rumLongTaskDurationThreshold, nil)
    }

    func testBuildFirstPartyHosts() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.first_party_hosts": [
            ["match": "example.com", "propagatorTypes": ["datadog", "b3"]],
            ["match": "datadog.com",  "propagatorTypes": ["b3multi", "tracecontext"]]
        ]])

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)
        
        var firstPartyHosts: FirstPartyHosts? = FirstPartyHosts(["example.com": [.datadog, .b3]])
        firstPartyHosts += FirstPartyHosts(["datadog.com": [.b3multi, .tracecontext]])

        XCTAssertEqual(ddConfig.firstPartyHosts, firstPartyHosts)
    }
    
    func testBuildMalformedFirstPartyHosts() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.first_party_hosts": [
            ["match": "example.com", "propagatorTypes": ["badPropagatorType", "b3"]],
        ]])

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)
        
        let firstPartyHosts: FirstPartyHosts? = FirstPartyHosts(["example.com": [.b3]])

        XCTAssertEqual(ddConfig.firstPartyHosts, firstPartyHosts)
    }
    
    func testBuildFirstPartyHostsWithDuplicatedMatchKey() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.first_party_hosts": [
            ["match": "example.com", "propagatorTypes": ["b3"]],
            ["match": "example.com", "propagatorTypes": ["tracecontext"]],
        ]])

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)
        
        var firstPartyHosts: FirstPartyHosts? = FirstPartyHosts(["example.com": [.b3, .tracecontext]])

        XCTAssertEqual(ddConfig.firstPartyHosts, firstPartyHosts)
    }

    func testBuildTelemetrySampleRate() {
        let configuration: DdSdkConfiguration = .mockAny(telemetrySampleRate: 42.0)

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.rumTelemetrySamplingRate, 42.0)
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

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.proxyConfiguration?["HTTPProxy"] as? String, "host")
        XCTAssertEqual(ddConfig.proxyConfiguration?["HTTPPort"] as? NSNumber, 99)
        XCTAssertEqual(ddConfig.proxyConfiguration?[kCFProxyUsernameKey] as? String, "username")
        XCTAssertEqual(ddConfig.proxyConfiguration?[kCFProxyPasswordKey] as? String, "pwd")
    }

    func testBuildConfigurationAverageVitalsUpdateFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(vitalsUpdateFrequency: "average")

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.mobileVitalsFrequency, .average)
    }

    func testBuildConfigurationNeverVitalsUpdateFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(vitalsUpdateFrequency: "never")

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.mobileVitalsFrequency, .never)
    }

    func testBuildConfigurationAverageUploadFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(uploadFrequency: "AVERAGE")

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.uploadFrequency, .average)
    }

    func testBuildConfigurationFrequentUploadFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(uploadFrequency: "FREQUENT")

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.uploadFrequency, .frequent)
    }

    func testBuildConfigurationRareUploadFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(uploadFrequency: "RARE")

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.uploadFrequency, .rare)
    }

    func testBuildConfigurationMediumBatchSize() {
        let configuration: DdSdkConfiguration = .mockAny(batchSize: "MEDIUM")

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.batchSize, .medium)
    }

    func testBuildConfigurationLargeBatchSize() {
        let configuration: DdSdkConfiguration = .mockAny(batchSize: "LARGE")

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.batchSize, .large)
    }

    func testBuildConfigurationSmallBatchSize() {
        let configuration: DdSdkConfiguration = .mockAny(batchSize: "SMALL")

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.batchSize, .small)
    }
    
    func testJsRefreshRateInitializationWithLongTaskDisabled() {
        let mockRefreshRateMonitor = MockJSRefreshRateMonitor()
        let rumMonitorMock = MockRUMMonitor()

        DdSdkImplementation(mainDispatchQueue: DispatchQueueMock(), jsDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: mockRefreshRateMonitor).initialize(configuration: .mockAny(longTaskThresholdMs: 0.0), resolve: mockResolve, reject: mockReject)
        Global.rum = rumMonitorMock

        XCTAssertTrue(mockRefreshRateMonitor.isStarted)

        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.20)
        XCTAssertEqual(rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds], 0.20)
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.count, 0)

        Datadog.internalFlushAndDeinitialize()
    }

    func testJsRefreshRateInitializationNeverVitalsUpdateFrequency() {
        let mockRefreshRateMonitor = MockJSRefreshRateMonitor()
        let rumMonitorMock = MockRUMMonitor()

        DdSdkImplementation(mainDispatchQueue: DispatchQueueMock(), jsDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: mockRefreshRateMonitor).initialize(configuration: .mockAny(longTaskThresholdMs: 0.0, vitalsUpdateFrequency: "never"), resolve: mockResolve, reject: mockReject)
        Global.rum = rumMonitorMock

        XCTAssertFalse(mockRefreshRateMonitor.isStarted)

        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.20)
        XCTAssertEqual(rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds], nil)
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.count, 0)

        Datadog.internalFlushAndDeinitialize()
    }
    
    func testJsLongTaskCollectionWithRefreshRateInitializationNeverVitalsUpdateFrequency() {
        let mockRefreshRateMonitor = MockJSRefreshRateMonitor()
        let rumMonitorMock = MockRUMMonitor()

        DdSdkImplementation(mainDispatchQueue: DispatchQueueMock(), jsDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: mockRefreshRateMonitor).initialize(configuration: .mockAny(longTaskThresholdMs: 0.2, vitalsUpdateFrequency: "never"), resolve: mockResolve, reject: mockReject)
        Global.rum = rumMonitorMock

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

        DdSdkImplementation(mainDispatchQueue: DispatchQueueMock(), jsDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: mockRefreshRateMonitor).initialize(configuration: .mockAny(longTaskThresholdMs: 200, vitalsUpdateFrequency: "average"), resolve: mockResolve, reject: mockReject)
        Global.rum = rumMonitorMock

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

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.rumBackgroundEventTrackingEnabled, true)
    }

    func testBackgroundTrackingDisabled() {
        let configuration: DdSdkConfiguration = .mockAny(trackBackgroundEvents: false)

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.rumBackgroundEventTrackingEnabled, false)
    }

    func testBackgroundTrackingUndefined() {
        let configuration: DdSdkConfiguration = .mockAny(trackBackgroundEvents: nil)

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.rumBackgroundEventTrackingEnabled, false)
    }

    func testConfigurationTelemetryEventMapper() throws {
        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor())
        .initialize(
            configuration: .mockAny(
                nativeCrashReportEnabled: false,
                nativeLongTaskThresholdMs: 0.0,
                longTaskThresholdMs: 0.1,
                configurationForTelemetry: ["initializationType": "LEGACY", "trackErrors": true, "trackInteractions": true, "trackNetworkRequests": true, "reactVersion": "18.2.0", "reactNativeVersion": "0.71.0"]
            ),
            resolve: mockResolve,
            reject: mockReject
        )
        
        
        guard let configurationEventMapper = try XCTUnwrap(DD.telemetry as? RUMTelemetry).configurationEventMapper else { return }

        let mappedEvent = configurationEventMapper(
            TelemetryConfigurationEvent(
                dd: TelemetryConfigurationEvent.DD(),
                action: nil,
                application: nil,
                date: Int64(),
                experimentalFeatures: nil,
                service: "mockService",
                session: nil,
                source: .reactNative,
                telemetry: TelemetryConfigurationEvent.Telemetry(
                    configuration: TelemetryConfigurationEvent.Telemetry.Configuration(
                        actionNameAttribute: nil,
                        batchSize: nil,
                        batchUploadFrequency: nil,
                        forwardConsoleLogs: nil,
                        forwardErrorsToLogs: nil,
                        forwardReports: nil,
                        premiumSampleRate: nil,
                        replaySampleRate: nil,
                        selectedTracingPropagators: nil,
                        sessionSampleRate: nil,
                        silentMultipleInit: nil,
                        telemetryConfigurationSampleRate: nil,
                        telemetrySampleRate: nil,
                        traceSampleRate: nil,
                        trackSessionAcrossSubdomains: nil,
                        useAllowedTracingOrigins: nil,
                        useAllowedTracingUrls: nil,
                        useBeforeSend: nil,
                        useCrossSiteSessionCookie: nil,
                        useExcludedActivityUrls: nil,
                        useLocalEncryption: nil,
                        useSecureSessionCookie: nil,
                        useTracing: nil,
                        viewTrackingStrategy: nil
                    )
                ),
                version: "1.0.0",
                view: nil
            )
        )
        
        XCTAssertEqual(mappedEvent.telemetry.configuration.initializationType, "LEGACY")
        XCTAssertEqual(mappedEvent.telemetry.configuration.trackErrors, true)
        XCTAssertEqual(mappedEvent.telemetry.configuration.trackInteractions, true)
        XCTAssertEqual(mappedEvent.telemetry.configuration.trackNetworkRequests, true)
        XCTAssertEqual(mappedEvent.telemetry.configuration.trackNativeErrors, false)
        XCTAssertEqual(mappedEvent.telemetry.configuration.trackNativeLongTasks, false)
        XCTAssertEqual(mappedEvent.telemetry.configuration.trackLongTask, true)
        XCTAssertEqual(mappedEvent.telemetry.configuration.reactVersion, "18.2.0")
        XCTAssertEqual(mappedEvent.telemetry.configuration.reactNativeVersion, "0.71.0")

        Datadog.internalFlushAndDeinitialize()
    }

    func testDropsResourceMarkedAsDropped() throws {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        let resourceEventMapper = try XCTUnwrap(ddConfig.rumResourceEventMapper)

        let mockDroppedResourceEvent = RUMResourceEvent.mockRandomDropped()
        let mappedDroppedEvent = resourceEventMapper(mockDroppedResourceEvent)
        XCTAssertNil(mappedDroppedEvent)

        let mockResourceEvent = RUMResourceEvent.mockRandom()
        let mappedEvent = resourceEventMapper(mockResourceEvent)
        XCTAssertNotNil(mappedEvent)
    }

    func testDropsActionMarkedAsDropped() throws {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkImplementation().buildConfiguration(configuration: configuration)

        let actionEventMapper = try XCTUnwrap(ddConfig.rumActionEventMapper)

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

        DdSdkImplementation(mainDispatchQueue: DispatchQueueMock(), jsDispatchQueue: bridge, jsRefreshRateMonitor: mockJSRefreshRateMonitor).initialize(configuration: .mockAny(longTaskThresholdMs: 0.2), resolve: mockResolve, reject: mockReject)

        XCTAssertTrue(bridge.isSameQueue(queue: mockJSRefreshRateMonitor.jsQueue!))

        Datadog.internalFlushAndDeinitialize()
    }
}

private class MockRUMMonitor: DDRUMMonitor, RUMCommandSubscriber {
    private(set) var receivedAttributes = [AttributeKey: AttributeValue]()
    private(set) var lastReceivedPerformanceMetrics = [PerformanceMetric: Double]()
    private(set) var receivedLongTasks = [Date: TimeInterval]()

    override func addAttribute(forKey key: AttributeKey, value: AttributeValue) {
        receivedAttributes[key] = value
    }

    func process(command: RUMCommand) {
        if (command is RUMAddLongTaskCommand) {
            receivedLongTasks[(command as! RUMAddLongTaskCommand).time] = (command as! RUMAddLongTaskCommand).duration
        }
        if (command is RUMUpdatePerformanceMetric) {
            lastReceivedPerformanceMetrics[.jsFrameTimeSeconds] = (command as! RUMUpdatePerformanceMetric).value
        }
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
        self.init(mainDispatchQueue: DispatchQueue.main, jsDispatchQueue: DispatchQueue.main, jsRefreshRateMonitor: JSRefreshRateMonitor.init())
    }
    
}
