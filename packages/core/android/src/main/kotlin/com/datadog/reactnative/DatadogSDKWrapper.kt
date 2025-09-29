/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
@file:Suppress("TooManyFunctions")

package com.datadog.reactnative

import android.content.Context
import com.datadog.android.Datadog
import com.datadog.android.api.InternalLogger
import com.datadog.android.api.feature.FeatureSdkCore
import com.datadog.android.core.InternalSdkCore
import com.datadog.android.core.configuration.Configuration
import com.datadog.android.privacy.TrackingConsent
import com.datadog.android.rum.GlobalRumMonitor
import com.datadog.android.rum.RumMonitor
import com.datadog.android.webview.WebViewTracking
import com.facebook.react.bridge.ReadableMap

/**
 * Internal object used to add internal testing.
 */
object DatadogSDKWrapperStorage {
    internal val onInitializedListeners: MutableList<(InternalSdkCore) -> Unit> = mutableListOf()
    private var core: InternalSdkCore? = null

    /**
     * Adds a Listener called when the core is initialized.
     */
    fun addOnInitializedListener(listener: (InternalSdkCore) -> Unit) {
        onInitializedListeners.add(listener)
    }

    /**
     * Exposed for testing purposes only.
     */
    fun notifyOnInitializedListeners(ddCore: InternalSdkCore) {
        for (listener in onInitializedListeners) {
            listener(ddCore)
        }
    }
}

internal class DatadogSDKWrapper : DatadogWrapper {
    override var bundleLogsWithRum = DefaultConfiguration.bundleLogsWithRum
    override var bundleLogsWithTraces = DefaultConfiguration.bundleLogsWithTraces

    // We use Kotlin backing field here to initialize once the telemetry proxy
    // and make sure it is only after SDK is initialized.
    private var webViewProxy: WebViewTracking._InternalWebViewProxy? = null
        get() {
            if (field == null && isInitialized()) {
                field = WebViewTracking._InternalWebViewProxy(Datadog.getInstance())
            }

            return field
        }

    override fun setVerbosity(level: Int) {
        Datadog.setVerbosity(level)
    }

    override fun initialize(
        context: Context,
        configuration: Configuration,
        consent: TrackingConsent
    ) {
        val core = Datadog.initialize(context, configuration, consent)
        DatadogSDKWrapperStorage.notifyOnInitializedListeners(core as InternalSdkCore)
    }

    override fun setUserInfo(
        id: String,
        name: String?,
        email: String?,
        extraInfo: Map<String, Any?>
    ) {
        Datadog.setUserInfo(id, name, email, extraInfo)
    }

    override fun addUserExtraInfo(
        extraInfo: Map<String, Any?>
    ) {
        Datadog.addUserProperties(extraInfo)
    }

    override fun clearUserInfo() {
        Datadog.clearUserInfo()
    }
    
    override fun addRumGlobalAttribute(key: String, value: Any?) {
        this.getRumMonitor().addAttribute(key, value)
    }

    override fun removeRumGlobalAttribute(key: String) {
        this.getRumMonitor().removeAttribute(key)
    }

    override fun setAccountInfo(
        id: String,
        name: String?,
        extraInfo: Map<String, Any?>
    ) {
        Datadog.setAccountInfo(id, name, extraInfo)
    }

    override fun addAccountExtraInfo(
        extraInfo: Map<String, Any?>
    ) {
        Datadog.addAccountExtraInfo(extraInfo)
    }

    override fun clearAccountInfo() {
        Datadog.clearAccountInfo()
    }

    override fun addRumGlobalAttribute(key: String, value: Any?) {
        this.getRumMonitor().addAttribute(key, value)
    }

    override fun removeRumGlobalAttribute(key: String) {
        this.getRumMonitor().removeAttribute(key)
    }

    override fun addRumGlobalAttributes(attributes: Map<String, Any?>) {
        for (attribute in attributes) {
            this.addRumGlobalAttribute(attribute.key, attribute.value)
        }
    }

    override fun removeRumGlobalAttributes(keys: Array<String>) {
        for (key in keys) {
            this.removeRumGlobalAttribute(key)
        }
    }

    override fun setTrackingConsent(trackingConsent: TrackingConsent) {
        Datadog.setTrackingConsent(trackingConsent)
    }

    override fun consumeWebviewEvent(message: String) {
        webViewProxy?.consumeWebviewEvent(message)
    }

    override fun isInitialized(): Boolean {
        return Datadog.isInitialized()
    }

    override fun getRumMonitor(): RumMonitor {
        return GlobalRumMonitor.get(Datadog.getInstance())
    }

    override fun clearAllData() {
        return Datadog.clearAllData(Datadog.getInstance())
    }
}

