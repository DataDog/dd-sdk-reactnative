/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2020 Datadog, Inc.
 */

import XCTest

@testable import DatadogCore
@testable import DatadogCrashReporting
@testable import DatadogInternal
@testable import DatadogLogs
@testable import DatadogRUM
@testable import DatadogSDKReactNative
@testable import DatadogTrace

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

class DdSdkTests: XCTestCase {
    var consoleMessage = ""

    private func mockResolve(args _: Any?) {}
    private func mockReject(args _: String?, arg _: String?, err _: Error?) {}

    override func tearDown() {
        DatadogSDKWrapper.shared.onSdkInitializedListeners = []
        Datadog.internalFlushAndDeinitialize()
    }

    func testSDKInitialization() {
        let originalConsolePrint = consolePrint
        defer {
            consolePrint = originalConsolePrint
            self.consoleMessage = ""
        }

        consolePrint = { [weak self] msg, _ in
            self?.consoleMessage += msg
        }

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(
            configuration: .mockAny(),
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertEqual(consoleMessage, "")

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(
            configuration: .mockAny(),
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertEqual(
            consoleMessage, "Datadog SDK is already initialized, skipping initialization.")
    }

    func testResolvesPromiseAfterInitializationIsDone() throws {
        let bridge = DispatchQueueMock()
        let mockJSRefreshRateMonitor = MockJSRefreshRateMonitor()
        let mockListener = MockOnSdkInitializedListener()
        DatadogSDKWrapper.shared.addOnSdkInitializedListener(listener: mockListener.listener)

        let expectation = self.expectation(description: "Listener is called when promise resolves")
        func mockPromiseResolve(_: Any?) {
            expectation.fulfill()
        }

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueue.main,
            jsDispatchQueue: bridge,
            jsRefreshRateMonitor: mockJSRefreshRateMonitor,
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(
            configuration: .mockAny(),
            resolve: mockPromiseResolve,
            reject: mockReject
        )

        waitForExpectations(timeout: 0.5, handler: nil)
    }
        
    func testBuildConfigurationNoUIKitViewsByDefault() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        XCTAssertNil(ddConfig.uiKitViewsPredicate)
    }

    func testBuildConfigurationUIKitViewsTrackingDisabled() {
        let rumConfiguration: RumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.nativeViewTracking = false
        let configuration: DdSdkConfiguration = .mockAny(rumConfiguration: rumConfiguration)

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        XCTAssertNil(ddConfig.uiKitViewsPredicate)
    }

    func testBuildConfigurationUIKitViewsTrackingEnabled() {
        let rumConfiguration: RumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.nativeViewTracking = true
        let configuration: DdSdkConfiguration = .mockAny(rumConfiguration: rumConfiguration)

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        XCTAssertNotNil(ddConfig.uiKitViewsPredicate)
    }

    func testBuildConfigurationNoUIKitUserActionsByDefault() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        XCTAssertNil(ddConfig.uiKitActionsPredicate)
    }

    func testBuildConfigurationUIKitUserActionsTrackingDisabled() {
        let rumConfiguration: RumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.nativeInteractionTracking = false
        let configuration: DdSdkConfiguration = .mockAny(rumConfiguration: rumConfiguration)

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        XCTAssertNil(ddConfig.uiKitActionsPredicate)
    }

    func testBuildConfigurationUIKitUserActionsTrackingEnabled() {
        let rumConfiguration: RumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.nativeInteractionTracking = true
        let configuration: DdSdkConfiguration = .mockAny(rumConfiguration: rumConfiguration)

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        XCTAssertNotNil(ddConfig.uiKitActionsPredicate)
    }

    func testSDKInitializationWithVerbosityDebug() {
        let validConfiguration: NSDictionary = .mockAny(verbosity: "debug")

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(
            configuration: validConfiguration,
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertEqual(Datadog.verbosityLevel, CoreLoggerLevel.debug)
    }

    func testSDKInitializationWithVerbosityInfo() {
        let validConfiguration: NSDictionary = .mockAny(verbosity: "info")

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(
            configuration: validConfiguration,
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertEqual(Datadog.verbosityLevel, CoreLoggerLevel.debug)
    }

    func testSDKInitializationWithVerbosityWarn() {
        let validConfiguration: NSDictionary = .mockAny(verbosity: "warn")

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(
            configuration: validConfiguration,
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertEqual(Datadog.verbosityLevel, CoreLoggerLevel.warn)
    }

    func testSDKInitializationWithVerbosityError() {
        let validConfiguration: NSDictionary = .mockAny(verbosity: "error")

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(
            configuration: validConfiguration,
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertEqual(Datadog.verbosityLevel, CoreLoggerLevel.error)
    }

    func testSDKInitializationWithVerbosityNil() {
        let validConfiguration: NSDictionary = .mockAny()

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(
            configuration: validConfiguration,
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertNil(Datadog.verbosityLevel)
    }

    func testSDKInitializationWithVerbosityUnknown() {
        let validConfiguration: NSDictionary = .mockAny(verbosity: "foo")

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(
            configuration: validConfiguration,
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertNil(Datadog.verbosityLevel)
    }

    func testSDKInitializationWithOnInitializedCallback() {
        var isInitialized = false
        var coreFromCallback: DatadogCoreProtocol? = nil
        DatadogSDKWrapper.shared.addOnSdkInitializedListener(listener: {
            core in
            coreFromCallback = core
            isInitialized = Datadog.isInitialized()
        })

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(
            configuration: .mockAny(),
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertTrue(isInitialized)
    }

    func testEnableAllFeatures() {
        let core = MockDatadogCore()
        CoreRegistry.register(default: core)
        defer { CoreRegistry.unregisterDefault() }

        let configuration: DdSdkConfiguration = .mockAny()

        DdSdkNativeInitialization().enableFeatures(
            sdkConfiguration: configuration
        )

        XCTAssertNotNil(core.features[RUMFeature.name])
        XCTAssertNotNil(core.features[LogsFeature.name])
        XCTAssertNotNil(core.features[TraceFeature.name])
    }

    func testBuildConfigurationDefaultEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.site, .us1)
    }

    func testBuildConfigurationUSEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.site, .us1)
    }

    func testBuildConfigurationUS1Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US1")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.site, .us1)
    }

    func testBuildConfigurationUS3Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US3")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.site, .us3)
    }

    func testBuildConfigurationUS5Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US5")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.site, .us5)
    }

