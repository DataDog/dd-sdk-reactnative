/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
package com.datadog.reactnative

import com.datadog.android.rum.RumSessionListener
import com.facebook.react.bridge.NativeArray
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableNativeArray
import org.jetbrains.annotations.TestOnly

internal class DdSdkSessionStartedListener private constructor(): RumSessionListener {
    companion object {
        private const val BRIDGE_MODULE_NAME = "DatadogInternalReactBridge"
        private const val BRIDGE_MODULE_METHOD = "__datadogRumSessionStarted"

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
    private var listener: ((sessionId: String) -> Unit)? = null
    private var convertToNativeArray: ((array: Array<String>) -> NativeArray?)? = null
    private var exceptionHandler: ((error: Exception) -> Unit)? = null

    override fun onSessionStarted(sessionId: String, isDiscarded: Boolean) {
        sendSessionStartedToJS(sessionId)
    }

    fun setListener(listener: (sessionId: String) -> Unit) {
        this.listener = listener
        this.lastSessionId?.let { sendSessionStartedToJS(it) }
    }

    fun setReactContext(reactContext: ReactContext) {
        this.reactContext = reactContext
        if (hasValidBridge()) {
            this.lastSessionId?.let { sendSessionStartedToJS(it) }
        }
    }

    @TestOnly
    fun setConvertToNativeArray(convertToNativeArray: (array: Array<String>) -> NativeArray?) {
        this.convertToNativeArray = convertToNativeArray
    }

    @TestOnly
    fun setExceptionHandler(exceptionHandler: (error: Exception) -> Unit) {
        this.exceptionHandler = exceptionHandler
    }

    private fun hasValidBridge(): Boolean {
        val context = reactContext ?: return false
        val instance = context.catalystInstance ?: return false
        val isNotFabric = context.fabricUIManager == null
        return isNotFabric && !instance.isDestroyed && context.hasActiveReactInstance();
    }

    private fun sendSessionStartedToJS(sessionId: String) {
        this.lastSessionId = sessionId
        if (hasValidBridge()) {
            sendSessionIdWithBridge(sessionId)
        } else {
            sendSessionIdWithListener(sessionId)
        }
    }

    private fun sendSessionIdWithBridge(sessionId: String) {
        @Suppress("TooGenericExceptionCaught")
        try {
            val args = arrayOf(sessionId)
            val nativeArray = if (convertToNativeArray != null) {
                convertToNativeArray?.invoke(args)
            } else {
                WritableNativeArray().apply {
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

    private fun sendSessionIdWithListener(sessionId: String) {
        listener?.invoke(sessionId)
    }
}