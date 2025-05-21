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
    private static let BRIDGE_MODULE_METHOD = "__datadogOnMessageReceived"
    private static let BRIDGE_EVENT_NAME = "RUMSessionStarted"
    private static var _instance: DdSdkSessionStartedListener?

    private var rctBridge: RCTBridge?
    private var rctEventEmitter: RCTEventEmitter?
    private var lastSessionId: String?
    private var hasListeners: Bool = false

    @objc private override init() {
        super.init()
        self.rumSessionListener = { [weak self] sessionId, isDiscarded in
            self?.lastSessionId = sessionId
            self?.tryToSendSessionId()
        }
    }
    
    @objc public func setHasListeners(_ hasListeners: Bool) {
        self.hasListeners = hasListeners
        tryToSendSessionId()
    }

    @objc public func setListenerCallback(_ listener: ((String) -> Void)?) {
        self.listener = listener
        tryToSendSessionId()
    }
    
    @objc public func setRCTBridge(_ rctBridge: RCTBridge) {
        self.rctBridge = rctBridge
        tryToSendSessionId()
    }

    func invalidate() {
        self.rctBridge = nil
        self.listener = nil
        self.hasListeners = false
        self.lastSessionId = nil
    }

    private func tryToSendSessionId() {
        guard let sessionId = self.lastSessionId else {
            return
        }

        if isBridgeless() {
            sendToJsWithListener(sessionId: sessionId)
        } else {
            sendToJsWithBridge(sessionId: sessionId)
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
            args: [DdSdkSessionStartedListener.BRIDGE_EVENT_NAME, sessionId],
            completion: {}
        )
    }

    private func sendToJsWithListener(sessionId: String) {
        guard let listener = self.listener, hasListeners else {
            return
        }
        listener(sessionId)
    }

    private func isBridgeless() -> Bool {
        return self.rctBridge == nil
    }
}