    func testBuildConfigurationUS1FEDEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US1_FED")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.site, .us1_fed)
    }

    func testBuildConfigurationUS2FEDEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US2_FED")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.site, .us2_fed)
    }

    func testBuildConfigurationGOVEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "GOV")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.site, .us1_fed)
    }

    func testBuildConfigurationEUEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "EU")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.site, .eu1)
    }

    func testBuildConfigurationEU1Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "EU1")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.site, .eu1)
    }

    func testBuildConfigurationAP1Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "AP1")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.site, .ap1)
    }

    func testBuildConfigurationAP2Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "AP2")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.site, .ap2)
    }

    func testBuildConfigurationAdditionalConfig() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfiguration: [
            "foo": "test", "bar": 42,
        ])

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        // swiftlint:disable force_cast
        XCTAssertEqual(ddConfig.additionalConfiguration["foo"] as! String, "test")
        XCTAssertEqual(ddConfig.additionalConfiguration["bar"] as! Int, 42)
        // swiftlint:enable force_cast
    }

    func testBuildConfigurationWithNilServiceNameByDefault() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertNil(ddConfig.service)
    }

    func testBuildConfigurationWithServiceName() {
        let configuration: DdSdkConfiguration = .mockAny(service: "com.example.app")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.service, "com.example.app")
    }

    func testBuildConfigurationNoCrashReportByDefault() {
        let core = MockDatadogCore()
        let rumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.nativeCrashReportEnabled = nil
        let configuration: DdSdkConfiguration = .mockAny(rumConfiguration: rumConfiguration)

        DdSdkNativeInitialization().enableFeatures(
            sdkConfiguration: configuration
        )

        XCTAssertNil(core.features[CrashReportingFeature.name])
    }

    func testBuildConfigurationNoCrashReport() {
        let core = MockDatadogCore()
        let rumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.nativeCrashReportEnabled = false
        let configuration: DdSdkConfiguration = .mockAny(rumConfiguration: rumConfiguration)

        DdSdkNativeInitialization().enableFeatures(
            sdkConfiguration: configuration
        )

        XCTAssertNil(core.features[CrashReportingFeature.name])
    }

    func testBuildConfigurationWithCrashReport() {
        let core = MockDatadogCore()
        CoreRegistry.register(default: core)
        defer { CoreRegistry.unregisterDefault() }

        let rumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.nativeCrashReportEnabled = true
        let configuration: DdSdkConfiguration = .mockAny(rumConfiguration: rumConfiguration)

        DdSdkNativeInitialization().enableFeatures(
            sdkConfiguration: configuration
        )

        XCTAssertNotNil(core.features[CrashReportingFeature.name])
    }

    func testBuildConfigurationWithVersionSuffix() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfiguration: [
            "_dd.version_suffix": ":codepush-3"
        ])

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration,
            defaultAppVersion: "1.2.3"
        )

        XCTAssertEqual(
            ddConfig.additionalConfiguration["_dd.version"] as! String, "1.2.3:codepush-3")
    }

    func testBuildConfigurationFrustrationTrackingEnabledByDefault() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.trackFrustrations, true)
    }

    func testBuildConfigurationFrustrationTrackingEnabledExplicitly() {
        let rumConfiguration: RumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.trackFrustrations = true
        let configuration: DdSdkConfiguration = .mockAny(rumConfiguration: rumConfiguration)

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.trackFrustrations, true)
    }

    func testBuildConfigurationFrustrationTrackingDisabled() {
        let rumConfiguration: RumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.trackFrustrations = false
        let configuration: DdSdkConfiguration = .mockAny(rumConfiguration: rumConfiguration)

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.trackFrustrations, false)
    }

    func testSetUserInfo() throws {
        let bridge = DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        )
        bridge.initialize(
            configuration: .mockAny(),
            resolve: mockResolve,
            reject: mockReject
        )

        bridge.setUserInfo(
            userInfo: NSDictionary(
                dictionary: [
                    "id": "id_123",
                    "name": "John Doe",
                    "email": "john@doe.com",
                    "extraInfo": [
                        "extra-info-1": 123,
                        "extra-info-2": "abc",
                        "extra-info-3": true,
                        "extra-info-4": [
                            "nested-extra-info-1": 456
                        ],
                    ],
                ]
            ),
            resolve: mockResolve,
            reject: mockReject
        )

        let ddContext = try XCTUnwrap(CoreRegistry.default as? DatadogCore).contextProvider.read()
        let userInfo = try XCTUnwrap(ddContext.userInfo)

        XCTAssertEqual(userInfo.id, "id_123")
        XCTAssertEqual(userInfo.name, "John Doe")
        XCTAssertEqual(userInfo.email, "john@doe.com")
        XCTAssertEqual(userInfo.extraInfo["extra-info-1"] as? Int64, 123)
        XCTAssertEqual(userInfo.extraInfo["extra-info-2"] as? String, "abc")
        XCTAssertEqual(userInfo.extraInfo["extra-info-3"] as? Bool, true)

        if let extraInfo4Encodable = userInfo.extraInfo["extra-info-4"]
            as? AnyEncodable,
            let extraInfo4Dict = extraInfo4Encodable.value as? [String: Int]
        {
            XCTAssertEqual(extraInfo4Dict, ["nested-extra-info-1": 456])
        } else {
            XCTFail("extra-info-4 is not of expected type or value")
        }
    }

    func testAddUserExtraInfo() throws {
        let bridge = DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        )
        bridge.initialize(
            configuration: .mockAny(),
            resolve: mockResolve,
            reject: mockReject
        )

        bridge.setUserInfo(
            userInfo: NSDictionary(
                dictionary: [
                    "id": "id_123",
                    "name": "John Doe",
                    "email": "john@doe.com",
                    "extraInfo": [
                        "extra-info-1": 123
                    ],
                ]
            ),
            resolve: mockResolve,
            reject: mockReject
        )

        bridge.addUserExtraInfo(
            extraInfo: NSDictionary(
                dictionary: [
                    "extra-info-2": "abc",
                    "extra-info-3": true,
                    "extra-info-4": [
                        "nested-extra-info-1": 456
                    ],
                ]
            ),
            resolve: mockResolve,
            reject: mockReject
        )

        let ddContext = try XCTUnwrap(CoreRegistry.default as? DatadogCore).contextProvider.read()
        let userInfo = try XCTUnwrap(ddContext.userInfo)

        XCTAssertEqual(userInfo.id, "id_123")
        XCTAssertEqual(userInfo.name, "John Doe")
        XCTAssertEqual(userInfo.email, "john@doe.com")
        XCTAssertEqual(userInfo.extraInfo["extra-info-1"] as? Int64, 123)
        XCTAssertEqual(userInfo.extraInfo["extra-info-2"] as? String, "abc")
        XCTAssertEqual(userInfo.extraInfo["extra-info-3"] as? Bool, true)

        if let extraInfo4Encodable = userInfo.extraInfo["extra-info-4"]
            as? AnyEncodable,
            let extraInfo4Dict = extraInfo4Encodable.value as? [String: Int]
        {
            XCTAssertEqual(extraInfo4Dict, ["nested-extra-info-1": 456])
        } else {
            XCTFail("extra-info-4 is not of expected type or value")
        }
    }

    func testClearUserInfo() throws {
        let bridge = DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        )
        bridge.initialize(
            configuration: .mockAny(),
            resolve: mockResolve,
            reject: mockReject
        )

        bridge.setUserInfo(
            userInfo: NSDictionary(
                dictionary: [
                    "id": "id_123",
                    "name": "John Doe",
                    "email": "john@doe.com",
                    "extraInfo": [
                        "extra-info-1": 123,
                        "extra-info-2": "abc",
                        "extra-info-3": true,
                        "extra-info-4": [
                            "nested-extra-info-1": 456
                        ],
                    ],
                ]
            ),
            resolve: mockResolve,
            reject: mockReject
        )

        var ddContext = try XCTUnwrap(CoreRegistry.default as? DatadogCore).contextProvider.read()
        var userInfo = try XCTUnwrap(ddContext.userInfo)

        XCTAssertEqual(userInfo.id, "id_123")
        XCTAssertEqual(userInfo.name, "John Doe")
        XCTAssertEqual(userInfo.email, "john@doe.com")
        XCTAssertEqual(userInfo.extraInfo["extra-info-1"] as? Int64, 123)
        XCTAssertEqual(userInfo.extraInfo["extra-info-2"] as? String, "abc")
        XCTAssertEqual(userInfo.extraInfo["extra-info-3"] as? Bool, true)

        if let extraInfo4Encodable = userInfo.extraInfo["extra-info-4"]
            as? AnyEncodable,
            let extraInfo4Dict = extraInfo4Encodable.value as? [String: Int]
        {
            XCTAssertEqual(extraInfo4Dict, ["nested-extra-info-1": 456])
        } else {
            XCTFail("extra-info-4 is not of expected type or value")
        }

        bridge.clearUserInfo(resolve: mockResolve, reject: mockReject)

        ddContext = try XCTUnwrap(CoreRegistry.default as? DatadogCore).contextProvider.read()
        userInfo = try XCTUnwrap(ddContext.userInfo)

        XCTAssertEqual(userInfo.id, nil)
        XCTAssertEqual(userInfo.name, nil)
        XCTAssertEqual(userInfo.email, nil)
        XCTAssertEqual(userInfo.extraInfo["extra-info-1"] as? Int64, nil)
        XCTAssertEqual(userInfo.extraInfo["extra-info-2"] as? String, nil)
        XCTAssertEqual(userInfo.extraInfo["extra-info-3"] as? Bool, nil)
        XCTAssertEqual(userInfo.extraInfo["extra-info-4"] as? [String: Int], nil)
    }

    func testAddingAttribute() {
        let rumMonitorMock = MockRUMMonitor()
        let bridge = DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { rumMonitorMock },
            RUMMonitorInternalProvider: { nil }
        )
        bridge.initialize(
            configuration: .mockAny(),
            resolve: mockResolve,
            reject: mockReject
        )

        bridge.addAttribute(
            key: "attribute-1", value: NSDictionary(dictionary: ["value": 123]),
            resolve: mockResolve, reject: mockReject)
        bridge.addAttribute(
            key: "attribute-2", value: NSDictionary(dictionary: ["value": "abc"]),
            resolve: mockResolve, reject: mockReject)
        bridge.addAttribute(
            key: "attribute-3", value: NSDictionary(dictionary: ["value": true]),
            resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(rumMonitorMock.addedAttributes["attribute-1"] as? Int64, 123)
        XCTAssertEqual(rumMonitorMock.addedAttributes["attribute-2"] as? String, "abc")
        XCTAssertEqual(rumMonitorMock.addedAttributes["attribute-3"] as? Bool, true)

        XCTAssertEqual(GlobalState.globalAttributes["attribute-1"] as? Int64, 123)
        XCTAssertEqual(GlobalState.globalAttributes["attribute-2"] as? String, "abc")
        XCTAssertEqual(GlobalState.globalAttributes["attribute-3"] as? Bool, true)

        GlobalState.globalAttributes.removeAll()
    }

    func testRemovingAttribute() {
        let rumMonitorMock = MockRUMMonitor()
        let bridge = DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { rumMonitorMock },
            RUMMonitorInternalProvider: { nil }
        )

        bridge.initialize(
            configuration: .mockAny(),
            resolve: mockResolve,
            reject: mockReject
        )

        bridge.addAttributes(
            attributes: NSDictionary(
                dictionary: [
                    "attribute-1": 123,
                    "attribute-2": "abc",
                ]
            ),
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertEqual(rumMonitorMock.addedAttributes["attribute-1"] as? Int64, 123)
        XCTAssertEqual(rumMonitorMock.addedAttributes["attribute-2"] as? String, "abc")

        XCTAssertEqual(GlobalState.globalAttributes["attribute-1"] as? Int64, 123)
        XCTAssertEqual(GlobalState.globalAttributes["attribute-2"] as? String, "abc")

        bridge.removeAttribute(key: "attribute-1", resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(rumMonitorMock.addedAttributes["attribute-1"] as? Int64, nil)
        XCTAssertEqual(rumMonitorMock.addedAttributes["attribute-2"] as? String, "abc")

        XCTAssertEqual(GlobalState.globalAttributes["attribute-1"] as? Int64, nil)
        XCTAssertEqual(GlobalState.globalAttributes["attribute-2"] as? String, "abc")

        bridge.removeAttribute(key: "attribute-2", resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(rumMonitorMock.addedAttributes["attribute-1"] as? Int64, nil)
        XCTAssertEqual(rumMonitorMock.addedAttributes["attribute-2"] as? String, nil)

        XCTAssertEqual(GlobalState.globalAttributes["attribute-1"] as? Int64, nil)
        XCTAssertEqual(GlobalState.globalAttributes["attribute-2"] as? String, nil)

        GlobalState.globalAttributes.removeAll()
    }

    func testAddingAttributes() {
        let rumMonitorMock = MockRUMMonitor()
        let bridge = DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { rumMonitorMock },
            RUMMonitorInternalProvider: { nil }
        )
        bridge.initialize(
            configuration: .mockAny(),
            resolve: mockResolve,
            reject: mockReject
        )

        bridge.addAttributes(
            attributes: NSDictionary(
                dictionary: [
                    "attribute-1": 123,
                    "attribute-2": "abc",
                    "attribute-3": true,
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
    }

    func testRemovingAttributes() {
        let rumMonitorMock = MockRUMMonitor()
        let bridge = DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { rumMonitorMock },
            RUMMonitorInternalProvider: { nil }
        )
        bridge.initialize(
            configuration: .mockAny(),
            resolve: mockResolve,
            reject: mockReject
        )

        bridge.addAttributes(
            attributes: NSDictionary(
                dictionary: [
                    "attribute-1": 123,
                    "attribute-2": "abc",
                    "attribute-3": true,
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

        bridge.removeAttributes(
            keys: ["attribute-1", "attribute-2"], resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(rumMonitorMock.addedAttributes["attribute-1"] as? Int64, nil)
        XCTAssertEqual(rumMonitorMock.addedAttributes["attribute-2"] as? String, nil)
        XCTAssertEqual(rumMonitorMock.addedAttributes["attribute-3"] as? Bool, true)

        XCTAssertEqual(GlobalState.globalAttributes["attribute-1"] as? Int64, nil)
        XCTAssertEqual(GlobalState.globalAttributes["attribute-2"] as? String, nil)
        XCTAssertEqual(GlobalState.globalAttributes["attribute-3"] as? Bool, true)

        bridge.removeAttributes(keys: ["attribute-3"], resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(rumMonitorMock.addedAttributes["attribute-1"] as? Int64, nil)
        XCTAssertEqual(rumMonitorMock.addedAttributes["attribute-2"] as? String, nil)
        XCTAssertEqual(rumMonitorMock.addedAttributes["attribute-3"] as? Bool, nil)

        XCTAssertEqual(GlobalState.globalAttributes["attribute-1"] as? Int64, nil)
        XCTAssertEqual(GlobalState.globalAttributes["attribute-2"] as? String, nil)
        XCTAssertEqual(GlobalState.globalAttributes["attribute-3"] as? Bool, nil)

        GlobalState.globalAttributes.removeAll()

    }

    func testBuildLongTaskThreshold() {
        let rumConfiguration: RumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.nativeLongTaskThresholdMs = 2500
        let configuration: DdSdkConfiguration = .mockAny(rumConfiguration: rumConfiguration)

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.longTaskThreshold, 2.5)
    }

    func testBuildNoLongTaskTracking() {
        let rumConfiguration: RumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.nativeLongTaskThresholdMs = 0
        let configuration: DdSdkConfiguration = .mockAny(rumConfiguration: rumConfiguration)

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.longTaskThreshold, nil)
    }

    func testFirstPartyHosts() {
        let rumConfiguration: RumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.resourceTraceSampleRate = 66
        rumConfiguration.firstPartyHosts = ([
            ["match": "example.com", "propagatorTypes": ["datadog", "b3"]],
            ["match": "datadog.com", "propagatorTypes": ["b3multi", "tracecontext"]],
        ] as NSArray).asFirstPartyHosts()

        let configuration: DdSdkConfiguration = .mockAny(rumConfiguration: rumConfiguration)
        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        let expectedFirstPartyHosts: [String: Set<TracingHeaderType>]? = [
            "example.com": [.datadog, .b3], "datadog.com": [.b3multi, .tracecontext],
        ]
        var actualFirstPartyHosts: [String: Set<TracingHeaderType>]?
        var actualTracingSamplingRate: Float?
        var actualTraceContextInjection: TraceContextInjection?
        switch ddConfig.urlSessionTracking?.firstPartyHostsTracing {
        case .trace: break
        case let .traceWithHeaders(hostsWithHeaders, samplingRate, traceContextInjection):
            actualFirstPartyHosts = hostsWithHeaders
            actualTracingSamplingRate = samplingRate
            actualTraceContextInjection = traceContextInjection
        case .none: break
        }

        XCTAssertEqual(actualFirstPartyHosts, expectedFirstPartyHosts)
        XCTAssertEqual(actualTracingSamplingRate, 66)
        XCTAssertEqual(actualTraceContextInjection, .sampled)
    }

    func testBuildTelemetrySampleRate() {
        let rumConfiguration: RumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.telemetrySampleRate = 42.0
        let configuration: DdSdkConfiguration = .mockAny(rumConfiguration: rumConfiguration)

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.telemetrySampleRate, 42.0)
    }

    func testProxyConfiguration() {
        let configuration: DdSdkConfiguration = .mockAny(
            proxyConfiguration: ([
                "type": "http",
                "address": "host",
                "port": 99,
                "username": "username",
                "password": "pwd",
            ] as NSDictionary).asProxyConfiguration()
        )

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration)

        XCTAssertEqual(ddConfig.proxyConfiguration?["HTTPProxy"] as? String, "host")
        XCTAssertEqual(ddConfig.proxyConfiguration?["HTTPPort"] as? NSNumber, 99)
        XCTAssertEqual(ddConfig.proxyConfiguration?[kCFProxyUsernameKey] as? String, "username")
        XCTAssertEqual(ddConfig.proxyConfiguration?[kCFProxyPasswordKey] as? String, "pwd")
    }

    func testBuildConfigurationAverageVitalsUpdateFrequency() {
        let rumConfiguration: RumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.vitalsUpdateFrequency = RUM.Configuration.VitalsFrequency.average
        let configuration: DdSdkConfiguration = .mockAny(rumConfiguration: rumConfiguration)

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.vitalsUpdateFrequency, .average)
    }

    func testBuildConfigurationNilVitalsUpdateFrequency() {
        let rumConfiguration: RumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.vitalsUpdateFrequency = nil
        let configuration: DdSdkConfiguration = .mockAny(rumConfiguration: rumConfiguration)

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.vitalsUpdateFrequency, nil)
    }

    func testBuildConfigurationAverageUploadFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(uploadFrequency: "AVERAGE")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.uploadFrequency, .average)
    }

    func testBuildConfigurationFrequentUploadFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(uploadFrequency: "FREQUENT")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.uploadFrequency, .frequent)
    }

    func testBuildConfigurationRareUploadFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(uploadFrequency: "RARE")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.uploadFrequency, .rare)
    }

    func testBuildConfigurationSmallBatchSize() {
        let configuration: DdSdkConfiguration = .mockAny(batchSize: "SMALL")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.batchSize, .small)
    }

    func testBuildConfigurationMediumBatchSize() {
        let configuration: DdSdkConfiguration = .mockAny(batchSize: "MEDIUM")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.batchSize, .medium)
    }

    func testBuildConfigurationLargeBatchSize() {
        let configuration: DdSdkConfiguration = .mockAny(batchSize: "LARGE")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.batchSize, .large)
    }

    func testBuildConfigurationLowBatchProcessingLevel() {
        let configuration: DdSdkConfiguration = .mockAny(batchProcessingLevel: "LOW")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.batchProcessingLevel, .low)
    }

    func testBuildConfigurationMediumBatchProcessingLevel() {
        let configuration: DdSdkConfiguration = .mockAny(batchProcessingLevel: "MEDIUM")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.batchProcessingLevel, .medium)
    }

    func testBuildConfigurationHighBatchProcessingLevel() {
        let configuration: DdSdkConfiguration = .mockAny(batchProcessingLevel: "HIGH")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.batchProcessingLevel, .high)
    }

    func testJsRefreshRateInitializationWithLongTaskDisabled() {
        let mockRefreshRateMonitor = MockJSRefreshRateMonitor()
        let rumMonitorMock = MockRUMMonitor()

        let rumConfiguration = NSMutableDictionary(dictionary: DefaultRumConfigurationDict)
        rumConfiguration["longTaskThresholdMs"] = 0.0

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: mockRefreshRateMonitor,
            RUMMonitorProvider: { rumMonitorMock },
            RUMMonitorInternalProvider: { rumMonitorMock._internalMock }
        ).initialize(
            configuration: .mockAny(rumConfiguration: rumConfiguration),
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertTrue(mockRefreshRateMonitor.isStarted)

        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.20)
        // Check that we have jumped to another thread and returned before actually calling RUM:
        XCTAssertEqual(rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds], nil)

        // Wait for async execution on the sharedQueue to be over:
        sharedQueue.sync {}
        XCTAssertEqual(rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds], 0.20)
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.count, 0)
    }

    func testJsRefreshRateInitializationNeverVitalsUpdateFrequency() {
        let mockRefreshRateMonitor = MockJSRefreshRateMonitor()
        let rumMonitorMock = MockRUMMonitor()

        let rumConfiguration = NSMutableDictionary(dictionary: DefaultRumConfigurationDict)
        rumConfiguration["longTaskThresholdMs"] = 0.0
        rumConfiguration["vitalsUpdateFrequency"] = "never"

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: mockRefreshRateMonitor,
            RUMMonitorProvider: { rumMonitorMock },
            RUMMonitorInternalProvider: { rumMonitorMock._internalMock }
        ).initialize(
            configuration: .mockAny(
                rumConfiguration: rumConfiguration
            ),
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertFalse(mockRefreshRateMonitor.isStarted)

        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.20)
        // Wait for async execution on the sharedQueue to be over:
        sharedQueue.sync {}
        XCTAssertEqual(rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds], nil)
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.count, 0)
    }

    func testJsLongTaskCollectionWithRefreshRateInitializationNeverVitalsUpdateFrequency() {
        let mockRefreshRateMonitor = MockJSRefreshRateMonitor()
        let rumMonitorMock = MockRUMMonitor()

        let rumConfiguration = NSMutableDictionary(dictionary: DefaultRumConfigurationDict)
        rumConfiguration["longTaskThresholdMs"] = 0.2
        rumConfiguration["vitalsUpdateFrequency"] = "never"

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: mockRefreshRateMonitor,
            RUMMonitorProvider: { rumMonitorMock },
            RUMMonitorInternalProvider: { rumMonitorMock._internalMock }
        ).initialize(
            configuration: .mockAny(
                rumConfiguration: rumConfiguration
            ),
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertTrue(mockRefreshRateMonitor.isStarted)

        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.25)
        // Check that we have jumped to another thread and returned before actually calling RUM:
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.count, 0)

        // Wait for async execution on the sharedQueue to be over:
        sharedQueue.sync {}
        XCTAssertEqual(rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds], nil)
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.count, 1)
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.first?.value, 0.25)
    }

    func testJsLongTaskCollection() {
        let mockRefreshRateMonitor = MockJSRefreshRateMonitor()
        let rumMonitorMock = MockRUMMonitor()

        let rumConfiguration = NSMutableDictionary(dictionary: DefaultRumConfigurationDict)
        rumConfiguration["longTaskThresholdMs"] = 200
        rumConfiguration["vitalsUpdateFrequency"] = RUM.Configuration.VitalsFrequency.average

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: mockRefreshRateMonitor,
            RUMMonitorProvider: { rumMonitorMock },
            RUMMonitorInternalProvider: { rumMonitorMock._internalMock }
        ).initialize(
            configuration: .mockAny(
                rumConfiguration: rumConfiguration
            ),
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertTrue(mockRefreshRateMonitor.isStarted)

        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.05)
        // Wait for async execution on the sharedQueue to be over:
        sharedQueue.sync {}
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.count, 0)

        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.25)
        // Wait for async execution on the sharedQueue to be over:
        sharedQueue.sync {}
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.count, 1)
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.first?.value, 0.25)
        XCTAssertEqual(rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds], 0.25)
    }

    func testFrameTimeNormalizationFromCallback() {
        let mockRefreshRateMonitor = MockJSRefreshRateMonitor()
        let rumMonitorMock = MockRUMMonitor()
        let rumConfiguration = NSMutableDictionary(dictionary: DefaultRumConfigurationDict)

        rumConfiguration["longTaskThresholdMs"] = 200
        rumConfiguration["vitalsUpdateFrequency"] = RUM.Configuration.VitalsFrequency.average

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: mockRefreshRateMonitor,
            RUMMonitorProvider: { rumMonitorMock },
            RUMMonitorInternalProvider: { rumMonitorMock._internalMock }
        ).initialize(
            configuration: .mockAny(
                rumConfiguration: rumConfiguration
            ),
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertTrue(mockRefreshRateMonitor.isStarted)

        // 10 fps
        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.1)
        sharedQueue.sync {}
        XCTAssertEqual(rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds], 0.1)

        // 30 fps
        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.03)
        sharedQueue.sync {}
        XCTAssertEqual(rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds], 0.03)

        // 45 fps
        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.02)
        sharedQueue.sync {}
        XCTAssertEqual(rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds], 0.02)

        // 60 fps
        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.016)
        sharedQueue.sync {}
        XCTAssertEqual(
            rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds]!, 0.016,
            accuracy: 0.001)

        // 90 fps
        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.011)
        sharedQueue.sync {}
        XCTAssertEqual(
            rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds]!, 0.016,
            accuracy: 0.001)

        // 120 fps
        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.008)
        sharedQueue.sync {}
        XCTAssertEqual(
            rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds]!, 0.016,
            accuracy: 0.001)
    }

    func testFrameTimeNormalizationUtilityFunction() {

        // 10 fps, 60fps capable device, 60 fps budget -> Normalized to 10fps
        var frameTimeSeconds = DdSdkImplementation.normalizeFrameTimeForDeviceRefreshRate(
            0.1, fpsBudget: 60.0, deviceDisplayFps: 60.0)
        XCTAssertEqual(frameTimeSeconds, 0.1, accuracy: 0.01)

        // 30 fps, 60fps capable device, 60 fps budget -> Normalized to 30fps
        frameTimeSeconds = DdSdkImplementation.normalizeFrameTimeForDeviceRefreshRate(
            0.03, fpsBudget: 60.0, deviceDisplayFps: 60.0)
        XCTAssertEqual(frameTimeSeconds, 0.03, accuracy: 0.01)

        // 60 fps, 60fps capable device, 60 fps budget-> Normalized to 60fps
        frameTimeSeconds = DdSdkImplementation.normalizeFrameTimeForDeviceRefreshRate(
            0.016, fpsBudget: 60.0, deviceDisplayFps: 60.0)
        XCTAssertEqual(frameTimeSeconds, 0.016, accuracy: 0.01)

        // 60 fps, 120fps capable device, 60 fps budget -> Normalized to 30fps
        frameTimeSeconds = DdSdkImplementation.normalizeFrameTimeForDeviceRefreshRate(
            0.016, fpsBudget: 60.0, deviceDisplayFps: 120.0)
        XCTAssertEqual(frameTimeSeconds, 0.03, accuracy: 0.01)

        // 120 fps, 120fps capable device, 60 fps budget -> Normalized to 60fps
        frameTimeSeconds = DdSdkImplementation.normalizeFrameTimeForDeviceRefreshRate(
            0.0083, fpsBudget: 60.0, deviceDisplayFps: 120.0)
        XCTAssertEqual(frameTimeSeconds, 0.016, accuracy: 0.001)

        // 90 fps, 120fps capable device, 60 fps budget -> Normalized to 45fps
        frameTimeSeconds = DdSdkImplementation.normalizeFrameTimeForDeviceRefreshRate(
            0.0111, fpsBudget: 60.0, deviceDisplayFps: 120.0)
        XCTAssertEqual(frameTimeSeconds, 0.0222, accuracy: 0.001)

        // 100 fps, 120fps capable device, 60 fps budget -> Normalized to 50fps
        frameTimeSeconds = DdSdkImplementation.normalizeFrameTimeForDeviceRefreshRate(
            0.01, fpsBudget: 60.0, deviceDisplayFps: 120.0)
        XCTAssertEqual(frameTimeSeconds, 0.02, accuracy: 0.001)

        // 120 fps, 120fps capable device, 120 fps budget -> Normalized to 120fps
        frameTimeSeconds = DdSdkImplementation.normalizeFrameTimeForDeviceRefreshRate(
            0.0083, fpsBudget: 120.0, deviceDisplayFps: 120.0)
        XCTAssertEqual(frameTimeSeconds, 0.0083, accuracy: 0.001)

        // 80 fps, 160fps capable device, 60 fps budget -> Normalized to 30fps
        frameTimeSeconds = DdSdkImplementation.normalizeFrameTimeForDeviceRefreshRate(
            0.0125, fpsBudget: 60.0, deviceDisplayFps: 160.0)
        XCTAssertEqual(frameTimeSeconds, 0.033, accuracy: 0.001)

        // 160 fps, 160fps capable device, 60 fps budget -> Normalized to 60fps
        frameTimeSeconds = DdSdkImplementation.normalizeFrameTimeForDeviceRefreshRate(
            0.00625, fpsBudget: 60.0, deviceDisplayFps: 160.0)
        XCTAssertEqual(frameTimeSeconds, 0.016, accuracy: 0.001)

        // Edge cases
        frameTimeSeconds = DdSdkImplementation.normalizeFrameTimeForDeviceRefreshRate(
            0, fpsBudget: 0, deviceDisplayFps: 0)
        XCTAssertEqual(frameTimeSeconds, 0.016, accuracy: 0.001)

        frameTimeSeconds = DdSdkImplementation.normalizeFrameTimeForDeviceRefreshRate(
            0.016, fpsBudget: 0, deviceDisplayFps: 0)
        XCTAssertEqual(frameTimeSeconds, 0.016, accuracy: 0.001)

        frameTimeSeconds = DdSdkImplementation.normalizeFrameTimeForDeviceRefreshRate(
            0.016, fpsBudget: 60.0, deviceDisplayFps: 0)
        XCTAssertEqual(frameTimeSeconds, 0.016, accuracy: 0.001)

        frameTimeSeconds = DdSdkImplementation.normalizeFrameTimeForDeviceRefreshRate(
            0.016, fpsBudget: 0, deviceDisplayFps: 60.0)
        XCTAssertEqual(frameTimeSeconds, 0.016, accuracy: 0.001)
    }

    func testSDKInitializationWithCustomEndpoints() throws {
        let mockRefreshRateMonitor = MockJSRefreshRateMonitor()
        let rumMonitorMock = MockRUMMonitor()

        let rumConfiguration = NSMutableDictionary(dictionary: DefaultRumConfigurationDict)
        let logsConfiguration = NSMutableDictionary(dictionary: DefaultLogsConfigurationDict)
        let traceConfiguration = NSMutableDictionary(dictionary: DefaultTraceConfigurationDict)

        rumConfiguration["customEndpoint"] = "https://rum.example.com"
        logsConfiguration["customEndpoint"] = "https://logs.example.com"
        traceConfiguration["customEndpoint"] = "https://trace.example.com"

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: mockRefreshRateMonitor,
            RUMMonitorProvider: { rumMonitorMock },
            RUMMonitorInternalProvider: { rumMonitorMock._internalMock }
        ).initialize(
            configuration: .mockAny(
                rumConfiguration: rumConfiguration, logsConfiguration: logsConfiguration,
                traceConfiguration: traceConfiguration),
            resolve: mockResolve,
            reject: mockReject
        )

        let logsFeature = try XCTUnwrap(CoreRegistry.default as? DatadogCore).get(
            feature: LogsFeature.self)
        let customLogsEndpoint = try XCTUnwrap(
            logsFeature?.requestBuilder as? DatadogLogs.RequestBuilder
        ).customIntakeURL
        XCTAssertEqual(customLogsEndpoint?.absoluteString, "https://logs.example.com/api/v2/logs")

        let rumFeature = try XCTUnwrap(CoreRegistry.default as? DatadogCore).get(
            feature: RUMFeature.self)
        let customRumEndpoint = try XCTUnwrap(
            rumFeature?.requestBuilder as? DatadogRUM.RequestBuilder
        ).customIntakeURL
        XCTAssertEqual(customRumEndpoint?.absoluteString, "https://rum.example.com/api/v2/rum")

        let traceFeature = try XCTUnwrap(CoreRegistry.default as? DatadogCore).get(
            feature: TraceFeature.self)
        let customTraceEndpoint = try XCTUnwrap(
            traceFeature?.requestBuilder as? TracingRequestBuilder
        ).customIntakeURL
        XCTAssertEqual(
            customTraceEndpoint?.absoluteString, "https://trace.example.com/api/v2/spans")
    }

    func testSDKInitializationWithLoggerConfiguration() {
        let logsConfiguration = NSMutableDictionary(dictionary: DefaultLogsConfigurationDict)
        logsConfiguration["bundleLogsWithRum"] = false
        logsConfiguration["bundleLogsWithTraces"] = false

        let configuration: NSDictionary = .mockAny(
            logsConfiguration: logsConfiguration
        )

        let rumMonitorMock = MockRUMMonitor()
        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: MockJSRefreshRateMonitor(),
            RUMMonitorProvider: { rumMonitorMock },
            RUMMonitorInternalProvider: { rumMonitorMock._internalMock }
        ).initialize(
            configuration: configuration,
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertFalse(DatadogSDKWrapper.shared.loggerConfiguration.bundleWithRumEnabled)
        XCTAssertFalse(DatadogSDKWrapper.shared.loggerConfiguration.bundleWithTraceEnabled)
    }

    func testBackgroundTrackingEnabled() {
        let rumConfiguration: RumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.trackBackgroundEvents = true
        let configuration: DdSdkConfiguration = .mockAny(rumConfiguration: rumConfiguration)

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.trackBackgroundEvents, true)
    }

    func testBackgroundTrackingDisabled() {
        let rumConfiguration: RumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.trackBackgroundEvents = false
        let configuration: DdSdkConfiguration = .mockAny(rumConfiguration: rumConfiguration)

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.trackBackgroundEvents, false)
    }

    func testBackgroundTrackingUndefined() {
        let rumConfiguration: RumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.trackBackgroundEvents = nil
        let configuration: DdSdkConfiguration = DdSdkConfiguration.mockAny(
            rumConfiguration: rumConfiguration)

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        XCTAssertEqual(ddConfig.trackBackgroundEvents, false)
    }

    func testConfigurationTelemetryOverride() throws {
        let core = MockDatadogCore()
        CoreRegistry.register(default: core)
        defer { CoreRegistry.unregisterDefault() }

        let rumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.longTaskThresholdMs = 0.1
        rumConfiguration.nativeCrashReportEnabled = false
        rumConfiguration.nativeLongTaskThresholdMs = 0.0

        let configuration: DdSdkConfiguration = DdSdkConfiguration.mockAny(
            rumConfiguration: rumConfiguration,
            configurationForTelemetry: [
                "initializationType": "LEGACY", "trackErrors": true, "trackInteractions": true,
                "trackNetworkRequests": true, "reactVersion": "18.2.0",
                "reactNativeVersion": "0.71.0",
            ]
        )

        DdSdkImplementation().overrideReactNativeTelemetry(rnConfiguration: configuration)

        XCTAssertEqual(core.configuration?.initializationType, "LEGACY")
        XCTAssertEqual(core.configuration?.trackErrors, true)
        XCTAssertEqual(core.configuration?.trackUserInteractions, true)
        XCTAssertEqual(core.configuration?.trackNetworkRequests, true)
        XCTAssertEqual(core.configuration?.trackNativeErrors, false)
        XCTAssertEqual(core.configuration?.trackNativeLongTasks, false)
        XCTAssertEqual(core.configuration?.trackLongTask, true)
        XCTAssertEqual(core.configuration?.reactVersion, "18.2.0")
        XCTAssertEqual(core.configuration?.reactNativeVersion, "0.71.0")
    }

    func testDropsResourceMarkedAsDropped() throws {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        let resourceEventMapper = try XCTUnwrap(ddConfig.resourceEventMapper)

        let mockDroppedResourceEvent = RUMResourceEvent.mockRandomDropped()
        let mappedDroppedEvent = resourceEventMapper(mockDroppedResourceEvent)
        XCTAssertNil(mappedDroppedEvent)

        let mockResourceEvent = RUMResourceEvent.mockRandom()
        let mappedEvent = resourceEventMapper(mockResourceEvent)
        XCTAssertNotNil(mappedEvent)
    }

    func testResourceAttributesProviderMarksTrackedByRequestsAsDropped() throws {
        let rumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.firstPartyHosts = ["example.com": [.datadog]]
        let configuration: DdSdkConfiguration = .mockAny(rumConfiguration: rumConfiguration)

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        let resourceAttributesProvider = try XCTUnwrap(
            ddConfig.urlSessionTracking?.resourceAttributesProvider
        )

        // Request with x-datadog-tracked-by header should be marked for dropping
        let trackedRequest = URLRequest.mockWith(headerFields: [InternalConfigurationAttributes.trackedByHeaderKey: InternalConfigurationAttributes.trackedByHeaderValue])
        let trackedAttributes = resourceAttributesProvider(trackedRequest, nil, nil, nil)
        XCTAssertNotNil(trackedAttributes)
        XCTAssertEqual(trackedAttributes?[InternalConfigurationAttributes.dropResource] as? Bool, true)

        // Request without the header should not be marked for dropping
        let untrackedRequest = URLRequest.mockWith(headerFields: [:])
        let untrackedAttributes = resourceAttributesProvider(untrackedRequest, nil, nil, nil)
        XCTAssertNil(untrackedAttributes)
    }

    func testDropsActionMarkedAsDropped() throws {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        let actionEventMapper = try XCTUnwrap(ddConfig.actionEventMapper)

        let mockDroppedActionEvent = RUMActionEvent.mockRandomDropped()
        let mappedDroppedEvent = actionEventMapper(mockDroppedActionEvent)
        XCTAssertNil(mappedDroppedEvent)

        let mockActionEvent = RUMActionEvent.mockRandom()
        let mappedEvent = actionEventMapper(mockActionEvent)
        XCTAssertNotNil(mappedEvent)
    }

    func testDropsErrorMarkedAsDropped() throws {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        let errorEventMapper = try XCTUnwrap(ddConfig.errorEventMapper)

        let mockDroppedErrorEvent = RUMErrorEvent.mockRandomDropped()
        let mappedDroppedEvent = errorEventMapper(mockDroppedErrorEvent)
        XCTAssertNil(mappedDroppedEvent)

        let mockErrorEvent = RUMErrorEvent.mockRandom()
        let mappedEvent = errorEventMapper(mockErrorEvent)
        XCTAssertNotNil(mappedEvent)
    }

    func testReactNativeThreadMonitorsRunOnBridge() throws {
        let bridge = DispatchQueueMock()
        let mockJSRefreshRateMonitor = MockJSRefreshRateMonitor()
        let rumConfiguration = NSMutableDictionary(dictionary: DefaultRumConfigurationDict)
        rumConfiguration["longTaskThresholdMs"] = 0.2

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: bridge,
            jsRefreshRateMonitor: mockJSRefreshRateMonitor,
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(
            configuration: .mockAny(rumConfiguration: rumConfiguration),
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertTrue(bridge.isSameQueue(queue: mockJSRefreshRateMonitor.jsQueue!))
    }

    func testCallsOnSdkInitializedListeners() throws {
        let bridge = DispatchQueueMock()
        let mockJSRefreshRateMonitor = MockJSRefreshRateMonitor()
        let mockListener = MockOnSdkInitializedListener()

        DatadogSDKWrapper.shared.addOnSdkInitializedListener(listener: mockListener.listener)

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: bridge,
            jsRefreshRateMonitor: mockJSRefreshRateMonitor,
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(
            configuration: .mockAny(),
            resolve: mockResolve,
            reject: mockReject
        )

        XCTAssertTrue(mockListener.called)
    }

    func testInitialResourceThreshold() {
        let rumConfiguration: RumConfiguration = makeDefaultRumConfiguration()
        rumConfiguration.initialResourceThreshold = 0.5
        let configuration: DdSdkConfiguration = .mockAny(rumConfiguration: rumConfiguration)

        let ddConfig = DdSdkNativeInitialization().buildRumConfiguration(
            configuration: configuration
        )

        let predicate = ddConfig.networkSettledResourcePredicate
        let earlyResource = TNSResourceParams(
            url: "https://datadoghq.com",
            timeSinceViewStart: 0.1,
            viewName: "Home"
        )

        let onThresholdLimitResource = TNSResourceParams(
            url: "https://datadoghq.com",
            timeSinceViewStart: 0.5,
            viewName: "Home"
        )

        let lateResource = TNSResourceParams(
            url: "https://datadoghq.com",
            timeSinceViewStart: 0.6,
            viewName: "Home"
        )

        XCTAssertTrue(predicate is TimeBasedTNSResourcePredicate)
        XCTAssertTrue(predicate.isInitialResource(from: earlyResource))
        XCTAssertTrue(predicate.isInitialResource(from: onThresholdLimitResource))
        XCTAssertFalse(predicate.isInitialResource(from: lateResource))
    }

    func testClearAllData() throws {
        // Given
        let bridge = DispatchQueueMock()
        let mockJSRefreshRateMonitor = MockJSRefreshRateMonitor()

        let sdk = DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: bridge,
            jsRefreshRateMonitor: mockJSRefreshRateMonitor,
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        )
        sdk.initialize(
            configuration: .mockAny(),
            resolve: mockResolve,
            reject: mockReject
        )

        let core = try XCTUnwrap(CoreRegistry.default as? DatadogCore)
        // On SDK init, underlying `ConsentAwareDataWriter` performs data migration for each feature, which includes
        // data removal in `unauthorised` (`.pending`) directory. To not cause test flakiness, we must ensure that
        // mock data is written only after this operation completes - otherwise, migration may delete mocked files.
        core.readWriteQueue.sync {}

        let featureDirectories: [FeatureDirectories] = try [
            core.directory.getFeatureDirectories(forFeatureNamed: "logging"),
            core.directory.getFeatureDirectories(forFeatureNamed: "tracing"),
        ]

        let allDirectories: [Directory] = featureDirectories.flatMap {
            [$0.authorized, $0.unauthorized]
        }
        try allDirectories.forEach { directory in _ = try directory.createFile(named: .mockRandom())
        }

        let numberOfFiles = try allDirectories.reduce(0) { acc, nextDirectory in
            try acc + nextDirectory.files().count
        }
        XCTAssertEqual(
            numberOfFiles, 4, "Each feature stores 2 files - one authorised and one unauthorised")

        // When
        sdk.clearAllData(resolve: mockResolve, reject: mockReject)

        // Wait for async clear completion in all features:
        core.readWriteQueue.sync {}

        // Then
        let newNumberOfFiles = try allDirectories.reduce(0) { acc, nextDirectory in
            try acc + nextDirectory.files().count
        }
        XCTAssertEqual(newNumberOfFiles, 0, "All files must be removed")
    }
}

