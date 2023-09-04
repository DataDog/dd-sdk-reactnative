package com.datadog.tools.unit

import com.datadog.android.rum.RumMonitor

class MockRumMonitor : RumMonitor {
    override var debug = false

    override fun _getInternal(): com.datadog.android.rum._RumInternalProxy? {
        return null
    }

    override fun addAction(
        type: com.datadog.android.rum.RumActionType,
        name: kotlin.String,
        attributes: kotlin.collections.Map<kotlin.String, kotlin.Any?>
    ): kotlin.Unit {}

    override fun addAttribute(key: kotlin.String, value: kotlin.Any?): kotlin.Unit {}

    override fun addError(
        message: kotlin.String,
        source: com.datadog.android.rum.RumErrorSource,
        throwable: kotlin.Throwable?,
        attributes: kotlin.collections.Map<kotlin.String, kotlin.Any?>
    ): kotlin.Unit {}

    override fun addErrorWithStacktrace(
        message: kotlin.String,
        source: com.datadog.android.rum.RumErrorSource,
        stacktrace: kotlin.String?,
        attributes: kotlin.collections.Map<kotlin.String, kotlin.Any?>
    ): kotlin.Unit {}

    override fun addFeatureFlagEvaluation(name: kotlin.String, value: kotlin.Any): kotlin.Unit {}

    override fun addTiming(name: kotlin.String): kotlin.Unit {}

    override fun clearAttributes(): kotlin.Unit {}

    override fun getAttributes(): kotlin.collections.Map<kotlin.String, kotlin.Any?> {
        return mapOf()
    }

    override fun removeAttribute(key: kotlin.String): kotlin.Unit {}

    override fun startAction(
        type: com.datadog.android.rum.RumActionType,
        name: kotlin.String,
        attributes: kotlin.collections.Map<kotlin.String, kotlin.Any?>
    ): kotlin.Unit {}

    override fun startResource(
        key: kotlin.String,
        method: kotlin.String,
        url: kotlin.String,
        attributes: kotlin.collections.Map<kotlin.String, kotlin.Any?>
    ): kotlin.Unit {}

    override fun startView(
        key: kotlin.Any,
        name: kotlin.String,
        attributes: kotlin.collections.Map<kotlin.String, kotlin.Any?>
    ): kotlin.Unit {}

    override fun stopAction(
        type: com.datadog.android.rum.RumActionType,
        name: kotlin.String,
        attributes: kotlin.collections.Map<kotlin.String, kotlin.Any?>
    ): kotlin.Unit {}

    override fun stopResource(
        key: kotlin.String,
        statusCode: kotlin.Int?,
        size: kotlin.Long?,
        kind: com.datadog.android.rum.RumResourceKind,
        attributes: kotlin.collections.Map<kotlin.String, kotlin.Any?>
    ): kotlin.Unit {}

    override fun stopResourceWithError(
        key: kotlin.String,
        statusCode: kotlin.Int?,
        message: kotlin.String,
        source: com.datadog.android.rum.RumErrorSource,
        stackTrace: kotlin.String,
        errorType: kotlin.String?,
        attributes: kotlin.collections.Map<kotlin.String, kotlin.Any?>
    ): kotlin.Unit {}

    override fun stopResourceWithError(
        key: kotlin.String,
        statusCode: kotlin.Int?,
        message: kotlin.String,
        source: com.datadog.android.rum.RumErrorSource,
        throwable: kotlin.Throwable,
        attributes: kotlin.collections.Map<kotlin.String, kotlin.Any?>
    ): kotlin.Unit {}

    override fun stopSession(): kotlin.Unit {}

    override fun stopView(
        key: kotlin.Any,
        attributes: kotlin.collections.Map<kotlin.String, kotlin.Any?>
    ): kotlin.Unit {}
}
