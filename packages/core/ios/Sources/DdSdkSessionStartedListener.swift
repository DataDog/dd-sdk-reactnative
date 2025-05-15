/*
* Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
* This product includes software developed at Datadog (https://www.datadoghq.com/).
* Copyright 2019-2020 Datadog, Inc.
*/

import Foundation
import DatadogRUM
import React

@objc
public class DdSdkSessionStartedListener: NSObject {
    @objc public static var instance: DdSdkSessionStartedListener {
        if _instance == nil {
            _instance = DdSdkSessionStartedListener()
        }
        return _instance!
    }

    @objc public static func invalidate() {
        _instance?.invalidate()
    }

    @objc public private(set) var rumSessionListener: RUM.SessionListener?
    @objc public private(set) var listener: ((String) -> Void)?

    private static let BRIDGE_MODULE_NAME = "DatadogInternalReactBridge"
    private static let BRIDGE_MODULE_METHOD = "__datadogRumSessionStarted"
    private static var _instance: DdSdkSessionStartedListener?

    private var rctBridge: RCTBridge?
    private var lastSessionId: String?

    @objc private override init() {
        super.init()
        self.rumSessionListener = { [weak self] sessionId, isDiscarded in
            self?.lastSessionId = sessionId
            self?.sendSessionStartedToJS(sessionId: sessionId)
        }
    }

    @objc public func setListenerCallback(_ listener: ((String) -> Void)?) {
        self.listener = listener
        guard let sessionId = lastSessionId else {
            return
        }
        sendToJsWithListener(sessionId: sessionId)
    }

    @objc public func setRCTBridge(_ rctBridge: RCTBridge) {
        self.rctBridge = rctBridge
        guard let sessionId = lastSessionId else {
            return
        }
        sendToJsWithBridge(sessionId: sessionId)
    }

    func invalidate() {
        self.rctBridge = nil
        self.listener = nil
    }

    private func sendSessionStartedToJS(sessionId: String) {
        self.lastSessionId = sessionId

        if self.rctBridge != nil {
            sendToJsWithBridge(sessionId: sessionId)
        } else {
            sendToJsWithListener(sessionId: sessionId)
        }
    }

    private func sendToJsWithBridge(sessionId: String) {
        guard
            let rctBridge = self.rctBridge,
            rctBridge.isValid
        else {
            return
        }

        rctBridge.enqueueJSCall(
            DdSdkSessionStartedListener.BRIDGE_MODULE_NAME,
            method: DdSdkSessionStartedListener.BRIDGE_MODULE_METHOD,
            args: [sessionId],
            completion: {}
        )
    }

    private func sendToJsWithListener(sessionId: String) {
        guard let listener = self.listener else {
            return
        }

        listener(sessionId)
    }
}
