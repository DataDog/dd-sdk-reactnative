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
    
    override func setUp() {
        super.setUp()
        Datadog.internalFlushAndDeinitialize()
        DatadogSDKWrapper.shared.setCoreInstance(core: nil)
        DatadogSDKWrapper.shared.onCoreInitializedListeners = []
    }

    func testSDKInitialization() {
        let originalConsolePrint = consolePrint
        defer { consolePrint = originalConsolePrint }

        var printedMessage = ""
        consolePrint = { (msg, level) in printedMessage += msg }

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
    }

    func testBuildConfigurationNoUIKitViewsByDefault() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.uiKitViewsPredicate)
    }

    func testBuildConfigurationUIKitViewsTrackingDisabled() {
        let configuration: DdSdkConfiguration = .mockAny(nativeViewTracking: false)

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.uiKitViewsPredicate)
    }

    func testBuildConfigurationUIKitViewsTrackingEnabled() {
        let configuration: DdSdkConfiguration = .mockAny(nativeViewTracking: true)

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

        XCTAssertNotNil(ddConfig.uiKitViewsPredicate)
    }
    
    func testBuildConfigurationNoUIKitUserActionsByDefault() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.uiKitActionsPredicate)
    }

    func testBuildConfigurationUIKitUserActionsTrackingDisabled() {
        let configuration: DdSdkConfiguration = .mockAny(nativeInteractionTracking: false)

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.uiKitActionsPredicate)
    }

    func testBuildConfigurationUIKitUserActionsTrackingEnabled() {
        let configuration: DdSdkConfiguration = .mockAny(nativeInteractionTracking: true)

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

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
        ).initialize(configuration: validConfiguration, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(Datadog.verbosityLevel, CoreLoggerLevel.debug)

        Datadog.internalFlushAndDeinitialize()
    }

    func testSDKInitializationWithVerbosityInfo() {
        let validConfiguration: NSDictionary = .mockAny(verbosity: "info")

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
        let validConfiguration: NSDictionary = .mockAny(verbosity: "warn")

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
        let validConfiguration: NSDictionary = .mockAny(verbosity: "error")

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
        let validConfiguration: NSDictionary = .mockAny()

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
        let validConfiguration: NSDictionary = .mockAny(verbosity: "foo")

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
    
    func testSDKInitializationWithOnInitializedCallback() {
        var coreFromCallback: DatadogCoreProtocol? = nil
        DatadogSDKWrapper.shared.addOnCoreInitializedListener(listener: { core in
            coreFromCallback = core
        })

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: JSRefreshRateMonitor(),
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(configuration: .mockAny(), resolve: mockResolve, reject: mockReject)

        XCTAssertNotNil(coreFromCallback)

        Datadog.internalFlushAndDeinitialize()
    }
    
    func testEnableAllFeatures() {
        let core = MockDatadogCore()
        let configuration: DdSdkConfiguration = .mockAny()

        DatadogSDKWrapper.shared.setCoreInstance(core: core)
        DdSdkNativeInitialization().enableFeatures(sdkConfiguration: configuration)
        
        XCTAssertNotNil(core.features[RUMFeature.name])
        XCTAssertNotNil(core.features[LogsFeature.name])
        XCTAssertNotNil(core.features[TraceFeature.name])
    }

    func testBuildConfigurationDefaultEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .us1)
    }

    func testBuildConfigurationUSEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .us1)
    }

    func testBuildConfigurationUS1Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US1")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .us1)
    }

    func testBuildConfigurationUS3Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US3")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .us3)
    }

    func testBuildConfigurationUS5Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US5")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .us5)
    }

    func testBuildConfigurationUS1FEDEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "US1_FED")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .us1_fed)
    }

    func testBuildConfigurationGOVEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "GOV")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .us1_fed)
    }

    func testBuildConfigurationEUEndpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "EU")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .eu1)
    }

    func testBuildConfigurationEU1Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "EU1")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .eu1)
    }

    func testBuildConfigurationAP1Endpoint() {
        let configuration: DdSdkConfiguration = .mockAny(site: "AP1")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.site, .ap1)
    }

    func testBuildConfigurationAdditionalConfig() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["foo": "test", "bar": 42])

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

        // swiftlint:disable force_cast
        XCTAssertEqual(ddConfig.additionalConfiguration["foo"] as! String, "test")
        XCTAssertEqual(ddConfig.additionalConfiguration["bar"] as! Int, 42)
        // swiftlint:enable force_cast
    }

    func testBuildConfigurationWithNilServiceNameByDefault() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

        XCTAssertNil(ddConfig.service)
    }

    func testBuildConfigurationWithServiceName() {
        let configuration: DdSdkConfiguration = .mockAny(serviceName: "com.example.app")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.service, "com.example.app")
    }

    func testBuildConfigurationNoCrashReportByDefault() {
        let core = MockDatadogCore()
        let configuration: DdSdkConfiguration = .mockAny(nativeCrashReportEnabled: nil)

        DdSdkNativeInitialization().enableFeatures(sdkConfiguration: configuration)
        
        XCTAssertNil(core.features[CrashReportingFeature.name])
    }

    func testBuildConfigurationNoCrashReport() {
        let core = MockDatadogCore()
        let configuration: DdSdkConfiguration = .mockAny(nativeCrashReportEnabled: false)

        DdSdkNativeInitialization().enableFeatures(sdkConfiguration: configuration)
        
        XCTAssertNil(core.features[CrashReportingFeature.name])
    }

    func testBuildConfigurationWithCrashReport() {
        let core = MockDatadogCore()
        let configuration: DdSdkConfiguration = .mockAny(nativeCrashReportEnabled: true)

        DatadogSDKWrapper.shared.setCoreInstance(core: core)
        DdSdkNativeInitialization().enableFeatures(sdkConfiguration: configuration)
        
        XCTAssertNotNil(core.features[CrashReportingFeature.name])
    }
    
    func testBuildConfigurationWithVersionSuffix() {
        let configuration: DdSdkConfiguration = .mockAny(additionalConfig: ["_dd.version_suffix": ":codepush-3"])

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration, defaultAppVersion: "1.2.3")

        XCTAssertEqual(ddConfig.additionalConfiguration["_dd.version"] as! String, "1.2.3:codepush-3")
    }
    
    func testBuildConfigurationFrustrationTrackingEnabledByDefault() {
        let configuration: DdSdkConfiguration = .mockAny()

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.trackFrustrations, true)
    }
    
    func testBuildConfigurationFrustrationTrackingEnabledExplicitly() {
        let configuration: DdSdkConfiguration = .mockAny(trackFrustrations: true)

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.trackFrustrations, true)
    }
    
    func testBuildConfigurationFrustrationTrackingDisabled() {
        let configuration: DdSdkConfiguration = .mockAny(trackFrustrations: false)

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

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

    func testBuildLongTaskThreshold() {
        let configuration: DdSdkConfiguration = .mockAny(nativeLongTaskThresholdMs: 2_500)

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.longTaskThreshold, 2.5)
    }
    
    func testBuildNoLongTaskTracking() {
        let configuration: DdSdkConfiguration = .mockAny(nativeLongTaskThresholdMs: 0)

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.longTaskThreshold, nil)
    }

    func testFirstPartyHosts() {
        let configuration: DdSdkConfiguration = .mockAny(firstPartyHosts: ([
            ["match": "example.com", "propagatorTypes": ["datadog", "b3"]],
            ["match": "datadog.com",  "propagatorTypes": ["b3multi", "tracecontext"]]
        ] as NSArray).asFirstPartyHosts(), resourceTracingSamplingRate: 66)

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

        let expectedFirstPartyHosts: [String: Set<TracingHeaderType>]? = ["example.com": [.datadog, .b3], "datadog.com": [.b3multi, .tracecontext]]
        var actualFirstPartyHosts: [String: Set<TracingHeaderType>]?
        var actualTracingSamplingRate: Float?
        switch ddConfig.urlSessionTracking?.firstPartyHostsTracing {
            case .trace(_,_): break
            case let .traceWithHeaders(hostsWithHeaders, samplingRate):
                actualFirstPartyHosts = hostsWithHeaders
                actualTracingSamplingRate = samplingRate
                break
            case .none: break
        }

        XCTAssertEqual(actualFirstPartyHosts, expectedFirstPartyHosts)
        XCTAssertEqual(actualTracingSamplingRate, 66)
    }

    func testBuildTelemetrySampleRate() {
        let configuration: DdSdkConfiguration = .mockAny(telemetrySampleRate: 42.0)

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.telemetrySampleRate, 42.0)
    }

    func testProxyConfiguration() {
        let configuration: DdSdkConfiguration = .mockAny(
            proxyConfig: ([
                "type": "http",
                "address": "host",
                "port": 99,
                "username": "username",
                "password": "pwd"
            ] as NSDictionary).asProxyConfig()
        )

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.proxyConfiguration?["HTTPProxy"] as? String, "host")
        XCTAssertEqual(ddConfig.proxyConfiguration?["HTTPPort"] as? NSNumber, 99)
        XCTAssertEqual(ddConfig.proxyConfiguration?[kCFProxyUsernameKey] as? String, "username")
        XCTAssertEqual(ddConfig.proxyConfiguration?[kCFProxyPasswordKey] as? String, "pwd")
    }

    func testBuildConfigurationAverageVitalsUpdateFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(vitalsUpdateFrequency: "average")

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.vitalsUpdateFrequency, .average)
    }

    func testBuildConfigurationNeverVitalsUpdateFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(vitalsUpdateFrequency: "never")

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.vitalsUpdateFrequency, nil)
    }

    func testBuildConfigurationAverageUploadFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(uploadFrequency: "AVERAGE")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.uploadFrequency, .average)
    }

    func testBuildConfigurationFrequentUploadFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(uploadFrequency: "FREQUENT")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.uploadFrequency, .frequent)
    }

    func testBuildConfigurationRareUploadFrequency() {
        let configuration: DdSdkConfiguration = .mockAny(uploadFrequency: "RARE")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.uploadFrequency, .rare)
    }

    func testBuildConfigurationMediumBatchSize() {
        let configuration: DdSdkConfiguration = .mockAny(batchSize: "MEDIUM")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.batchSize, .medium)
    }

    func testBuildConfigurationLargeBatchSize() {
        let configuration: DdSdkConfiguration = .mockAny(batchSize: "LARGE")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.batchSize, .large)
    }

    func testBuildConfigurationSmallBatchSize() {
        let configuration: DdSdkConfiguration = .mockAny(batchSize: "SMALL")

        let ddConfig = DdSdkNativeInitialization().buildSDKConfiguration(configuration: configuration)

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
        // Check that we have jumped to another thread and returned before actually calling RUM:
        XCTAssertEqual(rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds], nil)

        // Wait for async execution on the sharedQueue to be over:
        sharedQueue.sync {}
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
        // Wait for async execution on the sharedQueue to be over:
        sharedQueue.sync {}
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
        // Check that we have jumped to another thread and returned before actually calling RUM:
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.count, 0)

        // Wait for async execution on the sharedQueue to be over:
        sharedQueue.sync {}
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
        // Wait for async execution on the sharedQueue to be over:
        sharedQueue.sync {}
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.count, 0)

        mockRefreshRateMonitor.executeFrameCallback(frameTime: 0.25)
        // Wait for async execution on the sharedQueue to be over:
        sharedQueue.sync {}
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.count, 1)
        XCTAssertEqual(rumMonitorMock.receivedLongTasks.first?.value, 0.25)
        XCTAssertEqual(rumMonitorMock.lastReceivedPerformanceMetrics[.jsFrameTimeSeconds], 0.25)

        Datadog.internalFlushAndDeinitialize()
    }
    
    func testSDKInitializationWithCustomEndpoints() throws {
        let mockRefreshRateMonitor = MockJSRefreshRateMonitor()
        let rumMonitorMock = MockRUMMonitor()

        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: mockRefreshRateMonitor,
            RUMMonitorProvider: { rumMonitorMock },
            RUMMonitorInternalProvider: { rumMonitorMock._internalMock }
        ).initialize(
            configuration: .mockAny(
                customEndpoints: [
                    "rum": "https://rum.example.com",
                    "logs": "https://logs.example.com",
                    "trace": "https://trace.example.com",
                ]
            ),
            resolve: mockResolve,
            reject: mockReject
        )

        let logsFeature = try XCTUnwrap(CoreRegistry.default as? DatadogCore).get(feature: LogsFeature.self)
        let customLogsEndpoint = try XCTUnwrap(logsFeature?.requestBuilder as? DatadogLogs.RequestBuilder).customIntakeURL
        XCTAssertEqual(customLogsEndpoint?.absoluteString, "https://logs.example.com/api/v2/logs")
        
        let rumFeature = try XCTUnwrap(CoreRegistry.default as? DatadogCore).get(feature: RUMFeature.self)
        let customRumEndpoint = try XCTUnwrap(rumFeature?.requestBuilder as? DatadogRUM.RequestBuilder).customIntakeURL
        XCTAssertEqual(customRumEndpoint?.absoluteString, "https://rum.example.com/api/v2/rum")

        let traceFeature = try XCTUnwrap(CoreRegistry.default as? DatadogCore).get(feature: TraceFeature.self)
        let customTraceEndpoint = try XCTUnwrap(traceFeature?.requestBuilder as? TracingRequestBuilder).customIntakeURL
        XCTAssertEqual(customTraceEndpoint?.absoluteString, "https://trace.example.com/api/v2/spans")

        Datadog.internalFlushAndDeinitialize()
    }

    func testSDKInitializationWithLoggerConfiguration() {
        let configuration: NSDictionary = .mockAny(
            bundleLogsWithRum: false,
            bundleLogsWithTraces: false
        )

        let rumMonitorMock = MockRUMMonitor()
        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: DispatchQueueMock(),
            jsRefreshRateMonitor: MockJSRefreshRateMonitor(),
            RUMMonitorProvider: { rumMonitorMock },
            RUMMonitorInternalProvider: { rumMonitorMock._internalMock }
        ).initialize(configuration: configuration, resolve: mockResolve, reject: mockReject)

        XCTAssertFalse(DatadogSDKWrapper.shared.loggerConfiguration.bundleWithRumEnabled)
        XCTAssertFalse(DatadogSDKWrapper.shared.loggerConfiguration.bundleWithTraceEnabled)
    }

    func testBackgroundTrackingEnabled() {
        let configuration: DdSdkConfiguration = .mockAny(trackBackgroundEvents: true)

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.trackBackgroundEvents, true)
    }

    func testBackgroundTrackingDisabled() {
        let configuration: DdSdkConfiguration = .mockAny(trackBackgroundEvents: false)

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

        XCTAssertEqual(ddConfig.trackBackgroundEvents, false)
    }

    func testBackgroundTrackingUndefined() {
        let configuration: DdSdkConfiguration = .mockAny(trackBackgroundEvents: nil)

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

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
        
        DatadogSDKWrapper.shared.setCoreInstance(core: core)
        DdSdkImplementation().overrideReactNativeTelemetry(rnConfiguration: configuration)

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

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

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

        let ddConfig = DdSdkNativeInitialization().buildRUMConfiguration(configuration: configuration)

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
    
    func testCallsOnCoreInitializedListeners() throws {
        let bridge = DispatchQueueMock()
        let mockJSRefreshRateMonitor = MockJSRefreshRateMonitor()
        let mockListener = MockOnCoreInitializedListener()
        DatadogSDKWrapper.shared.addOnCoreInitializedListener(listener: mockListener.listener)
        
        DdSdkImplementation(
            mainDispatchQueue: DispatchQueueMock(),
            jsDispatchQueue: bridge,
            jsRefreshRateMonitor: mockJSRefreshRateMonitor,
            RUMMonitorProvider: { MockRUMMonitor() },
            RUMMonitorInternalProvider: { nil }
        ).initialize(configuration: .mockAny(), resolve: mockResolve, reject: mockReject)

        XCTAssertNotNil(mockListener.core)
    }

    func testConsumeWebviewEventBeforeInitialization() throws {
        XCTAssertNoThrow(try DdSdkImplementation().consumeWebviewEvent(message: "TestMessage", resolve: mockResolve, reject: mockReject))
    }

    func testConsumeWebviewEvent() throws {
        let configuration: DdSdkConfiguration = .mockAny()
        let core = MockDatadogCore()

        DatadogSDKWrapper.shared.setCoreInstance(core: core)
        DdSdkNativeInitialization().enableFeatures(sdkConfiguration: configuration)
        
        DdSdkImplementation().consumeWebviewEvent(message: "{\"eventType\":\"RUM\",\"event\":{\"blabla\":\"custom message\"}}", resolve: mockResolve, reject: mockReject)
        
        XCTAssertNotNil(core.baggages["browser-rum-event"])
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
        sdk.initialize(configuration: .mockAny(), resolve: mockResolve, reject: mockReject)

        let core = try XCTUnwrap(CoreRegistry.default as? DatadogCore)
        // On SDK init, underlying `ConsentAwareDataWriter` performs data migration for each feature, which includes
        // data removal in `unauthorised` (`.pending`) directory. To not cause test flakiness, we must ensure that
        // mock data is written only after this operation completes - otherwise, migration may delete mocked files.
        core.readWriteQueue.sync {}
        
        let featureDirectories: [FeatureDirectories] = [
            try core.directory.getFeatureDirectories(forFeatureNamed: "logging"),
            try core.directory.getFeatureDirectories(forFeatureNamed: "tracing"),
        ]

        let allDirectories: [Directory] = featureDirectories.flatMap { [$0.authorized, $0.unauthorized] }
        try allDirectories.forEach { directory in _ = try directory.createFile(named: .mockRandom()) }

        let numberOfFiles = try allDirectories.reduce(0, { acc, nextDirectory in return try acc + nextDirectory.files().count })
        XCTAssertEqual(numberOfFiles, 4, "Each feature stores 2 files - one authorised and one unauthorised")

        // When
        sdk.clearAllData(resolve: mockResolve, reject: mockReject)

        // Wait for async clear completion in all features:
        core.readWriteQueue.sync {}

        // Then
        let newNumberOfFiles = try allDirectories.reduce(0, { acc, nextDirectory in return try acc + nextDirectory.files().count })
        XCTAssertEqual(newNumberOfFiles, 0, "All files must be removed")

        Datadog.internalFlushAndDeinitialize()
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
        trackingConsent: NSString? = "pending",
        telemetrySampleRate: Double = 45.0,
        vitalsUpdateFrequency: NSString? = "average",
        trackFrustrations: Bool? = nil,
        additionalConfig: NSDictionary? = nil,
        configurationForTelemetry: NSDictionary? = nil,
        uploadFrequency: NSString? = "AVERAGE",
        batchSize: NSString? = "MEDIUM",
        trackBackgroundEvents: Bool? = nil,
        customEndpoints: NSDictionary? = nil,
        nativeViewTracking: Bool? = nil,
        nativeInteractionTracking: Bool? = nil,
        verbosity: NSString? = nil,
        proxyConfig: [AnyHashable: Any]? = nil,
        serviceName: NSString? = nil,
        firstPartyHosts: [String: Set<TracingHeaderType>]? = nil,
        resourceTracingSamplingRate: Double? = nil,
        bundleLogsWithRum: Bool = true,
        bundleLogsWithTraces: Bool = true
    ) -> DdSdkConfiguration {
        DdSdkConfiguration(
            clientToken: clientToken as String,
            env: env as String,
            applicationId: applicationId as String,
            nativeCrashReportEnabled: nativeCrashReportEnabled,
            nativeLongTaskThresholdMs: nativeLongTaskThresholdMs,
            longTaskThresholdMs: longTaskThresholdMs,
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
            proxyConfig: proxyConfig,
            serviceName: serviceName,
            firstPartyHosts: firstPartyHosts,
            resourceTracingSamplingRate: resourceTracingSamplingRate,
            bundleLogsWithRum: bundleLogsWithRum,
            bundleLogsWithTraces: bundleLogsWithTraces
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
        trackBackgroundEvents: Bool? = nil,
        customEndpoints: NSDictionary? = nil,
        nativeViewTracking: Bool? = nil,
        nativeInteractionTracking: Bool? = nil,
        verbosity: NSString? = nil,
        proxyConfig: NSDictionary? = nil,
        serviceName: NSString? = nil,
        firstPartyHosts: NSArray? = nil,
        bundleLogsWithRum: Bool? = nil,
        bundleLogsWithTraces: Bool? = nil
    ) -> NSDictionary {
        var config = NSMutableDictionary()
        config["clientToken"] = clientToken
        config["env"] = env
        config["applicationId"] = applicationId
        config["nativeCrashReportEnabled"] = nativeCrashReportEnabled
        config["nativeLongTaskThresholdMs"] = nativeLongTaskThresholdMs
        config["longTaskThresholdMs"] = longTaskThresholdMs
        config["sampleRate"] = sampleRate
        config["site"] = site
        config["trackingConsent"] = trackingConsent
        config["telemetrySampleRate"] = telemetrySampleRate
        config["vitalsUpdateFrequency"] = vitalsUpdateFrequency
        config["additionalConfig"] = additionalConfig
        config["configurationForTelemetry"] = configurationForTelemetry
        config["trackBackgroundEvents"] = trackBackgroundEvents
        config["uploadFrequency"] = uploadFrequency
        config["batchSize"] = batchSize
        config["customEndpoints"] = customEndpoints
        config["nativeViewTracking"] = nativeViewTracking
        config["nativeInteractionTracking"] = nativeInteractionTracking
        config["verbosity"] = verbosity
        config["proxyConfig"] = proxyConfig
        config["serviceName"] = serviceName
        config["firstPartyHosts"] = firstPartyHosts
        config["bundleLogsWithRum"] = bundleLogsWithRum
        config["bundleLogsWithTraces"] = bundleLogsWithTraces
        return config
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

internal class MockOnCoreInitializedListener {
    var core: DatadogCoreProtocol? = nil
    
    func listener(core: DatadogCoreProtocol) {
        self.core = core
    }
}
