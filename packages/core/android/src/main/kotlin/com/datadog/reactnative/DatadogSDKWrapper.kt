/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.Context
import com.datadog.android.Datadog
import com.datadog.android.core.configuration.Configuration
import com.datadog.android.privacy.TrackingConsent
import com.datadog.android.rum.GlobalRumMonitor
import com.datadog.android.webview.WebViewTracking

internal class DatadogSDKWrapper : DatadogWrapper {

    override fun setVerbosity(level: Int) {
        Datadog.setVerbosity(level)
    }

    override fun initialize(
        context: Context,
        configuration: Configuration,
        consent: TrackingConsent
    ) {
        Datadog.initialize(context, configuration, consent)
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
        attributes.forEach {
            GlobalRumMonitor.get().addAttribute(it.key, it.value)
        }
    }

    override fun setTrackingConsent(trackingConsent: TrackingConsent) {
        Datadog.setTrackingConsent(trackingConsent)
    }

    override fun telemetryDebug(message: String) {
        // TODO: store instance of proxy to avoid creating one every time
        Datadog._internalProxy()._telemetry.debug(message)
    }

    override fun telemetryError(message: String, stack: String?, kind: String?) {
        // TODO: store instance of proxy to avoid creating one every time
        Datadog._internalProxy()._telemetry.error(message, stack, kind)
    }

    override fun telemetryError(message: String, throwable: Throwable?) {
        // TODO: store instance of proxy to avoid creating one every time
        Datadog._internalProxy()._telemetry.error(message, throwable)
    }

    override fun consumeWebviewEvent(message: String) {
        // TODO: store instance of proxy to avoid creating one every time
        WebViewTracking._InternalWebViewProxy(Datadog.getInstance()).consumeWebviewEvent(message)
    }

    override fun isInitialized(): Boolean {
        return Datadog.isInitialized()
    }
}
