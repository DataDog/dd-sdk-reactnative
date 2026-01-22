/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-Present Datadog, Inc.
 */

import XCTest
@testable import DatadogSDKReactNative
@testable import DatadogInternal

class DdSdkNativeInitializationTests: XCTestCase {
    var consoleMessage = ""

    override func setUp() {
        super.setUp()
    }

    override func tearDown() {
        super.tearDown()
    }
    
    func testReturnsConfigurationWithAllData() {
        let mockJSONFileReader = MockJSONFileReader(mockResourceFilePath: "Fixtures/complete-configuration")
        let nativeInitialization = DdSdkNativeInitialization(
            jsonFileReader: mockJSONFileReader
        )
        
        let configuration = nativeInitialization.getConfigurationFromJSONFile()
        XCTAssertEqual(configuration?.clientToken, "fake-client-token")
        XCTAssertEqual(configuration?.env, "fake-env")
        XCTAssertEqual(configuration?.rumConfiguration?.applicationId, "fake-app-id")
        XCTAssertEqual(configuration?.rumConfiguration?.longTaskThresholdMs, 44.0)
        XCTAssertEqual(configuration?.rumConfiguration?.sessionSampleRate, 80.0)
        XCTAssertEqual(configuration?.site, .us3)
        XCTAssertEqual(configuration?.trackingConsent, .notGranted)
        XCTAssertEqual(configuration?.rumConfiguration?.telemetrySampleRate, 60.0)
        XCTAssertEqual(configuration?.rumConfiguration?.vitalsUpdateFrequency, .none)
        XCTAssertEqual(configuration?.rumConfiguration?.trackFrustrations, false)
        XCTAssertEqual(configuration?.uploadFrequency, .frequent)
        XCTAssertEqual(configuration?.batchSize, .small)
        XCTAssertEqual(configuration?.rumConfiguration?.trackBackgroundEvents, true)
        XCTAssertEqual(configuration?.rumConfiguration?.customEndpoint, "https://rum.example.com")
        XCTAssertEqual(configuration?.logsConfiguration?.customEndpoint, "https://logs.example.com")
        XCTAssertEqual(configuration?.traceConfiguration?.customEndpoint, "https://trace.example.com")
        XCTAssertEqual(configuration?.additionalConfiguration?["_dd.source"] as! String, "react-native")
        XCTAssertEqual(configuration?.additionalConfiguration?["_dd.sdk_version"] as! String, SdkVersion)
        XCTAssertEqual(configuration?.configurationForTelemetry, nil)
        XCTAssertEqual(configuration?.rumConfiguration?.nativeCrashReportEnabled, true)
        XCTAssertEqual(configuration?.rumConfiguration?.nativeLongTaskThresholdMs, 333.0)
        XCTAssertEqual(configuration?.rumConfiguration?.nativeViewTracking, true)
        XCTAssertEqual(configuration?.rumConfiguration?.nativeInteractionTracking, true)
        XCTAssertEqual(configuration?.verbosity, "WARN")
        XCTAssertEqual(configuration?.service, "my.app")
        XCTAssertEqual(configuration?.proxyConfiguration?["HTTPEnable"] as? Int, 1)
        XCTAssertEqual(configuration?.proxyConfiguration?["HTTPProxy"] as? String, "1.1.1.1")
        XCTAssertEqual(configuration?.proxyConfiguration?["HTTPPort"] as? Int, 4444)
        XCTAssertEqual(configuration?.proxyConfiguration?[kCFProxyUsernameKey] as? String, "proxyusername")
        XCTAssertEqual(configuration?.proxyConfiguration?[kCFProxyPasswordKey] as? String, "proxypassword")
        let expectedFirstPartyHosts: [String: Set<TracingHeaderType>]? = ["example.com": [.b3multi, .tracecontext]]
        XCTAssertEqual(configuration?.firstPartyHosts, expectedFirstPartyHosts)
        XCTAssertEqual(configuration?.rumConfiguration?.initialResourceThreshold, 0.5)
    }

