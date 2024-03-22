/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-Present Datadog, Inc.
 */

import XCTest
@testable import DatadogSDKReactNative
@testable import DatadogInternal

class DdSdkNativeInitializationTests: XCTestCase {
    override func setUp() {
        super.setUp()
    }

    override func tearDown() {
        super.tearDown()
    }
    
    func testReturnsConfigurationWithAllData() {
        let mockJSONFileReader = MockJSONFileReader(mockResourceFilePath: "Fixtures/complete-configuration")
        let nativeInitialization = DdSdkNativeInitialization(
            mainDispatchQueue: DispatchQueueMock(),
            jsonFileReader: mockJSONFileReader
        )
        
        let configuration = nativeInitialization.getConfigurationFromJSONFile()
        XCTAssertEqual(configuration?.clientToken, "fake-client-token")
        XCTAssertEqual(configuration?.env, "fake-env")
        XCTAssertEqual(configuration?.applicationId, "fake-app-id")
        XCTAssertEqual(configuration?.nativeCrashReportEnabled, true)
        XCTAssertEqual(configuration?.nativeLongTaskThresholdMs, 333.0)
        XCTAssertEqual(configuration?.longTaskThresholdMs, 44.0)
        XCTAssertEqual(configuration?.sampleRate, 80.0)
        XCTAssertEqual(configuration?.site, .us3)
        XCTAssertEqual(configuration?.trackingConsent, .notGranted)
        XCTAssertEqual(configuration?.telemetrySampleRate, 60.0)
        XCTAssertEqual(configuration?.vitalsUpdateFrequency, .none)
        XCTAssertEqual(configuration?.trackFrustrations, false)
        XCTAssertEqual(configuration?.uploadFrequency, .frequent)
        XCTAssertEqual(configuration?.batchSize, .small)
        XCTAssertEqual(configuration?.trackBackgroundEvents, true)
        XCTAssertEqual(configuration?.customEndpoints?.rum, "https://rum.example.com")
        XCTAssertEqual(configuration?.customEndpoints?.logs, "https://logs.example.com")
        XCTAssertEqual(configuration?.customEndpoints?.trace, "https://trace.example.com")
        XCTAssertEqual(configuration?.additionalConfig?["_dd.source"] as! String, "react-native")
        XCTAssertEqual(configuration?.additionalConfig?["_dd.sdk_version"] as! String, SdkVersion)
        XCTAssertEqual(configuration?.configurationForTelemetry, nil)
        XCTAssertEqual(configuration?.nativeViewTracking, true)
        XCTAssertEqual(configuration?.nativeInteractionTracking, true)
        XCTAssertEqual(configuration?.verbosity, "WARN")
        XCTAssertEqual(configuration?.serviceName, "my.app")
        XCTAssertEqual(configuration?.proxyConfig?["HTTPEnable"] as? Int, 1)
        XCTAssertEqual(configuration?.proxyConfig?["HTTPProxy"] as? String, "1.1.1.1")
        XCTAssertEqual(configuration?.proxyConfig?["HTTPPort"] as? Int, 4444)
        XCTAssertEqual(configuration?.proxyConfig?[kCFProxyUsernameKey] as? String, "proxyusername")
        XCTAssertEqual(configuration?.proxyConfig?[kCFProxyPasswordKey] as? String, "proxypassword")
        let expectedFirstPartyHosts: [String: Set<TracingHeaderType>]? = ["example.com": [.b3multi, .tracecontext]]
        XCTAssertEqual(configuration?.firstPartyHosts, expectedFirstPartyHosts)
    }

    func testReturnsConfigurationWithMinimalData() {
        let mockJSONFileReader = MockJSONFileReader(mockResourceFilePath: "Fixtures/minimal-configuration")
        let nativeInitialization = DdSdkNativeInitialization(
            mainDispatchQueue: DispatchQueueMock(),
            jsonFileReader: mockJSONFileReader
        )
        
        let configuration = nativeInitialization.getConfigurationFromJSONFile()
        XCTAssertEqual(configuration?.clientToken, "fake-client-token")
        XCTAssertEqual(configuration?.env, "fake-env")
        XCTAssertEqual(configuration?.applicationId, "fake-app-id")
        XCTAssertEqual(configuration?.nativeCrashReportEnabled, false)
        XCTAssertEqual(configuration?.nativeLongTaskThresholdMs, 200.0)
        XCTAssertEqual(configuration?.longTaskThresholdMs, 0.0)
        XCTAssertEqual(configuration?.sampleRate, 100.0)
        XCTAssertEqual(configuration?.site, .us1)
        XCTAssertEqual(configuration?.trackingConsent, .pending) // This is different from JS and Android which have granted by default.
        XCTAssertEqual(configuration?.telemetrySampleRate, 20.0)
        XCTAssertEqual(configuration?.vitalsUpdateFrequency, .average)
        XCTAssertEqual(configuration?.trackFrustrations, true)
        XCTAssertEqual(configuration?.uploadFrequency, .average)
        XCTAssertEqual(configuration?.batchSize, .medium)
        XCTAssertEqual(configuration?.trackBackgroundEvents, false)
        XCTAssertEqual(configuration?.customEndpoints, nil)
        XCTAssertEqual(configuration?.additionalConfig?["_dd.source"] as! String, "react-native")
        XCTAssertEqual(configuration?.additionalConfig?["_dd.sdk_version"] as! String, SdkVersion)
        XCTAssertEqual(configuration?.configurationForTelemetry, nil)
        XCTAssertEqual(configuration?.nativeViewTracking, false)
        XCTAssertEqual(configuration?.nativeInteractionTracking, false)
        XCTAssertEqual(configuration?.verbosity, nil)
        XCTAssertEqual(configuration?.serviceName, nil)
        XCTAssertNil(configuration?.proxyConfig)
        let expectedFirstPartyHosts: [String: Set<TracingHeaderType>]? = [:]
        XCTAssertEqual(configuration?.firstPartyHosts, expectedFirstPartyHosts)
    }

    func testPrintsMessageWithIncorrectFile() {
        let originalConsolePrint = consolePrint
        defer { consolePrint = originalConsolePrint }

        var printedMessage = ""
        consolePrint = { (msg, level) in printedMessage += msg }

        let mockJSONFileReader = MockJSONFileReader(mockResourceFilePath: "Fixtures/malformed-configuration")
        let nativeInitialization = DdSdkNativeInitialization(
            mainDispatchQueue: DispatchQueueMock(),
            jsonFileReader: mockJSONFileReader
        )
        
        XCTAssertNil(nativeInitialization.getConfigurationFromJSONFile())
        XCTAssertEqual(printedMessage, "Error parsing datadog-configuration.json file: 🔥 Datadog SDK usage error: JSON configuration file is missing top-level \"configuration\" key.")
    }
}

class MockJSONFileReader: ResourceFileReader {
    let mockResourceFilePath: String
    
    init(mockResourceFilePath: String) {
        self.mockResourceFilePath = mockResourceFilePath
    }
    
    func parseResourceFile(resourcePath: String) -> Any? {
        do {
            let file = Bundle(for: type(of: self)).url(forResource: mockResourceFilePath, withExtension: "json")!
            let data = try Data(contentsOf: file)
            return try JSONSerialization.jsonObject(with: data, options: .mutableLeaves)
        } catch {
            NSLog("Error while parsing mock JSON file \(error)")
        }
        return nil
    }
}
