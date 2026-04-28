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

    // Process-level state — survives instance invalidate() because the JS-side
    // DatadogInternalReactBridge registration survives bridge-lifecycle resets
    // for the lifetime of the JS runtime / process.
    private static var isRnSdkInitialized: Bool = false

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

    /// Called when the RN SDK is initialized from JS. At this point
    /// DatadogInternalReactBridge (the JS-side callable module registered by
    /// BatchedBridge.registerCallableModule) is guaranteed to be registered,
    /// so it is safe to deliver any session ID that was buffered before the
    /// bridge was usable.
    @objc public func onRnSdkInitialized() {
        Self.isRnSdkInitialized = true
        tryToSendSessionId()
    }

    func invalidate() {
        self.rctBridge = nil
        self.listener = nil
        self.hasListeners = false
        self.lastSessionId = nil
        // isRnSdkInitialized is intentionally NOT reset — see field comment.
    }

    private func tryToSendSessionId() {
        guard let sessionId = self.lastSessionId else {
            return
        }

        if isBridgeless() {
            sendToJsWithListener(sessionId: sessionId)
        } else if Self.isRnSdkInitialized {
            sendToJsWithBridge(sessionId: sessionId)
        }
        // else: bridge path is gated until JS DdSdk.initialize() runs, so that
        // DatadogInternalReactBridge is guaranteed to be registered. The cached
        // lastSessionId will be replayed when onRnSdkInitialized() fires.
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

    static func resetIsRnSdkInitializedForTests() {
        isRnSdkInitialized = false
    }

    static func isRnSdkInitializedForTests() -> Bool {
        return isRnSdkInitialized
    }
}
