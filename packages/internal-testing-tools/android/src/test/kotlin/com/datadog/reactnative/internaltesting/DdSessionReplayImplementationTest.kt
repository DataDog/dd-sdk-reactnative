/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.internaltesting

import android.content.Context
import com.datadog.android.api.context.DatadogContext
import com.datadog.android.api.feature.Feature
import com.datadog.android.api.feature.FeatureScope
import com.datadog.android.api.storage.EventBatchWriter
import com.datadog.android.core.InternalSdkCore
import com.datadog.reactnative.DatadogSDKWrapperStorage
import com.facebook.react.bridge.Promise
import fr.xgouchet.elmyr.junit5.ForgeExtension
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.doReturn
import org.mockito.kotlin.whenever
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
internal class DdInternalTestingImplementationTest {

    lateinit var testedInternalTesting: DdInternalTestingImplementation

    @Mock
    lateinit var mockPromise: Promise

    @Mock
    lateinit var mockCore: InternalSdkCore

    @BeforeEach
    fun `set up`() {
        testedInternalTesting =
            DdInternalTestingImplementation()
    }

    @AfterEach
    fun `tear down`() {
    }

    @Test
    fun `M return captured events W enable()`() {
        // Given
        testedInternalTesting.enable(mockPromise)
        val mockFeature = MockFeature("mockFeature")
        val mockFeatureScope = MockFeatureScope(mockFeature)
        whenever(mockCore.getFeature(mockFeature.name)).doReturn(
            mockFeatureScope
        )

        // When
        DatadogSDKWrapperStorage.setSdkCore(mockCore)
        DatadogSDKWrapperStorage.notifyOnFeatureEnabledListeners(mockFeature.name)
        DatadogSDKWrapperStorage.notifyOnInitializedListeners()

        // Then
        assert(testedInternalTesting.featureScopes[mockFeature.name] != null)
    }
}

internal class MockFeatureScope(private val feature: Feature): FeatureScope {
    override fun sendEvent(event: Any) {}

    override fun <T : Feature> unwrap(): T {
        return feature as T
    }

    override fun withWriteContext(
        forceNewBatch: Boolean,
        callback: (DatadogContext, EventBatchWriter) -> Unit
    ) {}
}

internal class MockFeature(override val name: String) : Feature {
    override fun onInitialize(appContext: Context) {}

    override fun onStop() {}
}