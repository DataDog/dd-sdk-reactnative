/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import UIKit

typealias frame_time_callback = (_ frameTime: Double, _ displayFps: Double) -> Void

internal protocol RefreshRateListener {
    func start()
    func stop()
}

internal protocol RefreshRateMonitor {
    func startMonitoring(jsQueue: DispatchQueueType, frameTimeCallback: @escaping frame_time_callback)
}

typealias refresh_rate_listener_factory = (
    _ jsQueue: DispatchQueueType, _ frameTimeCallback: @escaping frame_time_callback
) -> RefreshRateListener

internal final class JSRefreshRateMonitor: RefreshRateMonitor {
    private var refreshRateListener: RefreshRateListener
    private let notificationCenter: NotificationCenter
    private let queue: DispatchQueueType
    private let listenerFactory: refresh_rate_listener_factory

    init(
        notificationCenter: NotificationCenter = .default,
        queue: DispatchQueueType = sharedQueue,
        listenerFactory: @escaping refresh_rate_listener_factory = {
            JSRefreshRateListener(jsQueue: $0, frameTimeCallback: $1)
        }
    ) {
        self.refreshRateListener = NoOpRefreshRateListener()
        self.notificationCenter = notificationCenter
        self.queue = queue
        self.listenerFactory = listenerFactory

        // CADisplayLink does not tick while the app is in the background, so the listener must be
        // paused, otherwise the whole background duration is reported as a single JS frame.
        notificationCenter.addObserver(
            self, selector: #selector(appWillResignActive),
            name: UIApplication.willResignActiveNotification, object: nil)
        notificationCenter.addObserver(
            self, selector: #selector(appDidBecomeActive),
            name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    deinit {
        notificationCenter.removeObserver(self)
    }

    public func startMonitoring(jsQueue: DispatchQueueType, frameTimeCallback: @escaping frame_time_callback) {
        self.refreshRateListener.stop()
        self.refreshRateListener = listenerFactory(jsQueue, frameTimeCallback)
        self.refreshRateListener.start()
    }

    // Notifications are posted on the main thread, while `startMonitoring` runs on the shared queue.
    @objc func appWillResignActive() {
        queue.async {
            self.refreshRateListener.stop()
        }
    }

    @objc func appDidBecomeActive() {
        queue.async {
            self.refreshRateListener.start()
        }
    }

    class func requiresMainQueueSetup() -> Bool {
        return true
    }
}

private final class NoOpRefreshRateListener: RefreshRateListener {
    init() {}
    func start() {}
    func stop() {}

}

internal final class JSRefreshRateListener: RefreshRateListener {
    private var jsQueue: DispatchQueueType
    private var frameTimeCallback: frame_time_callback
    private var lastFrameTimestamp: TimeInterval = -1
    private var displayFps: Double = -1
    private var jsDisplayLink: CADisplayLink?

    init(jsQueue: DispatchQueueType, frameTimeCallback: @escaping frame_time_callback) {
        self.jsQueue = jsQueue
        self.frameTimeCallback = frameTimeCallback
    }

    public func start() {
        jsQueue.async {
            self.jsDisplayLink?.invalidate()
            // The first frame after (re)starting must not be measured against a frame from before the pause.
            self.lastFrameTimestamp = -1
            self.jsDisplayLink = CADisplayLink(target: self, selector: #selector(self.onFrameTick))
            self.jsDisplayLink?.add(to: .current, forMode: .common)
        }
    }

    public func stop() {
        jsQueue.async {
            self.jsDisplayLink?.invalidate()
            self.jsDisplayLink = nil
        }
    }

    @objc func onFrameTick(displayLink: CADisplayLink) {
        onFrame(timestamp: displayLink.timestamp, targetTimestamp: displayLink.targetTimestamp)
    }

    func onFrame(timestamp frameTimestamp: TimeInterval, targetTimestamp: TimeInterval) {
        if lastFrameTimestamp != -1 {
            let frameDuration = frameTimestamp - lastFrameTimestamp
            frameTimeCallback(frameDuration, displayFps)
        }
        lastFrameTimestamp = frameTimestamp

        // Refresh rate the display is currently running at
        displayFps = 1.0 / (targetTimestamp - frameTimestamp)
    }
}
