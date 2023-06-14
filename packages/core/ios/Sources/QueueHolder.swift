/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import React

internal let sharedQueue = DispatchQueue(label: "dd-react-native-sdk")

@objc
open class RNQueue: NSObject {
    @objc
    public static func getSharedQueue() -> DispatchQueue {
        return sharedQueue
    }
}

protocol DispatchQueueType {
    func async(execute work: @escaping @convention(block) () -> Void)
}

extension DispatchQueue: DispatchQueueType {
    func async(execute work: @escaping @convention(block) () -> Void) {
        async(group: nil, qos: .unspecified, flags: [], execute: work)
    }
}

extension RCTBridge: DispatchQueueType {
    func async(execute work: @escaping @convention(block) () -> Void) {
        self.dispatchBlock(work, queue: RCTJSThread)
    }
}
