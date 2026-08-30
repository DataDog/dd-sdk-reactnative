/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2020 Datadog, Inc.
 */

import XCTest
@testable import DatadogSDKReactNativeSessionReplay
import DatadogSessionReplay
import DatadogSDKReactNative
import DatadogInternal
import React

internal class DdSessionReplayTests: XCTestCase {
    private let imagePrivacyMap: [String: ImagePrivacyLevel] = [
        "MASK_ALL": .maskAll,
        "MASK_NON_BUNDLED_ONLY": .maskNonBundledOnly,
        "MASK_NONE": .maskNone
    ]

    private let touchPrivacyMap: [String: TouchPrivacyLevel] = [
        "SHOW": .show,
        "HIDE": .hide
    ]
    
    private let inputPrivacyMap: [String: TextAndInputPrivacyLevel] = [
        "MASK_ALL": .maskAll,
        "MASK_ALL_INPUTS": .maskAllInputs,
        "MASK_SENSITIVE_INPUTS": .maskSensitiveInputs
    ]
    
    private func mockResolve(args: Any?) {}
    private func mockReject(args: String?, arg: String?, err: Error?) {}
    
    override func setUp() {
        super.setUp()
        let mockDatadogCore = MockDatadogCore()
        CoreRegistry.register(default: mockDatadogCore)
    }

    override func tearDown() {
        CoreRegistry.unregisterDefault()
    }
 
    func testEnablesSessionReplayWithZeroReplaySampleRate() {
        let sessionReplayMock = MockSessionReplay()
        let uiManagerMock = MockUIManager()
        let fabricWrapperMock = MockFabricWrapper()
        
        guard
            let imagePrivacyLevel = imagePrivacyMap.keys.randomElement(),
            let imagePrivacy = imagePrivacyMap[imagePrivacyLevel],
            let touchPrivacyLevel = touchPrivacyMap.keys.randomElement(),
            let touchPrivacy = touchPrivacyMap[touchPrivacyLevel],
            let textAndInputPrivacyLevel = inputPrivacyMap.keys.randomElement(),
            let textAndInputPrivacy = inputPrivacyMap[textAndInputPrivacyLevel]
        else {
            XCTFail("Cannot retrieve privacy levels from maps")
            return
        }
        
        DdSessionReplayImplementation(
            sessionReplayProvider:{ sessionReplayMock },
            uiManager: uiManagerMock,
            fabricWrapper: fabricWrapperMock
        ).enable(
            replaySampleRate: 0,
            customEndpoint: "",
            imagePrivacyLevel: NSString(string: imagePrivacyLevel),
            touchPrivacyLevel: NSString(string: touchPrivacyLevel),
            textAndInputPrivacyLevel: NSString(string: textAndInputPrivacyLevel),
            startRecordingImmediately: true,
            enableHeatmaps: false,
            resolve: mockResolve,
            reject: mockReject)

        XCTAssertEqual(sessionReplayMock.calledMethods.first, .enable(
            replaySampleRate: 0.0,
            customEndpoint: nil,
            imagePrivacyLevel: imagePrivacy,
            touchPrivacyLevel: touchPrivacy,
            textAndInputPrivacyLevel: textAndInputPrivacy,
            startRecordingImmediately: true,
            enableHeatmaps: false
        ))
    }

    func testEnablesSessionReplayWithBadPrivacyLevels() {
        let sessionReplayMock = MockSessionReplay()
        let uiManagerMock = MockUIManager()
        let fabricWrapperMock = MockFabricWrapper()
    
        DdSessionReplayImplementation(
            sessionReplayProvider:{ sessionReplayMock },
            uiManager: uiManagerMock,
            fabricWrapper: fabricWrapperMock
        ).enable(
            replaySampleRate: 100,
            customEndpoint: "",
            imagePrivacyLevel: "BAD_VALUE",
            touchPrivacyLevel: "BAD_VALUE",
            textAndInputPrivacyLevel: "BAD_VALUE",
            startRecordingImmediately: true,
            enableHeatmaps: false,
            resolve: mockResolve,
            reject: mockReject)

        XCTAssertEqual(sessionReplayMock.calledMethods.first, .enable(
            replaySampleRate: 100.0,
            customEndpoint: nil,
            imagePrivacyLevel: .maskAll,
            touchPrivacyLevel: .hide,
            textAndInputPrivacyLevel: .maskAll,
            startRecordingImmediately: true,
            enableHeatmaps: false
        ))
    }

