/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.internaltesting

import androidx.annotation.WorkerThread
import com.datadog.android.api.InternalLogger
import com.datadog.android.Datadog
import com.datadog.android.api.context.DatadogContext
import com.datadog.android.api.context.NetworkInfo
import com.datadog.android.api.context.TimeInfo
import com.datadog.android.api.feature.EventWriteScope
import com.datadog.android.api.feature.Feature
import com.datadog.android.api.feature.FeatureScope
import com.datadog.android.api.storage.EventBatchWriter
import com.datadog.android.api.storage.EventType
import com.datadog.android.api.storage.RawBatchEvent
import com.datadog.android.core.InternalSdkCore
import com.datadog.android.core.internal.net.FirstPartyHostHeaderTypeResolver
import com.datadog.android.trace.TracingHeaderType
import com.datadog.reactnative.DatadogSDKWrapperStorage
import com.facebook.react.bridge.Promise
import com.google.gson.Gson
import okhttp3.HttpUrl

/**
 * The entry point to use Datadog's internal testing feature.
 */
class DdInternalTestingImplementation {
    private var wrappedCore: StubSDKCore? = null
    private val gson = Gson()

    /**
     * Clears all data for all features.
     */
    fun clearData(promise: Promise) {
        wrappedCore?.clearData()
        promise.resolve(null)
    }

    /**
     * Retrieves the list of events for a given feature.
     */
    fun getAllEvents(feature: String, promise: Promise) {
        val events = wrappedCore?.eventsWritten(feature)
        val eventsJson = gson.toJson(events)
        promise.resolve(eventsJson)
    }

    /**
     * Enable native testing module.
     */
    fun enable(promise: Promise) {
        DatadogSDKWrapperStorage.addOnInitializedListener { ddCore ->
            this.wrappedCore = StubSDKCore(ddCore)
        }
        promise.resolve(null)
    }

    /**
     * Get wrapped core instance.
     */
    internal fun getWrappedCore(): StubSDKCore? {
        return wrappedCore
    }

    companion object {
        internal const val NAME = "DdInternalTesting"
    }
}

internal class StubSDKCore(
    private val core: InternalSdkCore
) : InternalSdkCore by core {
    internal val featureScopes = mutableMapOf<String, FeatureScopeInterceptor>()

    // region Stub

    /**
     * Lists all the events written by a given feature.
     * @param featureName the name of the feature
     * @return a list of [StubEvent]
     */
    fun eventsWritten(featureName: String): List<String> {
        return featureScopes[featureName]?.eventsWritten()?.toList() ?: emptyList<String>()
    }

    fun clearData() {
        featureScopes.values.forEach { it.clearData() }
    }

    // endregion

    // region FeatureSdkCore

    override fun registerFeature(feature: Feature) {
        core.registerFeature(feature)
        core.getFeature(feature.name)?.let {
            featureScopes[feature.name] = FeatureScopeInterceptor(it, core)
        }
    }

    override fun getFeature(featureName: String): FeatureScope? {
        return featureScopes[featureName]
    }

    // endregion
}

internal class FeatureScopeInterceptor(
    private val featureScope: FeatureScope,
    private val core: InternalSdkCore,
) : FeatureScope by featureScope {
    private val eventWriteScopeInterceptor = EventWriteScopeInterceptor()

    fun eventsWritten(): List<String> {
        return eventWriteScopeInterceptor.events
    }

    fun clearData() {
        eventWriteScopeInterceptor.clearData()
    }

    // region FeatureScope

    override fun withWriteContext(
        withFeatureContexts: Set<String>,
        callback: (datadogContext: DatadogContext, write: EventWriteScope) -> Unit
    ) {
        featureScope.withWriteContext(withFeatureContexts, callback)

        core.getDatadogContext()?.let {
            callback(it, eventWriteScopeInterceptor)
        }
    }

    // endregion
}

internal class EventWriteScopeInterceptor : EventWriteScope {
    internal val events = mutableListOf<String>()

    fun clearData() {
        events.clear()
    }

    private val writer = object : EventBatchWriter {
        override fun currentMetadata(): ByteArray? = null

        override fun write(
            event: RawBatchEvent,
            batchMetadata: ByteArray?,
            eventType: EventType
        ): Boolean {
            events += String(event.data)
            return true
        }
    }

    override fun invoke(p1: (EventBatchWriter) -> Unit) {
        p1(writer)
    }
}