private final class MockJSRefreshRateMonitor: RefreshRateMonitor {
    private var refreshRateListener: RefreshRateListener?
    private var frameTimeCallback: frame_time_callback?
    var isStarted: Bool = false
    private(set) var jsQueue: DispatchQueueType?

    init() {}

    public func startMonitoring(
        jsQueue: DispatchQueueType, frameTimeCallback: @escaping frame_time_callback
    ) {
        self.frameTimeCallback = frameTimeCallback
        self.jsQueue = jsQueue
        isStarted = true
    }

    func executeFrameCallback(frameTime: TimeInterval) {
        frameTimeCallback?(frameTime)
    }
}

func makeDefaultRumConfiguration() -> RumConfiguration {
    RumConfiguration(
        applicationId: "app-id",
        trackFrustrations: nil,
        longTaskThresholdMs: 0.0,
        sessionSampleRate: 75.0,
        resourceTraceSampleRate: 80.0,
        vitalsUpdateFrequency: nil,
        trackBackgroundEvents: nil,
        nativeCrashReportEnabled: nil,
        nativeLongTaskThresholdMs: nil,
        nativeViewTracking: nil,
        nativeInteractionTracking: nil,
        firstPartyHosts: nil,
        appHangThreshold: nil,
        trackWatchdogTerminations: false,
        initialResourceThreshold: nil,
        trackMemoryWarnings: true,
        telemetrySampleRate: 45.0,
        customEndpoint: nil
    )
}

