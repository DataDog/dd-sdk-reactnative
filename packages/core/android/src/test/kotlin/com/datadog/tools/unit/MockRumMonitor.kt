/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.tools.unit

import com.datadog.android.rum.ExperimentalRumApi
import com.datadog.android.rum.RumActionType
import com.datadog.android.rum.RumErrorSource
import com.datadog.android.rum.RumMonitor
import com.datadog.android.rum.RumResourceKind
import com.datadog.android.rum.RumResourceMethod
import com.datadog.android.rum._RumInternalProxy

class MockRumMonitor : RumMonitor {
    override var debug = false

    override fun _getInternal(): _RumInternalProxy? {
        return null
    }

    override fun addAction(
        type: RumActionType,
        name: String,
        attributes: Map<String, Any?>
    ) {}

    override fun addAttribute(key: String, value: Any?) {}

    override fun addError(
        message: String,
        source: RumErrorSource,
        throwable: Throwable?,
        attributes: Map<String, Any?>
    ) {}

    override fun addErrorWithStacktrace(
        message: String,
        source: RumErrorSource,
        stacktrace: String?,
        attributes: Map<String, Any?>
    ) {}

    override fun addFeatureFlagEvaluation(name: String, value: Any) {}

    override fun addFeatureFlagEvaluations(featureFlags: Map<String, Any>) {}

    override fun addTiming(name: String) {}

    @ExperimentalRumApi
    override fun addViewLoadingTime(overwrite: Boolean) {}

    override fun clearAttributes() {}

    override fun getAttributes(): Map<String, Any?> {
        return mapOf()
    }

    override fun getCurrentSessionId(callback: (String?) -> Unit) {}

    override fun removeAttribute(key: String) {}

    override fun startAction(
        type: RumActionType,
        name: String,
        attributes: Map<String, Any?>
    ) {}

    override fun startResource(
        key: String,
        method: RumResourceMethod,
        url: String,
        attributes: Map<String, Any?>
    ) {}

    override fun startResource(
        key: String,
        method: String,
        url: String,
        attributes: Map<String, Any?>
    ) {}

    override fun startView(
        key: Any,
        name: String,
        attributes: Map<String, Any?>
    ) {}

    override fun stopAction(
        type: RumActionType,
        name: String,
        attributes: Map<String, Any?>
    ) {}

    override fun stopResource(
        key: String,
        statusCode: Int?,
        size: Long?,
        kind: RumResourceKind,
        attributes: Map<String, Any?>
    ) {}

    override fun stopResourceWithError(
        key: String,
        statusCode: Int?,
        message: String,
        source: RumErrorSource,
        stackTrace: String,
        errorType: String?,
        attributes: Map<String, Any?>
    ) {}

    override fun stopResourceWithError(
        key: String,
        statusCode: Int?,
        message: String,
        source: RumErrorSource,
        throwable: Throwable,
        attributes: Map<String, Any?>
    ) {}

    override fun stopSession() {}

    override fun stopView(
        key: Any,
        attributes: Map<String, Any?>
    ) {}
}
