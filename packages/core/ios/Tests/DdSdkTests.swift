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
}

internal class DdSdkTests: XCTestCase {
    private func mockResolve(args: Any?) {}
    private func mockReject(args: String?, arg: String?, err: Error?) {}

    func testSDKInitialization() {
        let originalConsolePrint = consolePrint
        defer { consolePrint = originalConsolePrint }

        var printedMessage = ""
        consolePrint = { msg in printedMessage += msg }

        RNDdSdk(mainDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor()).initialize(configuration: .mockAny(), resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(printedMessage, "")

        RNDdSdk(mainDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor()).initialize(configuration: .mockAny(), resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(printedMessage, "Datadog SDK is already initialized, skipping initialization.")

        Datadog.internalFlushAndDeinitialize()
    }

    func testBuildConfigurationNoUIKitByDefault() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.rumUIKitViewsPredicate)
    }

    func testBuildConfigurationUIKitTrackingDisabled() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.native_view_tracking": false])

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.rumUIKitViewsPredicate)
    }

    func testBuildConfigurationUIKitTrackingEnabled() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.native_view_tracking": true])

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertNotNil(ddConfig.rumUIKitViewsPredicate)
    }

    func testSDKInitializationWithVerbosityDebug() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: ["_dd.sdk_verbosity": "debug"])

        RNDdSdk(mainDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor()).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(Datadog.verbosityLevel, LogLevel.debug)

        Datadog.internalFlushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityInfo() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: ["_dd.sdk_verbosity": "info"])

        RNDdSdk(mainDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor()).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(Datadog.verbosityLevel, LogLevel.info)

        Datadog.internalFlushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityWarn() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: ["_dd.sdk_verbosity": "warn"])

        RNDdSdk(mainDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor()).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(Datadog.verbosityLevel, LogLevel.warn)

        Datadog.internalFlushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityError() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: ["_dd.sdk_verbosity": "error"])

        RNDdSdk(mainDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor()).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(Datadog.verbosityLevel, LogLevel.error)

        Datadog.internalFlushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityNil() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: nil)

        RNDdSdk(mainDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor()).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertNil(Datadog.verbosityLevel)

        Datadog.internalFlushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityUnknown() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: ["_dd.sdk_verbosity": "foo"])

        RNDdSdk(mainDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor()).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertNil(Datadog.verbosityLevel)

        Datadog.internalFlushAndDeinitialize()
    }

    func testBuildConfigurationDefaultEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.datadogEndpoint, .us1)
    }

    func testBuildConfigurationUSEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US")

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.datadogEndpoint, .us1)
    }

    func testBuildConfigurationUS1Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US1")

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.datadogEndpoint, .us1)
    }

    func testBuildConfigurationUS3Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US3")

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.datadogEndpoint, .us3)
    }

    func testBuildConfigurationUS5Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US5")

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.datadogEndpoint, .us5)
    }

    func testBuildConfigurationUS1FEDEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US1_FED")

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.datadogEndpoint, .us1_fed)
    }

    func testBuildConfigurationGOVEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "GOV")

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.datadogEndpoint, .us1_fed)
    }

    func testBuildConfigurationEUEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "EU")

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.datadogEndpoint, .eu1)
    }

    func testBuildConfigurationEU1Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "EU1")

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.datadogEndpoint, .eu1)
    }

    func testBuildConfigurationAdditionalConfig() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["foo": "test", "bar": 42])

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        // swiftlint:disable force_cast
        XCTAssertEqual(ddConfig.additionalConfiguration["foo"] as! String, "test")
        XCTAssertEqual(ddConfig.additionalConfiguration["bar"] as! Int, 42)
        // swiftlint:enable force_cast
    }

    func testBuildConfigurationWithNilServiceNameByDefault() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.serviceName)
    }

    func testBuildConfigurationWithServiceName() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.service_name": "com.example.app"])

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.serviceName, "com.example.app")
    }

    func testBuildConfigurationNoCrashReportByDefault() {
        let configuration: DdSdkConfiguration = .mockAny(nativeCrashReportEnabled: nil)

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.crashReportingPlugin)
    }

    func testBuildConfigurationNoCrashReport() {
        let configuration: DdSdkConfiguration = .mockAny(nativeCrashReportEnabled: false)

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.crashReportingPlugin)
    }

    func testBuildConfigurationWithCrashReport() {
        let configuration: DdSdkConfiguration = .mockAny(
            nativeCrashReportEnabled: true
        )

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertNotNil(ddConfig.crashReportingPlugin)
    }
    
    func testBuildConfigurationWithVersionSuffix() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.version_suffix": ":codepush-3"])

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration, defaultAppVersion: "1.2.3")

        XCTAssertEqual(ddConfig.additionalConfiguration["_dd.version"] as! String, "1.2.3:codepush-3")
    }

    func testSettingUserInfo() throws {
        let bridge = RNDdSdk(mainDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor())
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
        let bridge = RNDdSdk(mainDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: JSRefreshRateMonitor())
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
        let trackingConsent = RNDdSdk().buildTrackingConsent(consent: consent)

        XCTAssertEqual(trackingConsent, TrackingConsent.pending)
    }

    func testBuildTrackingConsentGranted() {
        let consent: NSString? = "granted"
        let trackingConsent = RNDdSdk().buildTrackingConsent(consent: consent)

        XCTAssertEqual(trackingConsent, TrackingConsent.granted)
    }

    func testBuildTrackingConsentNotGranted() {
        let consent: NSString? = "not_granted"
        let trackingConsent = RNDdSdk().buildTrackingConsent(consent: consent)

        XCTAssertEqual(trackingConsent, TrackingConsent.notGranted)
    }

    func testBuildTrackingConsentNil() {
        let consent: NSString? = nil
        let trackingConsent = RNDdSdk().buildTrackingConsent(consent: consent)

        XCTAssertEqual(trackingConsent, TrackingConsent.pending)
    }

    func testBuildLongTaskThreshold() {
        let configuration: DdSdkConfiguration = .mockAny(nativeLongTaskThresholdMs: 2_500)

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.rumLongTaskDurationThreshold, 2.5)
    }
    
    func testBuildNoLongTaskTracking() {
        let configuration: DdSdkConfiguration = .mockAny(nativeLongTaskThresholdMs: 0)

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.rumLongTaskDurationThreshold, nil)
    }

    func testBuildFirstPartyHosts() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.first_party_hosts": ["example.com", "datadog.com"]])

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)
        
        var firstPartyHosts: FirstPartyHosts? = FirstPartyHosts(["example.com": [TracingHeaderType.datadog]])
        firstPartyHosts += FirstPartyHosts(["datadog.com": [TracingHeaderType.datadog]])

        XCTAssertEqual(ddConfig.firstPartyHosts, firstPartyHosts)
    }

    func testBuildTelemetrySampleRate() {
        let configuration: DdSdkConfiguration = .mockAny(telemetrySampleRate: 42.0)

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.rumTelemetrySamplingRate, 42.0)
    }

    func testBuildProxyConfiguration() {
        let configuration: NSMutableDictionary = [
            "_dd.proxy.address": "host",
            "_dd.proxy.port": 99,
            "_dd.proxy.username": "username",
            "_dd.proxy.password": "pwd"
        ]

        var proxy = RNDdSdk().buildProxyConfiguration(config: configuration)

        XCTAssertEqual(proxy?[kCFProxyUsernameKey] as? String, "username")
        XCTAssertEqual(proxy?[kCFProxyPasswordKey] as? String, "pwd")

        configuration.setValue("http", forKey: "_dd.proxy.type")
        proxy = RNDdSdk().buildProxyConfiguration(config: configuration)
        XCTAssertEqual(proxy?["HTTPEnable"] as? Int, 1)
        XCTAssertEqual(proxy?["HTTPProxy"] as? String, "host")
        XCTAssertEqual(proxy?["HTTPPort"] as? Int, 99)
        XCTAssertEqual(proxy?["HTTPSEnable"] as? Int, 1)
        XCTAssertEqual(proxy?["HTTPSProxy"] as? String, "host")
        XCTAssertEqual(proxy?["HTTPSPort"] as? Int, 99)

        configuration.setValue("https", forKey: "_dd.proxy.type")
        proxy = RNDdSdk().buildProxyConfiguration(config: configuration)
        XCTAssertEqual(proxy?["HTTPEnable"] as? Int, 1)
        XCTAssertEqual(proxy?["HTTPProxy"] as? String, "host")
        XCTAssertEqual(proxy?["HTTPPort"] as? Int, 99)
        XCTAssertEqual(proxy?["HTTPSEnable"] as? Int, 1)
        XCTAssertEqual(proxy?["HTTPSProxy"] as? String, "host")
        XCTAssertEqual(proxy?["HTTPSPort"] as? Int, 99)

        configuration.setValue("socks", forKey: "_dd.proxy.type")
        proxy = RNDdSdk().buildProxyConfiguration(config: configuration)
        XCTAssertEqual(proxy?["SOCKSEnable"] as? Int, 1)
        XCTAssertEqual(proxy?["SOCKSProxy"] as? String, "host")
        XCTAssertEqual(proxy?["SOCKSPort"] as? Int, 99)

        configuration.setValue("99", forKey: "_dd.proxy.port")
        proxy = RNDdSdk().buildProxyConfiguration(config: configuration)
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

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.proxyConfiguration?["HTTPProxy"] as? String, "host")
        XCTAssertEqual(ddConfig.proxyConfiguration?["HTTPPort"] as? NSNumber, 99)
        XCTAssertEqual(ddConfig.proxyConfiguration?[kCFProxyUsernameKey] as? String, "username")
        XCTAssertEqual(ddConfig.proxyConfiguration?[kCFProxyPasswordKey] as? String, "pwd")
    }

    func testBuildConfigurationAverageVitalsUploadFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(vitalsUpdateFrequency: "average")

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.mobileVitalsFrequency, .average)
    }

    func testBuildConfigurationNeverVitalsUploadFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(vitalsUpdateFrequency: "never")

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.mobileVitalsFrequency, .never)
    }
    
    func testJsRefreshRateInitializationWithLongTaskDisabled() {
        let mockRefreshRateMonitor = MockJSRefreshRateMonitor()
        let rumMonitorMock = MockRUMMonitor()

        RNDdSdk(mainDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: mockRefreshRateMonitor).initialize(configuration: .mockAny(longTaskThresholdMs: 0.0), resolve: mockResolve, reject: mockReject)
        Global.rum = rumMonitorMock

        XCTAssertTrue(mockRefreshRateMonitor.isStarted)

        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.20)
        XCTAssertEqual(rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds], 0.20)
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.count, 0)

        Datadog.internalFlushAndDeinitialize()
    }

    func testJsRefreshRateInitializationNeverVitalsUploadFrequency() {
        let mockRefreshRateMonitor = MockJSRefreshRateMonitor()
        let rumMonitorMock = MockRUMMonitor()

        RNDdSdk(mainDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: mockRefreshRateMonitor).initialize(configuration: .mockAny(longTaskThresholdMs: 0.0, vitalsUpdateFrequency: "never"), resolve: mockResolve, reject: mockReject)
        Global.rum = rumMonitorMock

        XCTAssertFalse(mockRefreshRateMonitor.isStarted)

        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.20)
        XCTAssertEqual(rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds], nil)
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.count, 0)

        Datadog.internalFlushAndDeinitialize()
    }
    
    func testJsLongTaskCollectionWithRefreshRateInitializationNeverVitalsUploadFrequency() {
        let mockRefreshRateMonitor = MockJSRefreshRateMonitor()
        let rumMonitorMock = MockRUMMonitor()

        RNDdSdk(mainDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: mockRefreshRateMonitor).initialize(configuration: .mockAny(longTaskThresholdMs: 0.2, vitalsUpdateFrequency: "never"), resolve: mockResolve, reject: mockReject)
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

        RNDdSdk(mainDispatchQueue: DispatchQueueMock(), jsRefreshRateMonitor: mockRefreshRateMonitor).initialize(configuration: .mockAny(longTaskThresholdMs: 200, vitalsUpdateFrequency: "average"), resolve: mockResolve, reject: mockReject)
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
    
    func testConfigurationTelemetryEventMapper() throws {
        RNDdSdk(
            mainDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor())
        .initialize(
            configuration: .mockAny(
                nativeCrashReportEnabled: false,
                nativeLongTaskThresholdMs: 0.0,
                longTaskThresholdMs: 0.1,
                configurationForTelemetry: ["initializationType": "LEGACY", "trackErrors": true, "trackInteractions": true, "trackNetworkRequests": true]
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
                        sessionSampleRate: nil,
                        silentMultipleInit: nil,
                        telemetryConfigurationSampleRate: nil,
                        telemetrySampleRate: nil,
                        traceSampleRate: nil,
                        trackSessionAcrossSubdomains: nil,
                        useAllowedTracingOrigins: nil,
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

        Datadog.internalFlushAndDeinitialize()
    }

    func testDropsResourceMarkedAsDropped() throws {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        let resourceEventMapper = try XCTUnwrap(ddConfig.rumResourceEventMapper)

        let mockDroppedResourceEvent = RUMResourceEvent.mockRandomDropped()
        let mappedDroppedEvent = resourceEventMapper(mockDroppedResourceEvent)
        XCTAssertNil(mappedDroppedEvent)

        let mockResourceEvent = RUMResourceEvent.mockRandom()
        let mappedEvent = resourceEventMapper(mockResourceEvent)
        XCTAssertNotNil(mappedEvent)
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
    
    init() {}
    
    public func startMonitoring(jsQueue: DispatchQueueType, frameTimeCallback: @escaping frame_time_callback) {
        self.frameTimeCallback = frameTimeCallback
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
        additionalConfig: NSDictionary? = nil,
        configurationForTelemetry: NSDictionary? = nil
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
        configurationForTelemetry: NSDictionary? = nil
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
                "configurationForTelemetry": configurationForTelemetry
            ]
        )
    }
}
