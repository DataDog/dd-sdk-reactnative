package com.datadog.reactnative.sessionreplay

import android.app.Activity
import com.datadog.android.sessionreplay.SessionReplayInternalCallback
import com.facebook.react.bridge.ReactContext

/**
 * Responsible for defining the internal callback implementation for react-native that will allow
 * overriding specific parts of the session replay android sdk.
 */
class ReactNativeInternalCallback(
    private val reactContext: ReactContext,
) : SessionReplayInternalCallback {
    override fun getCurrentActivity(): Activity? {
        return reactContext.currentActivity
    }
}
