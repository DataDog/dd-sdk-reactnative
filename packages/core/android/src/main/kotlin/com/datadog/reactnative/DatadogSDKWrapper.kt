/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.Context
import com.datadog.android.Datadog
import com.datadog.android._InternalProxy
import com.datadog.android.api.SdkCore
import com.datadog.android.api.context.DatadogContext
import com.datadog.android.api.feature.FeatureScope
import com.datadog.android.api.feature.FeatureSdkCore
import com.datadog.android.core.InternalSdkCore
import com.datadog.android.core.configuration.Configuration
import com.datadog.android.log.Logs
import com.datadog.android.log.LogsConfiguration
import com.datadog.android.privacy.TrackingConsent
import com.datadog.android.rum.GlobalRumMonitor
import com.datadog.android.rum.Rum
import com.datadog.android.rum.RumConfiguration
import com.datadog.android.rum.RumMonitor
import com.datadog.android.trace.Trace
import com.datadog.android.trace.TraceConfiguration
import com.datadog.android.webview.WebViewTracking

/**
 * Internal object used to add internal testing.
 */
object DatadogSDKWrapperStorage {
    internal val onInitializedListeners: MutableList<(InternalSdkCore?) -> Unit> = mutableListOf()

    /**
     * Adds a Listener called when the core is initialized.
     */
    fun addOnInitializedListener(listener: (InternalSdkCore?) -> Unit) {
        onInitializedListeners.add(listener)
    }

    /**
     * Exposed for testing purposes only.
     */
    fun notifyOnInitializedListeners() {
        onInitializedListeners.forEach {
            it(core)
        }
    }

    private var core: InternalSdkCore? = null

    /**
     * Sets instance of core SDK to be used to initialize features.
     */
    fun setSdkCore(core: InternalSdkCore?) {
        this.core = core
    }

    /**
     * Returns the core used for registering RN features.
     */
    fun getSdkCore(): SdkCore {
        return core ?: Datadog.getInstance()
    }
}

internal class DatadogSDKWrapper : DatadogWrapper {

    // We use Kotlin backing field here to initialize once the telemetry proxy
    // and make sure it is only after SDK is initialized.
    private var telemetryProxy: _InternalProxy._TelemetryProxy? = null
        get() {
            if (field == null && isInitialized()) {
                field = Datadog._internalProxy()._telemetry
            }

            return field
        }

    // We use Kotlin backing field here to initialize once the telemetry proxy
    // and make sure it is only after SDK is initialized.
    private var webViewProxy: WebViewTracking._InternalWebViewProxy? = null
        get() {
            if (field == null && isInitialized()) {
                field = WebViewTracking._InternalWebViewProxy(DatadogSDKWrapperStorage.getSdkCore())
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
        DatadogSDKWrapperStorage.setSdkCore(core as InternalSdkCore)
        DatadogSDKWrapperStorage.notifyOnInitializedListeners()
    }

    override fun enableRum(configuration: RumConfiguration) {
        DatadogSDKWrapperStorage.getSdkCore()?.let {
            Rum.enable(configuration, it)
        }
    }

    override fun enableLogs(configuration: LogsConfiguration) {
        DatadogSDKWrapperStorage.getSdkCore()?.let {
            Logs.enable(configuration, it)
        }
    }

    override fun enableTrace(configuration: TraceConfiguration) {
        DatadogSDKWrapperStorage.getSdkCore()?.let {
            Trace.enable(configuration, it)
        }
    }

    override fun setUserInfo(
        id: String?,
        name: String?,
        email: String?,
        extraInfo: Map<String, Any?>
    ) {
        Datadog.setUserInfo(id, name, email, extraInfo)
    }

    override fun addRumGlobalAttributes(attributes: Map<String, Any?>) {
        val rumMonitor = this.getRumMonitor()
        attributes.forEach {
            rumMonitor.addAttribute(it.key, it.value)
        }
    }

    override fun setTrackingConsent(trackingConsent: TrackingConsent) {
        Datadog.setTrackingConsent(trackingConsent)
    }

    override fun telemetryDebug(message: String) {
        telemetryProxy?.debug(message)
    }

    override fun telemetryError(message: String, stack: String?, kind: String?) {
        telemetryProxy?.error(message, stack, kind)
    }

    override fun telemetryError(message: String, throwable: Throwable?) {
        telemetryProxy?.error(message, throwable)
    }

    override fun consumeWebviewEvent(message: String) {
        webViewProxy?.consumeWebviewEvent(message)
    }

    override fun isInitialized(): Boolean {
        return Datadog.isInitialized()
    }

    override fun getRumMonitor(): RumMonitor {
        return GlobalRumMonitor.get(DatadogSDKWrapperStorage.getSdkCore())
    }
}
