/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import com.datadog.android.Datadog
import com.datadog.android.api.feature.FeatureSdkCore
import com.datadog.android.sessionreplay.SessionReplayConfiguration
import com.datadog.android.sessionreplay.SessionReplayPrivacy
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
            .setPrivacy(buildPrivacy(defaultPrivacyLevel))
            .addExtensionSupport(ReactNativeSessionReplayExtensionSupport(reactContext, logger))

        if (customEndpoint != "") {
            configuration.useCustomEndpoint(customEndpoint)
        }

        sessionReplayProvider().enable(configuration.build(), sdkCore)
        promise.resolve(null)
    }

    private fun buildPrivacy(defaultPrivacyLevel: String): SessionReplayPrivacy {
        return when (defaultPrivacyLevel?.lowercase(Locale.US)) {
            "mask" -> SessionReplayPrivacy.MASK
            "mask_user_input" -> SessionReplayPrivacy.MASK_USER_INPUT
            "allow" -> SessionReplayPrivacy.ALLOW
            else -> {
                SessionReplayPrivacy.MASK
            }
        }

    }

    companion object {
        internal const val NAME = "DdSessionReplay"
    }
}
