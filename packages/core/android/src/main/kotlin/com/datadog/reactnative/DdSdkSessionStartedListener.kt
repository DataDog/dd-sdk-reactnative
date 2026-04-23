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


internal class DdSdkSessionStartedListener private constructor() : RumSessionListener {
    companion object {
        // JS-side callable module registered via BatchedBridge.registerCallableModule.
        private const val BRIDGE_MODULE_NAME = "DatadogInternalReactBridge"
        private const val BRIDGE_MODULE_METHOD = "__datadogOnMessageReceived"

        private var instance: DdSdkSessionStartedListener? = null

        // Returns the shared listener instance, creating it on first call.
        fun getInstance(): DdSdkSessionStartedListener {
            if (instance == null) {
                instance = DdSdkSessionStartedListener()
            }
            return instance!!
        }

        // Resets the singleton — used in tests to start from a clean state.
        fun invalidate() {
            instance = null
        }
    }

    // Cached so it can be delivered once the bridge becomes available.
    private var lastSessionId: String? = null

    // Set from onHostResume; null until the React activity is first resumed.
    private var reactContext: ReactContext? = null
    // Overridable in tests — NativeArray cannot be instantiated without the native SO.
    private var convertToNativeArray: ((array: Array<String>) -> NativeArray?)? = null
    // Overridable in tests to assert on bridge exceptions without crashing.
    private var exceptionHandler: ((error: Exception) -> Unit)? = null
    // Lazily resolved from BuildConfig; overridable in tests.
    private var isNewArchitecture: Boolean? = null
    private var isRnSdkInitialized: Boolean = false

    // Stores the session ID and attempts immediate delivery.
    override fun onSessionStarted(sessionId: String, isDiscarded: Boolean) {
        this.lastSessionId = sessionId
        trySendSessionStartedToJS(sessionId)
    }

    // Called from onHostResume. Triggers catch-up delivery if the RN SDK is already initialized.
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

    // Returns true only when it is safe to call callFunction on the JS thread.
    private fun hasValidBridge(): Boolean {
        val context = reactContext ?: return false
        val instance = context.catalystInstance ?: return false
        return !isNewArchitecture() &&
                !instance.isDestroyed &&
                context.hasActiveReactInstance() &&
                isRnSdkInitialized
    }

    // Lazily cached — BuildConfig is a compile-time constant but reading it through the
    // nullable override lets tests inject the value without reflection.
    private fun isNewArchitecture(): Boolean {
        isNewArchitecture?.let { return it }
        BuildConfig.IS_NEW_ARCHITECTURE_ENABLED.let {
            isNewArchitecture = it
            return it
        }
    }

    // Routes delivery to the appropriate path based on arch and bridge readiness.
    private fun trySendSessionStartedToJS(sessionId: String) {
        if (hasValidBridge()) {
            sendSessionIdWithBridge(sessionId)
        } else {
            sendSessionIdWithEventEmitter(sessionId)
        }
    }

    // Old-arch delivery path via BatchedBridge.
    @MainThread
    private fun sendSessionIdWithBridge(sessionId: String) {
        @Suppress("TooGenericExceptionCaught")
        try {
            val args = arrayOf("RUMSessionStarted", sessionId)
            reactContext?.catalystInstance?.callFunction(
                BRIDGE_MODULE_NAME,
                BRIDGE_MODULE_METHOD,
                buildBridgeArgs(args)
            )
        } catch (err: Exception) {
            exceptionHandler?.invoke(err)
        }
    }

    private fun buildBridgeArgs(args: Array<String>): NativeArray? {
        if (convertToNativeArray != null) {
            return convertToNativeArray?.invoke(args)
        }
        return WritableNativeArray().apply {
            args.forEach { pushString(it) }
        }
    }

    // New-arch delivery path and fallback when the bridge is not active.
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
