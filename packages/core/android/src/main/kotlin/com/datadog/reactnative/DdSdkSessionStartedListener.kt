/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
package com.datadog.reactnative

import androidx.annotation.MainThread
import com.datadog.android.rum.RumSessionListener
import com.facebook.react.bridge.NativeArray
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.jetbrains.annotations.TestOnly


internal class DdSdkSessionStartedListener private constructor(): RumSessionListener {
    companion object {
        private const val BRIDGE_MODULE_NAME = "DatadogInternalReactBridge"
        private const val BRIDGE_MODULE_METHOD = "__datadogOnMessageReceived"

        private var instance: DdSdkSessionStartedListener? = null

        fun getInstance(): DdSdkSessionStartedListener {
            if (instance == null) {
                instance = DdSdkSessionStartedListener()
            }
            return instance!!
        }

        fun invalidate() {
            instance = null
        }
    }

    private var reactContext: ReactContext? = null
    private var lastSessionId: String? = null
    private var convertToNativeArray: ((array: Array<String>) -> NativeArray?)? = null
    private var exceptionHandler: ((error:Exception)->Unit)? = null
    private var isNewArchitecture: Boolean? = null
    private var isRnSdkInitialized: Boolean = false

    override fun onSessionStarted(sessionId: String, isDiscarded: Boolean) {
        this.lastSessionId = sessionId
        trySendSessionStartedToJS(sessionId)
    }

    fun setReactContext(reactContext: ReactContext) {
        this.reactContext = reactContext
        this.lastSessionId?.let { trySendSessionStartedToJS(it) }
    }

    // Called when the RN SDK is initialized from JS for the first time while the native
    // SDK was already running. At this point DatadogInternalReactBridge is guaranteed to
    // be registered, so it is safe to deliver any session ID that was stored before the
    // React bridge was available.
    fun onRnSdkInitialized() {
        this.isRnSdkInitialized = true
        this.lastSessionId?.let { trySendSessionStartedToJS(it) }
    }

    @TestOnly
    fun setConvertToNativeArray(convertToNativeArray: (array: Array<String>) -> NativeArray?) {
        this.convertToNativeArray = convertToNativeArray
    }

    @TestOnly
    fun setExceptionHandler(exceptionHandler: (error: Exception) -> Unit) {
        this.exceptionHandler = exceptionHandler
    }

    @TestOnly
    fun setIsNewArchitecture(isNewArch: Boolean) {
        this.isNewArchitecture = isNewArch
    }

    @TestOnly
    fun setIsRnSdkInitialized(value: Boolean) {
        this.isRnSdkInitialized = value
    }

    private fun hasValidBridge(): Boolean {
        val context = reactContext ?: return false
        val instance = context.catalystInstance ?: return false
        return !isNewArchitecture() &&
                !instance.isDestroyed &&
                context.hasActiveReactInstance() &&
                // IMPORTANT: a mandatory condition is that the RN SDK has been
                // initialized from JS. Before that point, DatadogInternalReactBridge (a JS-side
                // callable module) may not be registered yet. callFunction queues the call
                // asynchronously on the JS thread, so the native try-catch in sendSessionIdWithBridge
                // cannot intercept the resulting "module not registered" Invariant Violation and
                // the error propagates through RN's global JS error handler and crashes the app.
                isRnSdkInitialized
    }

    private fun isNewArchitecture(): Boolean {
        isNewArchitecture?.let { return it }
        BuildConfig.IS_NEW_ARCHITECTURE_ENABLED.let {
            isNewArchitecture = it
            return it
        }
    }

    private fun trySendSessionStartedToJS(sessionId: String) {
        if (hasValidBridge()) {
            sendSessionIdWithBridge(sessionId)
        } else {
            sendSessionIdWithEventEmitter(sessionId)
        }
    }

    @MainThread
    private fun sendSessionIdWithBridge(sessionId: String) {
        @Suppress("TooGenericExceptionCaught")
        try {
            val args = arrayOf(sessionId)
            val nativeArray = if (convertToNativeArray != null) {
                convertToNativeArray?.invoke(args)
            } else {
                WritableNativeArray().apply {
                    pushString("RUMSessionStarted")
                    pushString(sessionId)
                }
            }

            reactContext?.catalystInstance?.callFunction(
                BRIDGE_MODULE_NAME,
                BRIDGE_MODULE_METHOD,
                nativeArray
            )
        } catch(err: Exception) {
            exceptionHandler?.invoke(err)
        }
    }

    @MainThread
    private fun sendSessionIdWithEventEmitter(sessionId: String) {
        val context = reactContext ?: return
        @Suppress("TooGenericExceptionCaught", "SwallowedException")
        try {
            context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("RUMSessionStarted", sessionId)
        } catch (err: Exception) {
            /* empty */
        }
    }
}
