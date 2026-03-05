/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.util.Log as AndroidLog
import com.datadog.android.Datadog
import com.datadog.android.log.Logger
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap

/**
 * The entry point to use Datadog's Logs feature.
 */
class DdLogsImplementation(
    private val datadog: DatadogWrapper = DatadogSDKWrapper(),
    private val logger: () -> Logger = {
        Logger.Builder(Datadog.getInstance())
            .setLogcatLogsEnabled(true)
            .setBundleWithRumEnabled(datadog.bundleLogsWithRum)
            .setBundleWithTraceEnabled(datadog.bundleLogsWithTraces)
            .setName("DdLogs")
            .build()
    }
) {
    private var loggerInstance: Logger? = null
    private val reactNativeLogger: Logger
        get() {
            if (loggerInstance == null) {
                loggerInstance = logger()
            }
            return loggerInstance!!
        }

    init {
        DatadogSDKWrapperStorage.addOnInitializedListener {
            loggerInstance = null
        }
    }

    /**
     * Send a log with Debug level.
     * @param message The message to send.
     * @param context The additional context to send.
     */
    fun debug(message: String, context: ReadableMap, promise: Promise) {
        reactNativeLogger.d(
            message = message,
            attributes = context.toHashMap() + GlobalState.globalAttributes
        )
        promise.resolve(null)
    }

    /**
     * Send a log with Info level.
     * @param message The message to send.
     * @param context The additional context to send.
     */
    fun info(message: String, context: ReadableMap, promise: Promise) {
        reactNativeLogger.i(
            message = message,
            attributes = context.toHashMap() + GlobalState.globalAttributes
        )
        promise.resolve(null)
    }

    /**
     * Send a log with Warn level.
     * @param message The message to send.
     * @param context The additional context to send.
     */
    fun warn(message: String, context: ReadableMap, promise: Promise) {
        reactNativeLogger.w(
            message = message,
            attributes = context.toHashMap() + GlobalState.globalAttributes
        )
        promise.resolve(null)
    }

    /**
     * Send a log with Error level.
     * @param message The message to send.
     * @param context The additional context to send.
     */
    fun error(message: String, context: ReadableMap, promise: Promise) {
        reactNativeLogger.e(
            message = message,
            attributes = context.toHashMap() + GlobalState.globalAttributes
        )
        promise.resolve(null)
    }

    /**
     * Send a log containing an error with Debug level.
     * @param message The message to send.
     * @param errorKind The error kind to send.
     * @param errorMessage The error message to send.
     * @param stacktrace The error stacktrace to send.
     * @param context The additional context to send.
     */
    @Suppress("LongParameterList")
    fun debugWithError(
        message: String,
        errorKind: String?,
        errorMessage: String?,
        stacktrace: String?,
        context: ReadableMap,
        promise: Promise
    ) {
        reactNativeLogger.log(
            priority = AndroidLog.DEBUG,
            message = message,
            errorKind = errorKind,
            errorMessage = errorMessage,
            errorStacktrace = stacktrace,
            attributes = context.toHashMap() + GlobalState.globalAttributes
        )
        promise.resolve(null)
    }

    /**
     * Send a log with containing an error with Info level.
     * @param message The message to send.
     * @param errorKind The error kind to send.
     * @param errorMessage The error message to send.
     * @param stacktrace The error stacktrace to send.
     * @param context The additional context to send.
     */
    @Suppress("LongParameterList")
    fun infoWithError(
        message: String,
        errorKind: String?,
        errorMessage: String?,
        stacktrace: String?,
        context: ReadableMap,
        promise: Promise
    ) {
        reactNativeLogger.log(
            priority = AndroidLog.INFO,
            message = message,
            errorKind = errorKind,
            errorMessage = errorMessage,
            errorStacktrace = stacktrace,
            attributes = context.toHashMap() + GlobalState.globalAttributes
        )
        promise.resolve(null)
    }

    /**
     * Send a log containing an error with Warn level.
     * @param message The message to send.
     * @param errorKind The error kind to send.
     * @param errorMessage The error message to send.
     * @param stacktrace The error stacktrace to send.
     * @param context The additional context to send.
     */
    @Suppress("LongParameterList")
    fun warnWithError(
        message: String,
        errorKind: String?,
        errorMessage: String?,
        stacktrace: String?,
        context: ReadableMap,
        promise: Promise
    ) {
        reactNativeLogger.log(
            priority = AndroidLog.WARN,
            message = message,
            errorKind = errorKind,
            errorMessage = errorMessage,
            errorStacktrace = stacktrace,
            attributes = context.toHashMap() + GlobalState.globalAttributes
        )
        promise.resolve(null)
    }

    /**
     * Send a log containing an error with Error level.
     * @param message The message to send.
     * @param errorKind The error kind to send.
     * @param errorMessage The error message to send.
     * @param stacktrace The error stacktrace to send.
     * @param context The additional context to send.
     */
    @Suppress("LongParameterList")
    fun errorWithError(
        message: String,
        errorKind: String?,
        errorMessage: String?,
        stacktrace: String?,
        context: ReadableMap,
        promise: Promise
    ) {
        reactNativeLogger.log(
            priority = AndroidLog.ERROR,
            message = message,
            errorKind = errorKind,
            errorMessage = errorMessage,
            errorStacktrace = stacktrace,
            attributes = context.toHashMap() + GlobalState.globalAttributes
        )
        promise.resolve(null)
    }

    internal companion object {
        internal const val NAME = "DdLogs"
    }
}
