/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import DatadogCore
import DatadogInternal

@objc public class RCTDatadogWebViewTracking: NSObject {
    var webView: RCTDatadogWebView? = nil
    var allowedHosts: Set<String> = Set()
    var onSdkInitializedListener: OnSdkInitializedListener?
    
    public override init() {
        super.init()
        self.onSdkInitializedListener = { [weak self] (core: DatadogCoreProtocol) in
            guard let strongSelf = self, let webView = strongSelf.webView else {
                return
            }
            strongSelf.enableWebViewTracking(
                webView: webView,
                allowedHosts: strongSelf.allowedHosts,
                core: CoreRegistry.default
            )
        }
    }
   
    /**
     Enables tracking on the given WebView.
    
     - Parameter webView: The WebView to enable tracking on.
     - Parameter allowedHosts: The allowed hosts.
     - Note: If the SDK core is not available immediately, this method will register a listener and
     enable tracking only when the core will be initialized.
     */
    @objc public func enable(webView: RCTDatadogWebView, allowedHosts: Set<String>) {
        self.webView = webView
        self.allowedHosts = allowedHosts

        guard !webView.isTrackingEnabled else { return }

        if CoreRegistry.isRegistered(instanceName: CoreRegistry.defaultInstanceName) {
            enableWebViewTracking(webView: webView, allowedHosts: allowedHosts, core: CoreRegistry.default)
        } else if let onSdkInitializedListener = self.onSdkInitializedListener {
            DatadogSDKWrapper.shared.addOnSdkInitializedListener(listener: onSdkInitializedListener)
        } else {
            // TODO: Report initialization problem
        }
    }
    

    private func enableWebViewTracking(
        webView: RCTDatadogWebView,
        allowedHosts: Set<String>,
        core: DatadogCoreProtocol
    ) {
        guard let wkWebView = webView.getWKWebView() else {
            return
        }
        DispatchQueue.main.async {
            WebViewTracking.enable(webView: wkWebView, hosts: allowedHosts, in: core)
            self.webView?.isTrackingEnabled = true
        }
    }
}
