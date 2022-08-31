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

        RNDdSdk(mainDispatchQueue: DispatchQueueMock()).initialize(configuration: .mockAny(), resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(printedMessage, "")

        RNDdSdk(mainDispatchQueue: DispatchQueueMock()).initialize(configuration: .mockAny(), resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(printedMessage, "Datadog SDK is already initialized, skipping initialization.")

        Datadog.flushAndDeinitialize()
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

        RNDdSdk(mainDispatchQueue: DispatchQueueMock()).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(Datadog.verbosityLevel, LogLevel.debug)

        Datadog.flushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityInfo() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: ["_dd.sdk_verbosity": "info"])

        RNDdSdk(mainDispatchQueue: DispatchQueueMock()).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(Datadog.verbosityLevel, LogLevel.info)

        Datadog.flushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityWarn() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: ["_dd.sdk_verbosity": "warn"])

        RNDdSdk(mainDispatchQueue: DispatchQueueMock()).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(Datadog.verbosityLevel, LogLevel.warn)

        Datadog.flushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityError() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: ["_dd.sdk_verbosity": "error"])

        RNDdSdk(mainDispatchQueue: DispatchQueueMock()).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(Datadog.verbosityLevel, LogLevel.error)

        Datadog.flushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityNil() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: nil)

        RNDdSdk(mainDispatchQueue: DispatchQueueMock()).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertNil(Datadog.verbosityLevel)

        Datadog.flushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityUnknown() {
        let validConfiguration: NSDictionary = .mockAny(additionalConfig: ["_dd.sdk_verbosity": "foo"])

        RNDdSdk(mainDispatchQueue: DispatchQueueMock()).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertNil(Datadog.verbosityLevel)

        Datadog.flushAndDeinitialize()
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
    

    func testSettingUserInfo() throws {
        let bridge = RNDdSdk(mainDispatchQueue: DispatchQueueMock())
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

        let receivedUserInfo = try XCTUnwrap(defaultDatadogCore as? DatadogCore).dependencies.userInfoProvider.value
        XCTAssertEqual(receivedUserInfo.id, "abc-123")
        XCTAssertEqual(receivedUserInfo.name, "John Doe")
        XCTAssertEqual(receivedUserInfo.email, "john@doe.com")
        XCTAssertEqual(receivedUserInfo.extraInfo["extra-info-1"] as? Int64, 123)
        XCTAssertEqual(receivedUserInfo.extraInfo["extra-info-2"] as? String, "abc")
        XCTAssertEqual(receivedUserInfo.extraInfo["extra-info-3"] as? Bool, true)

        Datadog.flushAndDeinitialize()
    }

    func testSettingAttributes() {
        let bridge = RNDdSdk(mainDispatchQueue: DispatchQueueMock())
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
        Datadog.flushAndDeinitialize()
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
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.long_task.threshold": 2_500])

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.rumLongTaskDurationThreshold, 2.5)
    }

    func testBuildFirstPartyHosts() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.first_party_hosts": ["example.com", "datadog.com"]])

        let ddConfig = RNDdSdk().buildConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.firstPartyHosts, ["example.com", "datadog.com"])
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
}

private class MockRUMMonitor: DDRUMMonitor {
    private(set) var receivedAttributes = [AttributeKey: AttributeValue]()

    override func addAttribute(forKey key: AttributeKey, value: AttributeValue) {
        receivedAttributes[key] = value
    }
}

extension DdSdkConfiguration {
    static func mockAny(
        clientToken: NSString = "client-token",
        env: NSString = "env",
        applicationId: NSString = "app-id",
        nativeCrashReportEnabled: Bool? = nil,
        sampleRate: Double = 75.0,
        site: NSString? = nil,
        trackingConsent: NSString = "pending",
        additionalConfig: NSDictionary? = nil
    ) -> DdSdkConfiguration {
        DdSdkConfiguration(
            clientToken: clientToken as String,
            env: env as String,
            applicationId: applicationId as String,
            nativeCrashReportEnabled: nativeCrashReportEnabled,
            sampleRate: sampleRate,
            site: site,
            trackingConsent: trackingConsent,
            additionalConfig: additionalConfig
        )
    }
}

extension NSDictionary {
    static func mockAny(
        clientToken: NSString = "client-token",
        env: NSString = "env",
        applicationId: NSString = "app-id",
        nativeCrashReportEnabled: Bool? = nil,
        sampleRate: Double = 75.0,
        site: NSString? = nil,
        trackingConsent: NSString = "pending",
        additionalConfig: NSDictionary? = nil
    ) -> NSDictionary {
        NSDictionary(
            dictionary: [
                "clientToken": clientToken,
                "env": env,
                "applicationId": applicationId,
                "nativeCrashReportEnabled": nativeCrashReportEnabled,
                "sampleRate": sampleRate,
                "site": site,
                "trackingConsent": trackingConsent,
                "additionalConfig": additionalConfig
            ]
        )
    }
}