    func testReturnsConfigurationWithMinimalData() {
        let mockJSONFileReader = MockJSONFileReader(mockResourceFilePath: "Fixtures/minimal-configuration")
        let nativeInitialization = DdSdkNativeInitialization(
            jsonFileReader: mockJSONFileReader
        )
        
        let configuration = nativeInitialization.getConfigurationFromJSONFile()
        XCTAssertEqual(configuration?.clientToken, "fake-client-token")
        XCTAssertEqual(configuration?.env, "fake-env")
        XCTAssertEqual(configuration?.rumConfiguration?.applicationId, "fake-app-id")
        XCTAssertEqual(configuration?.rumConfiguration?.longTaskThresholdMs, 0.0)
        XCTAssertEqual(configuration?.rumConfiguration?.sessionSampleRate, 100.0)
        XCTAssertEqual(configuration?.site, .us1)
        XCTAssertEqual(configuration?.trackingConsent, .pending) // This is different from JS and Android which have granted by default.
        XCTAssertEqual(configuration?.rumConfiguration?.telemetrySampleRate, 20.0)
        XCTAssertEqual(configuration?.rumConfiguration?.vitalsUpdateFrequency, .average)
        XCTAssertEqual(configuration?.rumConfiguration?.trackFrustrations, true)
        XCTAssertEqual(configuration?.uploadFrequency, .average)
        XCTAssertEqual(configuration?.batchSize, .medium)
        XCTAssertEqual(configuration?.rumConfiguration?.trackBackgroundEvents, false)
        XCTAssertEqual(configuration?.rumConfiguration?.customEndpoint, nil)
        XCTAssertEqual(configuration?.logsConfiguration?.customEndpoint, nil)
        XCTAssertEqual(configuration?.traceConfiguration?.customEndpoint, nil)
        XCTAssertEqual(configuration?.additionalConfiguration?["_dd.source"] as! String, "react-native")
        XCTAssertEqual(configuration?.additionalConfiguration?["_dd.sdk_version"] as! String, SdkVersion)
        XCTAssertEqual(configuration?.configurationForTelemetry, nil)
        XCTAssertEqual(configuration?.rumConfiguration?.nativeCrashReportEnabled, false)
        XCTAssertEqual(configuration?.rumConfiguration?.nativeLongTaskThresholdMs, 200.0)
        XCTAssertEqual(configuration?.rumConfiguration?.nativeViewTracking, false)
        XCTAssertEqual(configuration?.rumConfiguration?.nativeInteractionTracking, false)
        XCTAssertEqual(configuration?.verbosity, nil)
        XCTAssertEqual(configuration?.service, nil)
        XCTAssertNil(configuration?.proxyConfiguration)
        let expectedFirstPartyHosts: [String: Set<TracingHeaderType>]? = [:]
        XCTAssertEqual(configuration?.firstPartyHosts, expectedFirstPartyHosts)
        XCTAssertEqual(configuration?.rumConfiguration?.initialResourceThreshold, nil)
    }

    func testPrintsMessageWithIncorrectFile() {
        let originalConsolePrint = consolePrint
        defer {
            consolePrint = originalConsolePrint
            self.consoleMessage = ""
        }

        consolePrint = { [weak self] (msg, level) in
            self?.consoleMessage += msg
        }
            
        let mockJSONFileReader = MockJSONFileReader(mockResourceFilePath: "Fixtures/malformed-configuration")
        let nativeInitialization = DdSdkNativeInitialization(
            jsonFileReader: mockJSONFileReader
        )
        
        XCTAssertNil(nativeInitialization.getConfigurationFromJSONFile())
        XCTAssertEqual(self.consoleMessage, "Error parsing datadog-configuration.json file: 🔥 Datadog SDK usage error: JSON configuration file is missing top-level \"configuration\" key.")
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
