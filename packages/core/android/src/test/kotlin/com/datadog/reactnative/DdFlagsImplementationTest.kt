/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.Datadog
import com.datadog.android.DatadogSite
import com.datadog.android.api.context.DatadogContext
import com.datadog.android.api.feature.Feature
import com.datadog.android.api.feature.FeatureSdkCore
import com.datadog.android.flags.model.EvaluationContext
import com.datadog.tools.unit.toReadableMap
import com.facebook.react.bridge.Promise
import okhttp3.Request
import okio.Buffer
import org.assertj.core.api.Assertions.assertThat
import org.json.JSONObject
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.Mock
import org.mockito.Mockito
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever

@Extensions(
    ExtendWith(MockitoExtension::class)
)
internal class DdFlagsImplementationTest {

    @Mock
    lateinit var mockPromise: Promise

    @Test
    fun `M not resolve SDK core W constructed`() {
        // Given
        val datadogMock = Mockito.mockStatic(Datadog::class.java)

        try {
            // When
            DdFlagsImplementation()

            // Then
            datadogMock.verifyNoInteractions()
        } finally {
            datadogMock.close()
        }
    }

    @Test
    fun `M resolve current SDK core W enable() called after construction`() {
        // Given
        val staleCore = mock<FeatureSdkCore>()
        val initializedCore = mock<FeatureSdkCore>()
        whenever(initializedCore.internalLogger).thenReturn(mock())
        var currentCore = staleCore
        val configuration = mapOf(
            "enabled" to true,
            "_ddFlagsSdkVersion" to "4.2.0-js.1"
        ).toReadableMap()
        val datadogMock = Mockito.mockStatic(Datadog::class.java)

        try {
            datadogMock.`when`<FeatureSdkCore> { Datadog.getInstance() }.thenAnswer { currentCore }
            val testedImplementation = DdFlagsImplementation()
            currentCore = initializedCore

            // When
            testedImplementation.enable(configuration, mockPromise)

            // Then
            assertSource(initializedCore, "4.2.0-js.1")
            verify(mockPromise).resolve(null)
        } finally {
            datadogMock.close()
        }
    }

    @Test
    fun `M report unknown reader W enable() from older JS`() {
        val core = mock<FeatureSdkCore>()
        whenever(core.internalLogger).thenReturn(mock())
        DdFlagsImplementation(core).enable(mapOf("enabled" to true).toReadableMap(), mockPromise)
        assertSource(core, "unknown")
    }

    private fun assertSource(core: FeatureSdkCore, expectedJsVersion: String) {
        val features = argumentCaptor<Feature>()
        verify(core, org.mockito.kotlin.times(2)).registerFeature(features.capture())
        val flags = features.allValues.single { it.name == "flags" }
        // Exercise the real native serializer without exposing a test API in the SDK.
        val getter = flags.javaClass.methods.single {
            it.name.startsWith(
                "getPrecomputedRequestFactory"
            )
        }
        val factory = getter.invoke(flags)
        val create = factory.javaClass.methods.single { it.name == "create" }
        val context = mock<DatadogContext>()
        whenever(context.site).thenReturn(DatadogSite.US1)
        whenever(context.env).thenReturn("test")
        whenever(context.clientToken).thenReturn("local-test-only")
        whenever(context.featuresContext).thenReturn(emptyMap())
        val evaluationContext = EvaluationContext("athlete", emptyMap())
        val request = create.invoke(factory, evaluationContext, context) as Request
        val buffer = Buffer()
        checkNotNull(request.body).writeTo(buffer)
        val source = JSONObject(buffer.readUtf8()).getJSONObject("data")
            .getJSONObject("attributes").getJSONObject("source")
        assertThat(source.getString("sdk_name")).isEqualTo("dd-sdk-reactnative")
        assertThat(source.getString("sdk_version")).isEqualTo(expectedJsVersion)
        assertThat(source.length()).isEqualTo(2)
    }

    @Test
    fun `M omit null attributes W buildEvaluationContext()`() {
        // Given
        val attributes = mapOf(
            "country" to "US",
            "age" to 42,
            "size" to null
        ).toReadableMap()

        // When
        val context = buildEvaluationContext("user", attributes)

        // Then
        assertThat(context.targetingKey).isEqualTo("user")
        assertThat(context.attributes).containsOnlyKeys("country", "age")
        assertThat(context.attributes["country"]).isEqualTo("US")
    }
}
