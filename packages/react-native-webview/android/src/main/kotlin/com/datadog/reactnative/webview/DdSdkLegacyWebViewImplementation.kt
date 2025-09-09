/*
* Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
* This product includes software developed at Datadog (https://www.datadoghq.com/).
* Copyright 2016-Present Datadog, Inc.
*/
package com.datadog.reactnative.webview

import com.datadog.android.Datadog
import com.datadog.android.webview.WebViewTracking

class DdSdkLegacyWebViewImplementation {
    private var webViewProxy: WebViewTracking._InternalWebViewProxy? = null
        get() {
            if (field == null && Datadog.isInitialized()) {
                field = WebViewTracking._InternalWebViewProxy(
                    Datadog.getInstance()
                )
            }

            return field
        }

    fun consumeWebviewEvent(message: String) {
        webViewProxy?.consumeWebviewEvent(message)
    }

    companion object {
        internal const val NAME = "DdWebViewLegacy"
    }
}