func makeDefaultLogsConfiguration() -> LogsConfiguration {
    LogsConfiguration(
        bundleLogsWithRum: true,
        bundleLogsWithTraces: true,
        customEndpoint: nil
    )
}

func makeDefaultTraceConfiguration() -> TraceConfiguration {
    TraceConfiguration(
        customEndpoint: nil
    )
}

extension DdSdkConfiguration {
    static func mockAny(
        additionalConfiguration: NSDictionary? = nil,
        clientToken: NSString = "client-token",
        env: NSString = "env",
        site: NSString? = nil,
        service: NSString? = nil,
        verbosity: NSString? = nil,
        trackingConsent: NSString? = "pending",
        uploadFrequency: NSString? = "AVERAGE",
        batchSize: NSString? = "MEDIUM",
        batchProcessingLevel: NSString? = "MEDIUM",
        proxyConfiguration: [AnyHashable: Any]? = nil,
        rumConfiguration: RumConfiguration? = makeDefaultRumConfiguration(),
        logsConfiguration: LogsConfiguration? = makeDefaultLogsConfiguration(),
        traceConfiguration: TraceConfiguration? = makeDefaultTraceConfiguration(),
        configurationForTelemetry: NSDictionary? = nil
    ) -> DdSdkConfiguration {
        return DdSdkConfiguration(
            additionalConfiguration: additionalConfiguration,
            clientToken: clientToken as String,
            env: env as String,
            site: site.asSite(),
            service: service,
            verbosity: verbosity,
            trackingConsent: trackingConsent.asTrackingConsent(),
            uploadFrequency: uploadFrequency.asUploadFrequency(),
            batchSize: batchSize.asBatchSize(),
            batchProcessingLevel: batchProcessingLevel.asBatchProcessingLevel(),
            proxyConfiguration: proxyConfiguration,
            rumConfiguration: rumConfiguration,
            logsConfiguration: logsConfiguration,
            traceConfiguration: traceConfiguration,
            configurationForTelemetry: configurationForTelemetry?.asConfigurationForTelemetry()
        )
    }
}

