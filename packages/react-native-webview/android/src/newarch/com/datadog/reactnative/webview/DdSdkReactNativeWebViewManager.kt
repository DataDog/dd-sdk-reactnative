/*
* Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
* This product includes software developed at Datadog (https://www.datadoghq.com/).
* Copyright 2016-Present Datadog, Inc.
*/

package com.datadog.reactnative.webview

import android.annotation.SuppressLint
import com.datadog.android.api.SdkCore
import com.datadog.android.webview.WebViewTracking
import com.datadog.reactnative.DatadogSDKWrapperStorage
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.ThemedReactContext
import com.reactnativecommunity.webview.RNCWebView
import com.reactnativecommunity.webview.RNCWebViewClient
import com.reactnativecommunity.webview.RNCWebViewManager
import com.reactnativecommunity.webview.RNCWebViewWrapper
import org.json.JSONArray

/**
 * The entry point to use Datadog auto-instrumented WebView feature.
 */
class DdSdkReactNativeWebViewManager(
    private val reactContext: ReactContext
) : RNCWebViewManager() {
    // The name used to reference this custom View from React Native.
    override fun getName(): String {
        return VIEW_NAME
    }

    /**
     * The instance of Datadog SDK Core.
     */
    @Volatile private var _datadogCore: SdkCore? = null
    val datadogCore: SdkCore?
        get() = _datadogCore

    init {
        DatadogSDKWrapperStorage.addOnInitializedListener { core ->
            _datadogCore = core
        }
    }

    /**
     * Intercepts the WebView wrapper instance before it is returned and ensures that
     * JavaScript is enabled on the underlying WebView. JavaScript must be enabled
     * for Datadog WebView tracking to function correctly.
     */
    @SuppressLint("SetJavaScriptEnabled")
    override fun createViewInstance(context: ThemedReactContext): RNCWebViewWrapper {
        val viewInstance = super.createViewInstance(context)
        viewInstance.webView.settings.javaScriptEnabled = true
        return viewInstance
    }

    /**
     * Intercepts the JavaScript injected before the WebView loads.
     *
     * In the New Architecture, WebView props from React Native are ignored,
     * so this callback is the only reliable place to extract the
     * `// #allowedHosts=<JSON>` configuration and apply Datadog WebView tracking.
     */
    override fun setInjectedJavaScriptBeforeContentLoaded(
        view: RNCWebViewWrapper?,
        value: String?
    ) {
        val allowedHosts = value?.let { extractAllowedHosts(it) }
        val webView = view?.webView

        if (allowedHosts != null && webView != null) {
            configureWebViewTracking(webView, allowedHosts)
        }

        super.setInjectedJavaScriptBeforeContentLoaded(view, value)
    }

    private fun configureWebViewTracking(webView: RNCWebView, allowedHosts: List<String>) {
        val datadogCore = _datadogCore
        if (datadogCore != null) {
            WebViewTracking.enable(
                webView,
                allowedHosts = allowedHosts,
                sdkCore = datadogCore
            )
        } else {
            DatadogSDKWrapperStorage.addOnInitializedListener { core ->
                reactContext.runOnUiQueueThread {
                    WebViewTracking.enable(
                        webView,
                        allowedHosts = allowedHosts,
                        sdkCore = core
                    )
                }
            }
        }
    }

    override fun addEventEmitters(
        reactContext: ThemedReactContext,
        view: RNCWebViewWrapper
    ) {
        view.webView.webViewClient = RNCWebViewClient()
    }

    companion object {
        // The name used to reference this custom View from React Native.
        const val VIEW_NAME = "DdReactNativeWebView"

        private fun extractAllowedHosts(input: String): List<String>? {
            // Regex that captures everything after "// #allowedHosts="
            val regex = Regex("""//\s*#allowedHosts\s*=\s*(.+)""")

            val match = regex.find(input) ?: return null
            val jsonString = match.groupValues[1].trim()

            return try {
                val jsonArray = JSONArray(jsonString)
                (0 until jsonArray.length()).map { jsonArray.getString(it) }
            } catch (e: Exception) {
                null
            }
        }
    }
}
