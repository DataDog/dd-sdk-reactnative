/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.facebook.fbreact.specs.NativeDdLogsSpec
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

/**
 * The entry point to use Datadog's Logs feature.
 */
class DdLogs(
    reactContext: ReactApplicationContext,
    datadogWrapper: DatadogWrapper = DatadogSDKWrapper()
) : NativeDdLogsSpec(reactContext) {

    private val implementation = DdLogsImplementation(datadog = datadogWrapper)

    override fun getName(): String = DdLogsImplementation.NAME

    /**
     * Send a log with Debug level.
     * @param message The message to send.
     * @param context The additional context to send.
     */
    @ReactMethod
    override fun debug(message: String, context: ReadableMap, promise: Promise) {
        implementation.debug(message, context, promise)
    }

    /**
     * Send a log with Info level.
     * @param message The message to send.
     * @param context The additional context to send.
     */
    @ReactMethod
    override fun info(message: String, context: ReadableMap, promise: Promise) {
        implementation.info(message, context, promise)
    }

    /**
     * Send a log with Warn level.
     * @param message The message to send.
     * @param context The additional context to send.
     */
    @ReactMethod
    override fun warn(message: String, context: ReadableMap, promise: Promise) {
        implementation.warn(message, context, promise)
    }

    /**
     * Send a log with Error level.
     * @param message The message to send.
     * @param context The additional context to send.
     */
    @ReactMethod
    override fun error(message: String, context: ReadableMap, promise: Promise) {
        implementation.error(message, context, promise)
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
    @ReactMethod
    override fun debugWithError(
        message: String,
        errorKind: String?,
        errorMessage: String?,
        stacktrace: String?,
        context: ReadableMap,
        promise: Promise
    ) {
        implementation.debugWithError(message, errorKind, errorMessage, stacktrace, context, promise)
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
    @ReactMethod
    override fun infoWithError(
        message: String,
        errorKind: String?,
        errorMessage: String?,
        stacktrace: String?,
        context: ReadableMap,
        promise: Promise
    ) {
        implementation.infoWithError(message, errorKind, errorMessage, stacktrace, context, promise)
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
    @ReactMethod
    override fun warnWithError(
        message: String,
        errorKind: String?,
        errorMessage: String?,
        stacktrace: String?,
        context: ReadableMap,
        promise: Promise
    ) {
        implementation.warnWithError(message, errorKind, errorMessage, stacktrace, context, promise)
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
    @ReactMethod
    override fun errorWithError(
        message: String,
        errorKind: String?,
        errorMessage: String?,
        stacktrace: String?,
        context: ReadableMap,
        promise: Promise
    ) {
        implementation.errorWithError(message, errorKind, errorMessage, stacktrace, context, promise)
    }
}
