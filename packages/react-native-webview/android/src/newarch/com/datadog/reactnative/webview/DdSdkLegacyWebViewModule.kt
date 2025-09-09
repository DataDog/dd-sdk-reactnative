/*
* Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
* This product includes software developed at Datadog (https://www.datadoghq.com/).
* Copyright 2016-Present Datadog, Inc.
*/
package com.datadog.reactnative.webview

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod

class DdSdkLegacyWebViewModule(
    reactContext: ReactApplicationContext
) : NativeDdWebViewLegacySpec(reactContext) {
    private val implementation = DdSdkLegacyWebViewImplementation()
    override fun getName(): String = DdSdkLegacyWebViewImplementation.NAME

    /**
     * Sends WebView Events.
     * @param message User action.
     */
    @ReactMethod
    override fun consumeWebviewEvent(message: String, promise: Promise) {
        implementation.consumeWebviewEvent(message)
        promise.resolve(null)
    }
}