    func testEnablesSessionReplayWithCustomEndpoint() {
        let sessionReplayMock = MockSessionReplay()
        let uiManagerMock = MockUIManager()
        let fabricWrapperMock = MockFabricWrapper()
        
        guard
            let imagePrivacyLevel = imagePrivacyMap.keys.randomElement(),
            let imagePrivacy = imagePrivacyMap[imagePrivacyLevel],
            let touchPrivacyLevel = touchPrivacyMap.keys.randomElement(),
            let touchPrivacy = touchPrivacyMap[touchPrivacyLevel],
            let textAndInputPrivacyLevel = inputPrivacyMap.keys.randomElement(),
            let textAndInputPrivacy = inputPrivacyMap[textAndInputPrivacyLevel]
        else {
            XCTFail("Cannot retrieve privacy levels from maps")
            return
        }
        
        DdSessionReplayImplementation(
            sessionReplayProvider:{ sessionReplayMock },
            uiManager: uiManagerMock,
            fabricWrapper: fabricWrapperMock
        ).enable(
            replaySampleRate: 100,
            customEndpoint: "https://session-replay.example.com",
            imagePrivacyLevel: NSString(string: imagePrivacyLevel),
            touchPrivacyLevel: NSString(string: touchPrivacyLevel),
            textAndInputPrivacyLevel: NSString(string: textAndInputPrivacyLevel),
            startRecordingImmediately: true,
            enableHeatmaps: false,
            resolve: mockResolve,
            reject: mockReject)

        XCTAssertEqual(sessionReplayMock.calledMethods.first, .enable(
            replaySampleRate: 100.0,
            customEndpoint: URL(string: "https://session-replay.example.com"),
            imagePrivacyLevel: imagePrivacy,
            touchPrivacyLevel: touchPrivacy,
            textAndInputPrivacyLevel: textAndInputPrivacy,
            startRecordingImmediately: true,
            enableHeatmaps: false
        ))
    }
}

private class MockSessionReplay: SessionReplayProtocol {
    enum CalledMethod: Equatable {
        case enable(
            replaySampleRate: Float,
            customEndpoint: URL?,
            imagePrivacyLevel: ImagePrivacyLevel,
            touchPrivacyLevel: TouchPrivacyLevel,
            textAndInputPrivacyLevel: TextAndInputPrivacyLevel,
            startRecordingImmediately: Bool,
            enableHeatmaps: Bool
        )
        case startRecording
        case stopRecording
    }

    public var calledMethods = [CalledMethod]()

    func enable(with configuration: SessionReplay.Configuration, in core: DatadogCoreProtocol) {
        calledMethods.append(
            .enable(
                replaySampleRate: configuration.replaySampleRate,
                customEndpoint: configuration.customEndpoint,
                imagePrivacyLevel: configuration.imagePrivacyLevel,
                touchPrivacyLevel: configuration.touchPrivacyLevel,
                textAndInputPrivacyLevel: configuration.textAndInputPrivacyLevel,
                startRecordingImmediately: configuration.startRecordingImmediately,
                enableHeatmaps: configuration.featureFlags[.heatmaps] ?? false
            )
        )
    }
    
    func startRecording(in core: any DatadogInternal.DatadogCoreProtocol) {
        calledMethods.append(.startRecording)
    }
    
    func stopRecording(in core: any DatadogInternal.DatadogCoreProtocol) {
        calledMethods.append(.stopRecording)
    }
}

private class MockUIManager: RCTUIManager {}

private class MockFabricWrapper: RCTFabricWrapper {
    override func tryToExtractTextProperties(from view: UIView) -> RCTTextPropertiesWrapper? {
        return nil
    }
}

private class MockDatadogCore: DatadogCoreProtocol {
    func mostRecentModifiedFileAt(before: Date) throws -> Date? {
        return nil
    }
    
    func scope<T>(for featureType: T.Type) -> any DatadogInternal.FeatureScope where T : DatadogInternal.DatadogFeature {
        return NOPFeatureScope()
    }
    
    func feature<T>(named name: String, type: T.Type) -> T? {
        return nil
    }

    func register<T>(feature: T) throws where T : DatadogInternal.DatadogFeature {}
    func send(message: DatadogInternal.FeatureMessage, else fallback: @escaping () -> Void) {}
    func set<Context>(context: @escaping () -> Context?) where Context : DatadogInternal.AdditionalContext {}
}
