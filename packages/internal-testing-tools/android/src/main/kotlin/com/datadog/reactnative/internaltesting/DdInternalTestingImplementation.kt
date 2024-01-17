/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.internaltesting

import com.datadog.android.api.context.DatadogContext
import com.datadog.android.api.feature.FeatureScope
import com.datadog.android.api.storage.EventBatchWriter
import com.datadog.android.api.storage.RawBatchEvent
import com.datadog.android.core.InternalSdkCore
import com.datadog.reactnative.DatadogSDKWrapperStorage
import com.facebook.react.bridge.Promise
import com.google.gson.Gson
import kotlin.concurrent.thread

/**
 * The entry point to use Datadog's internal testing feature.
 */
class DdInternalTestingImplementation() {
    private val featureScopes = mutableMapOf<String, FeatureScopeInterceptor>()

    /**
     * Clears all data for all features.
     */
    fun clearData(promise: Promise) {
        featureScopes["logs"]?.clearData()
        featureScopes["rum"]?.clearData()
        featureScopes["tracing"]?.clearData()
        featureScopes["session-replay"]?.clearData()

        promise.resolve(null)
    }

    /**
     * Retrieves the list of events for a given feature.
     */
    fun getAllEvents(feature: String, promise: Promise) {
        val events = featureScopes[feature]?.eventsWritten()?.toList() ?: emptyList<Any>()
        val eventsJson = Gson().toJson(events)
        promise.resolve(eventsJson)
    }

    /**
     * Enable native testing module.
     */
    fun enable(promise: Promise) {
        DatadogSDKWrapperStorage.addOnFeatureEnabledListener { featureScope, featureName ->
            val core = DatadogSDKWrapperStorage.getSdkCore()
            registerFeature(featureScope, featureName, core as InternalSdkCore)
        }
        DatadogSDKWrapperStorage.addOnInitializedListener { core ->
            core?.let { ddCore ->
                /**
                 * There's a bug when trying a new RUM View after the features have been reset.
                 * When debugging we stop in DatadogCore::updateFeatureContext on the first line trying to get the feature.
                 * It's because we expect a SDKFeature and we give FeatureScopeInterceptor.
                 *
                 * By waiting for 3 seconds on a separate thread we give enough time for the "Application Start" View and first 
                 * RUM view to be created. 
                 * 
                 * If we switch from `features[featureName]` to `getFeature(featureName)` in DatadogCore::updateFeatureContext
                 * we can remove the sleep here.
                 */
                thread {
                    Thread.sleep(3000)
                    ddCore.javaClass.declaredFields.firstOrNull { it.name == "features" }?.let {
                        it.isAccessible = true
                        it.set(core, featureScopes)
                    }
                }
            }
        }
        promise.resolve(null)
    }

    private fun registerFeature(featureScope: FeatureScope, featureName: String, core: InternalSdkCore) {
        val instrumentedScope = FeatureScopeInterceptor(featureScope, core)
        featureScopes[featureName] = instrumentedScope
    }

    companion object {
        internal const val NAME = "DdInternalTesting"
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

        return true
    }
}
