/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation

typealias frame_time_callback = (Double) -> Void

internal protocol RefreshRateListener {
    func build(runBlockOnJSThread: @escaping (@escaping () -> Void) -> Void, frameTimeCallback: @escaping frame_time_callback)
    func start()
    func stop()
}

internal final class JSRefreshRateListener: RefreshRateListener {
    private var runBlockOnJSThread: ((@escaping () -> Void) -> Void)?
    private var frameTimeCallback: frame_time_callback?
    private var lastFrameTimestamp: TimeInterval = -1
    private var jsDisplayLink: CADisplayLink?
    
    public func build(runBlockOnJSThread: @escaping (@escaping () -> Void) -> Void, frameTimeCallback: @escaping frame_time_callback) {
        self.runBlockOnJSThread = runBlockOnJSThread
        self.frameTimeCallback = frameTimeCallback
    }

    public func start() {
        jsDisplayLink?.invalidate()

        self.runBlockOnJSThread?({
            self.jsDisplayLink = CADisplayLink(target: self, selector: #selector(self.onFrameTick))
            self.jsDisplayLink?.add(to: .current, forMode: .common)
        })
    }

    public func stop() {
        jsDisplayLink?.invalidate()
        jsDisplayLink = nil
    }

    @objc func onFrameTick(displayLink: CADisplayLink) {
        let frameTimestamp = displayLink.timestamp
        if lastFrameTimestamp != -1 {
            let frameDuration = frameTimestamp - lastFrameTimestamp
            frameTimeCallback?(frameDuration)
        }
        lastFrameTimestamp = frameTimestamp
    }

    func appWillResignActive() {
        stop()
    }

    func appDidBecomeActive() {
        start()
    }

    class func requiresMainQueueSetup() -> Bool {
        return true
    }
}
