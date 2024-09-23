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
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.reactnativecommunity.webview.RNCWebView
import com.reactnativecommunity.webview.RNCWebViewClient
import com.reactnativecommunity.webview.RNCWebViewManager
import com.reactnativecommunity.webview.RNCWebViewWrapper


/**
 * The entry point to use Datadog auto-instrumented WebView feature.
 */
class DdSdkReactNativeWebViewManager(private val reactContext: ReactContext) : RNCWebViewManager() {
    // Custom WebView Client
    private class DatadogWebViewClient : RNCWebViewClient()

    // Custom WebView
    @SuppressLint("SetJavaScriptEnabled")
    private class DatadogWebView(reactContext: ThemedReactContext) : RNCWebView(reactContext) {
        @Volatile
        var isWebViewTrackingEnabled: Boolean = false

        init {
            // JavaScript has to be enabled for auto-instrumentation.
            this.settings.javaScriptEnabled = true
        }

        /**
         * Enables Datadog tracking on the WebView.
         * @param allowedHosts the list of allowed hosts
         */
        fun enableTracking(
            reactContext: ReactContext,
            sdkCore: SdkCore?,
            allowedHosts: List<String>
        ) {
            if (sdkCore != null) {
                enableWebViewTracking(reactContext, sdkCore, allowedHosts)
            } else {
                DatadogSDKWrapperStorage.addOnInitializedListener { core ->
                    enableWebViewTracking(reactContext, core, allowedHosts)
                }
            }
        }

        private fun enableWebViewTracking(
            reactContext: ReactContext,
            sdkCore: SdkCore,
            allowedHosts: List<String>
        ) {
            if (isWebViewTrackingEnabled) {
                return
            }

            WebViewTracking.enable(
                this,
                allowedHosts = allowedHosts,
                sdkCore = sdkCore
            )

            isWebViewTrackingEnabled = true
        }
    }

    // The name used to reference this custom View from React Native.
    companion object {
        const val VIEW_NAME = "DdReactNativeWebView"
    }

    /**
     * The instance of Datadog SDK Core.
     */
    @Volatile
    private var datadogCore: SdkCore? = null

    init {
        DatadogSDKWrapperStorage.addOnInitializedListener { core ->
            datadogCore = core
        }
    }

    // The Custom WebView exposed properties.
    @ReactProp(name = "allowedHosts")
    fun setAllowedHosts(view: RNCWebViewWrapper, allowedHosts: ReadableArray) {
        (view.webView as DatadogWebView).enableTracking(
            reactContext,
            datadogCore,
            toStringList(allowedHosts)
        )
    }

    // Overrides the default ViewInstance by binding the CustomWebView to it.
    override fun createViewInstance(context: ThemedReactContext): RNCWebViewWrapper {
        return super.createViewInstance(context, DatadogWebView(context))
    }

    // Attaches our custom WebView client to the WebView.
    override fun addEventEmitters(
        reactContext: ThemedReactContext,
        view: RNCWebViewWrapper
    ) {
        view.webView.webViewClient = DatadogWebViewClient()
    }

    // Utility function for converting the ReadableArray to a list of strings.
    private fun toStringList(props: ReadableArray): List<String> {
        return props.toArrayList().filterIsInstance<String>()
    }

    // The name used to reference this custom View from React Native.
    override fun getName(): String {
        return VIEW_NAME
    }
}