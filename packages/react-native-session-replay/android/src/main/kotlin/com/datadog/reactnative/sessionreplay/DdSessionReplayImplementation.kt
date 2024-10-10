/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import com.datadog.android.api.feature.FeatureSdkCore
import com.datadog.android.sessionreplay.ImagePrivacy
import com.datadog.android.sessionreplay.SessionReplayConfiguration
import com.datadog.android.sessionreplay.TextAndInputPrivacy
import com.datadog.android.sessionreplay.TouchPrivacy
import com.datadog.reactnative.DatadogSDKWrapperStorage
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactContext
import java.util.Locale

/**
 * The entry point to use Datadog's Session Replay feature.
 */
class DdSessionReplayImplementation(
    private val reactContext: ReactContext,
    private val sessionReplayProvider: () -> SessionReplayWrapper = {
        SessionReplaySDKWrapper()
    }
) {
    /**
     * Enable session replay and start recording session.
     * @param replaySampleRate The sample rate applied for session replay.
     * @param defaultPrivacyLevel The privacy level used for replay.
     * @param customEndpoint Custom server url for sending replay data.
     */
    fun enable(replaySampleRate: Double, defaultPrivacyLevel: String, customEndpoint: String, promise: Promise) {
        val sdkCore = DatadogSDKWrapperStorage.getSdkCore() as FeatureSdkCore
        val logger = sdkCore.internalLogger
        val configuration = SessionReplayConfiguration.Builder(replaySampleRate.toFloat())
            .configurePrivacy(defaultPrivacyLevel)
            .addExtensionSupport(ReactNativeSessionReplayExtensionSupport(reactContext, logger))

        if (customEndpoint != "") {
            configuration.useCustomEndpoint(customEndpoint)
        }

        sessionReplayProvider().enable(configuration.build(), sdkCore)
        promise.resolve(null)
    }

    @Deprecated("Privacy should be set with separate properties mapped to " +
            "`setImagePrivacy`, `setTouchPrivacy`, `setTextAndInputPrivacy`, but they are" +
            " currently unavailable.")
    private fun SessionReplayConfiguration.Builder.configurePrivacy(
        defaultPrivacyLevel: String
    ): SessionReplayConfiguration.Builder {
        when (defaultPrivacyLevel.lowercase(Locale.US)) {
            "mask" -> {
                this.setTextAndInputPrivacy(TextAndInputPrivacy.MASK_ALL)
                this.setImagePrivacy(ImagePrivacy.MASK_ALL)
                this.setTouchPrivacy(TouchPrivacy.HIDE)
            }
            "mask_user_input" -> {
                this.setTextAndInputPrivacy(TextAndInputPrivacy.MASK_ALL_INPUTS)
                this.setImagePrivacy(ImagePrivacy.MASK_NONE)
                this.setTouchPrivacy(TouchPrivacy.HIDE)
            }
            "allow" -> {
                this.setTextAndInputPrivacy(TextAndInputPrivacy.MASK_SENSITIVE_INPUTS)
                this.setImagePrivacy(ImagePrivacy.MASK_NONE)
                this.setTouchPrivacy(TouchPrivacy.SHOW)
            }
        }
        return this
    }

    companion object {
        internal const val NAME = "DdSessionReplay"
    }
}
