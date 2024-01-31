/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.Context
import android.util.Log
import com.datadog.android.Datadog
import com.datadog.android._InternalProxy
import com.datadog.android.api.SdkCore
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

    /**
     * Sets instance of core SDK to be used to initialize features.
     */
    fun setSdkCore(core: InternalSdkCore?) {
        this.core = core
    }

    /**
     * Returns the core set by setSdkCore or the default core instance by default.
     */
    fun getSdkCore(): SdkCore {
        core?.let {
            return it
        }
        Log.d(
            DatadogSDKWrapperStorage::class.java.canonicalName,
            "SdkCore was not set in DatadogSDKWrapperStorage, using default instance."
        )
        return Datadog.getInstance()
    }
}

internal class DatadogSDKWrapper : DatadogWrapper {
    override var bundleLogsWithRum = BUNDLE_LOGS_WITH_RUM_DEFAULT
    override var bundleLogsWithTraces = BUNDLE_LOGS_WITH_TRACES_DEFAULT

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
        DatadogSDKWrapperStorage.notifyOnInitializedListeners(core)
    }

    override fun enableRum(configuration: RumConfiguration) {
        Rum.enable(configuration, DatadogSDKWrapperStorage.getSdkCore())
    }

    override fun enableLogs(configuration: LogsConfiguration) {
        Logs.enable(configuration, DatadogSDKWrapperStorage.getSdkCore())
    }

    override fun enableTrace(configuration: TraceConfiguration) {
        Trace.enable(configuration, DatadogSDKWrapperStorage.getSdkCore())
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
        for (attribute in attributes) {
            rumMonitor.addAttribute(attribute.key, attribute.value)
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

    override fun clearAllData() {
        return Datadog.clearAllData(DatadogSDKWrapperStorage.getSdkCore())
    }

    internal companion object {
        internal const val BUNDLE_LOGS_WITH_RUM_DEFAULT = true
        internal const val BUNDLE_LOGS_WITH_TRACES_DEFAULT = true
    }
}