let DefaultRumConfigurationDict: NSDictionary = [
    "applicationId": "app-id",
    "longTaskThresHoldMs": 0.0,
    "sessionSampleRate": 75.0,
    "resourceTraceSampleRate": 80.0,
    "trackWatchdogTerminations": false,
    "trackMemoryWarnings": true,
    "telemetrySampleRate": 45.0,
]

let DefaultLogsConfigurationDict: NSDictionary = [
    "bundleLogsWithRum": true,
    "bundleLogsWithTraces": true,
]

let DefaultTraceConfigurationDict: NSDictionary = [:]

extension NSDictionary {
    static func mockAny(
        additionalConfiguration: NSDictionary? = nil,
        clientToken: NSString = "client-token",
        env: NSString = "env",
        site: NSString? = nil,
        service: NSString? = nil,
        verbosity: NSString? = nil,
        trackingConsent: NSString? = "pending",
        uploadFrequency: NSString? = "AVERAGE",
        batchSize: NSString? = "MEDIUM",
        batchProcessingLevel: NSString? = "MEDIUM",
        proxyConfiguration: [AnyHashable: Any]? = nil,
        firstPartyHosts: [String: Set<TracingHeaderType>]? = nil,
        rumConfiguration: NSDictionary? = DefaultRumConfigurationDict,
        logsConfiguration: NSDictionary? = DefaultLogsConfigurationDict,
        traceConfiguration: NSDictionary? = DefaultTraceConfigurationDict,
        configurationForTelemetry: NSDictionary? = nil
    ) -> NSDictionary {
        let config = NSMutableDictionary()
        let rumConfig = NSMutableDictionary()
        let logsConfig = NSMutableDictionary()
        let traceConfig = NSMutableDictionary()

        config["additionalConfiguration"] = additionalConfiguration
        config["clientToken"] = clientToken
        config["env"] = env
        config["site"] = site
        config["service"] = service
        config["verbosity"] = verbosity
        config["uploadFrequency"] = uploadFrequency
        config["batchSize"] = batchSize
        config["batchProcessingLevel"] = batchProcessingLevel
        config["proxyConfiguration"] = proxyConfiguration
        config["trackingConsent"] = trackingConsent
        config["firstPartyHosts"] = firstPartyHosts
        config["rumConfiguration"] = rumConfig
        config["logsConfiguration"] = logsConfig
        config["traceConfiguration"] = traceConfig
        config["configurationForTelemetry"] = configurationForTelemetry

        rumConfig["applicationId"] = rumConfiguration?["applicationId"]
        rumConfig["sesionSampleRate"] = rumConfiguration?["sessionSampleRate"]
        rumConfig["resourceTraceSampleRate"] = rumConfiguration?["resourceTraceSampleRate"]
        rumConfig["longTaskThresholdMs"] = rumConfiguration?["longTaskThresholdMs"]
        rumConfig["telemetrySampleRate"] = rumConfiguration?["telemetrySampleRate"]
        rumConfig["vitalsUpdateFrequency"] = rumConfiguration?["vitalsUpdateFrequency"]
        rumConfig["trackBackgroundEvents"] = rumConfiguration?["trackBackgroundEvents"]
        rumConfig["nativeCrashReportEnabled"] = rumConfiguration?["nativeCrashReportEnabled"]
        rumConfig["nativeLongTaskThresholdMs"] = rumConfiguration?["nativeLongTaskThresholdMs"]
        rumConfig["nativeViewTracking"] = rumConfiguration?["nativeViewTracking"]
        rumConfig["nativeInteractionTracking"] = rumConfiguration?["nativeInteractionTracking"]
        rumConfig["customEndpoint"] = rumConfiguration?["customEndpoint"]
        rumConfig["trackFrustrations"] = rumConfiguration?["trackFrustrations"]

        logsConfig["bundleLogsWithRum"] = logsConfiguration?["bundleLogsWithRum"]
        logsConfig["bundleLogsWithTraces"] = logsConfiguration?["bundleLogsWithTraces"]
        logsConfig["customEndpoint"] = logsConfiguration?["customEndpoint"]

        traceConfig["customEndpoint"] = traceConfiguration?["customEndpoint"]

        return config
    }
}

extension DdSdkImplementation {
    override convenience init() {
        self.init(
            mainDispatchQueue: DispatchQueue.main,
            jsDispatchQueue: DispatchQueue.main,
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        )
    }
}

class MockOnSdkInitializedListener {
    var called = false
    var receivedCore: DatadogCoreProtocol?

    lazy var listener: OnSdkInitializedListener = { core in
        self.called = true
        self.receivedCore = core
    }
}
