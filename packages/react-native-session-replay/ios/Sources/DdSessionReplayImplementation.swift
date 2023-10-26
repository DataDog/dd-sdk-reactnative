/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import DatadogSessionReplay
import DatadogInternal

@objc
public class DdSessionReplayImplementation: NSObject {
    private lazy var sessionReplay: SessionReplayProtocol = sessionReplayProvider()
    private let sessionReplayProvider: () -> SessionReplayProtocol
    
    internal init(_ sessionReplayProvider: @escaping () -> SessionReplayProtocol) {
        self.sessionReplayProvider = sessionReplayProvider
    }

    @objc
    public override convenience init() {
        self.init({ NativeSessionReplay() })
    }

    @objc
    public func enable(replaySampleRate: Double, defaultPrivacyLevel: String, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        sessionReplay.enable(
            with: SessionReplay.Configuration(
                replaySampleRate: Float(replaySampleRate),
                defaultPrivacyLevel: buildPrivacyLevel(privacyLevel: defaultPrivacyLevel as NSString)
            )
        )
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
        with configuration: SessionReplay.Configuration
    )
}

internal class NativeSessionReplay: SessionReplayProtocol {
    func enable(with configuration: DatadogSessionReplay.SessionReplay.Configuration) {
        SessionReplay.enable(with: configuration)
    }
}
