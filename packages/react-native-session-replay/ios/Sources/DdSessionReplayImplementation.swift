/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
@_spi(Internal) import DatadogSessionReplay
import DatadogInternal
import DatadogSDKReactNative
import React

@objc
public class DdSessionReplayImplementation: NSObject {
    private lazy var sessionReplay: SessionReplayProtocol = sessionReplayProvider()
    private let sessionReplayProvider: () -> SessionReplayProtocol
    private let uiManager: RCTUIManager
    
    internal init(sessionReplayProvider: @escaping () -> SessionReplayProtocol, uiManager: RCTUIManager) {
        self.sessionReplayProvider = sessionReplayProvider
        self.uiManager = uiManager
    }

    @objc
    public convenience init(bridge: RCTBridge) {
        self.init(
            sessionReplayProvider: { NativeSessionReplay() },
            uiManager: bridge.uiManager
        )
    }

    @objc
    public func enable(replaySampleRate: Double, defaultPrivacyLevel: String, customEndpoint: String, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        var customEndpointURL: URL? = nil
        if (customEndpoint != "") {
            customEndpointURL = URL(string: "\(customEndpoint)/api/v2/replay" as String)
        }
        var sessionReplayConfiguration = SessionReplay.Configuration(
            replaySampleRate: Float(replaySampleRate),
            defaultPrivacyLevel: buildPrivacyLevel(privacyLevel: defaultPrivacyLevel as NSString),
            customEndpoint: customEndpointURL
        )
                    
        sessionReplayConfiguration.setAdditionalNodeRecorders([RCTTextViewRecorder(uiManager: self.uiManager)])

        if let core = DatadogSDKWrapper.shared.getCoreInstance() {
            sessionReplay.enable(
                with: sessionReplayConfiguration,
                in: core
            )
        } else {
            consolePrint("Core instance was not found when initializing Session Replay.", .critical)
        }

        resolve(nil)
    }
    
    func buildPrivacyLevel(privacyLevel: NSString) -> SessionReplay.Configuration.PrivacyLevel {
        switch privacyLevel.lowercased {
        case "mask":
            return .mask
        case "mask_user_input":
            return .maskUserInput
        case "allow":
            return .allow
        default:
            return .mask
        }
    }
}

internal protocol SessionReplayProtocol {
    func enable(
        with configuration: SessionReplay.Configuration,
        in core: DatadogCoreProtocol
    )
}

internal class NativeSessionReplay: SessionReplayProtocol {
    func enable(with configuration: DatadogSessionReplay.SessionReplay.Configuration, in core: DatadogCoreProtocol) {
        SessionReplay.enable(with: configuration, in: core)
    }
}
