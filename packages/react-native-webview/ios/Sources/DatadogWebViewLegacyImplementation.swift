/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import DatadogWebViewTracking
import DatadogSDKReactNative
import DatadogCore
import DatadogInternal

@objc public class DatadogWebViewLegacyImplementation: NSObject {
    private var messageEmitter: InternalExtension<WebViewTracking>.AbstractMessageEmitter? = {
        guard Datadog.isInitialized(instanceName: CoreRegistry.defaultInstanceName) else {
            return nil
        }
        return WebViewTracking._internal.messageEmitter(in: CoreRegistry.default)
    }()

    @objc
    public func consumeWebviewEvent(message: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        self.messageEmitter?.send(body: message)
    }
}
