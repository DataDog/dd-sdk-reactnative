/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.Datadog
import com.datadog.android.api.context.DatadogContext
import com.datadog.android.api.feature.FeatureScope
import com.datadog.android.api.feature.FeatureSdkCore
import com.datadog.android.api.storage.EventBatchWriter
import com.datadog.android.api.storage.RawBatchEvent
import com.datadog.android.core.InternalSdkCore
import com.facebook.react.bridge.Promise
import com.google.gson.Gson

/**
 * The entry point to use Datadog's Core Tests feature.
 */
class DdCoreTestsImplementation() {
    private val featureScopes = mutableMapOf<String, FeatureScopeInterceptor>()

    fun clearData(promise: Promise) {
        featureScopes["logs"]?.clearData()
        featureScopes["rum"]?.clearData()
        featureScopes["tracing"]?.clearData()
        featureScopes["session-replay"]?.clearData()

        promise.resolve(null)
    }

    fun getAllEventsData(feature: String, promise: Promise) {
        val events = featureScopes[feature]?.eventsWritten()?.toList() ?: emptyList<Any>()
        val eventsJson = Gson().toJson(events)
        promise.resolve(eventsJson)
    }

    private fun registerFeature(name: String, core: FeatureSdkCore) {
        val featureScope = core?.getFeature(name)
        featureScope?.let {
            val instrumentedScope = FeatureScopeInterceptor(featureScope, core!! as InternalSdkCore)
            featureScopes[name] = instrumentedScope
        }
    }

    fun startRecording(promise: Promise) {
        val core = Datadog.getInstance() as FeatureSdkCore
        registerFeature("rum", core)
        registerFeature("logs", core)
        registerFeature("tracing", core)
        registerFeature("session-replay", core)
        registerFeature("crash", core)

        // Add reflection on the core to change the feature variable to be the one we created
        core.javaClass.declaredFields.firstOrNull { it.name == "features" }?.let {
            it.isAccessible = true
            it.set(core, featureScopes)
        }

        promise.resolve(null)
    }

    companion object {
        internal const val NAME = "DdCoreTests"
    }
}

internal class FeatureScopeInterceptor(
    private val featureScope: FeatureScope,
    private val core: InternalSdkCore,
) : FeatureScope by featureScope {

    private val eventsBatchInterceptor = EventBatchInterceptor()

    fun eventsWritten(): List<String> {
        return eventsBatchInterceptor.events
    }

    fun clearData() {
        eventsBatchInterceptor.clearData()
    }

    // region FeatureScope

    override fun withWriteContext(
        forceNewBatch: Boolean,
        callback: (DatadogContext, EventBatchWriter) -> Unit
    ) {
        featureScope.withWriteContext(forceNewBatch, callback)

        val context = core.getDatadogContext()!!
        callback(context, eventsBatchInterceptor)
    }

    // endregion
}


internal class EventBatchInterceptor: EventBatchWriter {
    internal val events = mutableListOf<String>()

    override fun currentMetadata(): ByteArray? {
        TODO("Not yet implemented")
    }

    fun clearData() {
        events.clear()
    }

    override fun write(
        event: RawBatchEvent,
        batchMetadata: ByteArray?
    ): Boolean {
        val eventContent = String(event.data)

        events.add(events.size,
            eventContent
        )

        return false
    }
}