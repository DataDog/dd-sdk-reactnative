/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation

internal typealias frame_time_callback = (Double) -> Void

internal protocol RefreshRateListener {
    func start()
    func stop()
}

internal protocol RefreshRateMonitor {
    func startMonitoring(jsQueue: DispatchQueueType, frameTimeCallback: @escaping frame_time_callback)
}

internal final class JSRefreshRateMonitor: RefreshRateMonitor {
    private var refreshRateListener: RefreshRateListener

    init() {
        self.refreshRateListener = NoOpRefreshRateListener()
    }

    func startMonitoring(jsQueue: DispatchQueueType, frameTimeCallback: @escaping frame_time_callback) {
        self.refreshRateListener = JSRefreshRateListener(jsQueue: jsQueue, frameTimeCallback: frameTimeCallback)
        self.refreshRateListener.start()
    }

    func appWillResignActive() {
        self.refreshRateListener.stop()
    }

    func appDidBecomeActive() {
        self.refreshRateListener.start()
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

private final class JSRefreshRateListener: RefreshRateListener {
    private var jsQueue: DispatchQueueType
    private var frameTimeCallback: frame_time_callback
    private var lastFrameTimestamp: TimeInterval = -1
    private var jsDisplayLink: CADisplayLink?

    init(jsQueue: DispatchQueueType, frameTimeCallback: @escaping frame_time_callback) {
        self.jsQueue = jsQueue
        self.frameTimeCallback = frameTimeCallback
    }

    func start() {
        jsQueue.async {
            self.jsDisplayLink?.invalidate()
            self.jsDisplayLink = CADisplayLink(target: self, selector: #selector(self.onFrameTick))
            self.jsDisplayLink?.add(to: .current, forMode: .common)
        }
    }

    func stop() {
        jsQueue.async {
            self.jsDisplayLink?.invalidate()
            self.jsDisplayLink = nil
        }
    }

    @objc
    func onFrameTick(displayLink: CADisplayLink) {
        let frameTimestamp = displayLink.timestamp
        if lastFrameTimestamp != -1 {
            let frameDuration = frameTimestamp - lastFrameTimestamp
            frameTimeCallback(frameDuration)
        }
        lastFrameTimestamp = frameTimestamp
    }
}
