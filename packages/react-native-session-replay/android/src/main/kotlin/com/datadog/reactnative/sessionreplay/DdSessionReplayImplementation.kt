/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import com.datadog.android.sessionreplay.SessionReplayConfiguration
import com.datadog.android.sessionreplay.SessionReplayPrivacy
import com.facebook.react.bridge.Promise
import java.util.Locale

/**
 * The entry point to use Datadog's Session Replay feature.
 */
class DdSessionReplayImplementation(
    private val sessionReplayProvider: () -> SessionReplayWrapper = {
        SessionReplaySDKWrapper()
    }
) {
    /**
     * Enable session replay and start recording session.
     * @param replaySampleRate The sample rate applied for session replay.
     * @param defaultPrivacyLevel The privacy level used for replay.
     */
    fun enable(replaySampleRate: Double, defaultPrivacyLevel: String, promise: Promise) {
        val configuration = SessionReplayConfiguration.Builder(replaySampleRate.toFloat())
            .setPrivacy(buildPrivacy(defaultPrivacyLevel))
            .build()
        sessionReplayProvider().enable(configuration)
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
