/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import android.app.Activity
import com.datadog.android.sessionreplay.SessionReplayInternalCallback
import com.datadog.android.sessionreplay.SessionReplayInternalResourceQueue
import com.facebook.react.bridge.ReactContext

/**
 * Responsible for defining the internal callback implementation for react-native that will allow
 * overriding specific parts of the session replay android sdk.
 */
class ReactNativeInternalCallback(
    private val reactContext: ReactContext,
    private var resourceQueue: SessionReplayInternalResourceQueue? = null
) : SessionReplayInternalCallback {
    override fun addResourceItem(identifier: String, resourceData: ByteArray) {
        this.resourceQueue?.addResourceItem(identifier, resourceData)
    }

    override fun getCurrentActivity(): Activity? {
        return reactContext.currentActivity
    }

    override fun setResourceQueue(resourceQueue: SessionReplayInternalResourceQueue) {
        this.resourceQueue = resourceQueue
    }
}
