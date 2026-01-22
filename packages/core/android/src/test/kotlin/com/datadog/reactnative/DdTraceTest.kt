/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.trace.api.scope.DatadogScope
import com.datadog.android.trace.api.span.DatadogSpan
import com.datadog.android.trace.api.span.DatadogSpanBuilder
import com.datadog.android.trace.api.span.DatadogSpanContext
import com.datadog.android.trace.api.trace.DatadogTraceId
import com.datadog.android.trace.api.tracer.DatadogTracer
import com.datadog.tools.unit.toReadableMap
import com.facebook.react.bridge.Promise
import fr.xgouchet.elmyr.annotation.AdvancedForgery
import fr.xgouchet.elmyr.annotation.DoubleForgery
import fr.xgouchet.elmyr.annotation.LongForgery
import fr.xgouchet.elmyr.annotation.MapForgery
import fr.xgouchet.elmyr.annotation.StringForgery
import fr.xgouchet.elmyr.annotation.StringForgeryType
import fr.xgouchet.elmyr.junit5.ForgeExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.any
import org.mockito.kotlin.doAnswer
import org.mockito.kotlin.doReturn
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.times
import org.mockito.kotlin.verify
import org.mockito.kotlin.verifyNoMoreInteractions
import org.mockito.kotlin.whenever
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
internal class DdTraceTest {

    lateinit var testedTrace: DdTraceImplementation

    @Mock
    lateinit var mockTracer: DatadogTracer

    @Mock
    lateinit var mockSpanBuilder: DatadogSpanBuilder

    @Mock
    lateinit var mockSpanContext: DatadogSpanContext

    @Mock
    lateinit var mockSpan: DatadogSpan

    @Mock
    lateinit var mockScope: DatadogScope

    @StringForgery
    lateinit var fakeOperation: String

    @DoubleForgery(1000000000000.0, 2000000000000.0)
    var fakeTimestamp: Double = 0.0

    @LongForgery(100L, 2000L)
    var fakeSpanId: Long = 0

    @Mock
    lateinit var fakeTraceId: DatadogTraceId

    @MapForgery(
        key = AdvancedForgery(string = [StringForgery()]),
        value = AdvancedForgery(string = [StringForgery(StringForgeryType.HEXADECIMAL)])
    )
    lateinit var fakeContext: Map<String, String>

    @MapForgery(
        key = AdvancedForgery(string = [StringForgery()]),
        value = AdvancedForgery(string = [StringForgery(StringForgeryType.HEXADECIMAL)])
    )
    lateinit var fakeGlobalState: Map<String, String>

    var lastResolvedValue: Any? = null
    private var mockPromise = mock<Promise>().apply {
        whenever(resolve(any())) doAnswer {
            lastResolvedValue = it.arguments[0]
        }
    }

    @BeforeEach
    fun `set up`() {
        whenever(mockTracer.buildSpan(fakeOperation)) doReturn mockSpanBuilder
        whenever(
            mockSpanBuilder.withStartTimestamp(
                fakeTimestamp.toLong() * 1000
            )
        ) doReturn mockSpanBuilder
        whenever(mockSpanBuilder.start()) doReturn mockSpan
        whenever(mockSpan.context()) doReturn mockSpanContext
        whenever(mockSpanContext.spanId) doReturn fakeSpanId
        whenever(mockSpanContext.traceId) doReturn fakeTraceId
        whenever(mockTracer.activateSpan(mockSpan)) doReturn mockScope

        testedTrace = DdTraceImplementation(tracerProvider = { mockTracer })
    }

    @AfterEach
    fun `tear down`() {
        GlobalState.globalAttributes.clear()
    }

    @Test
    fun `M start a span W startSpan() `() {
        // When
        testedTrace.startSpan(
            fakeOperation,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

        // Then
        assertThat(lastResolvedValue.toString()).isEqualTo(fakeSpanId.toString())
    }

    @Test
    fun `M start and stop span W startSpan() + finishSpan()`(
        @LongForgery(100L, 2000L) duration: Long,
        @MapForgery(
            key = AdvancedForgery(string = [StringForgery()]),
            value = AdvancedForgery(string = [StringForgery(StringForgeryType.HEXADECIMAL)])
        ) context: Map<String, String>
    ) {
        // Given
        val endTimestamp = fakeTimestamp + duration

        // When
        testedTrace.startSpan(
            fakeOperation,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )
        val id = lastResolvedValue.toString()
        testedTrace.finishSpan(id, fakeContext.toReadableMap(), endTimestamp, mockPromise)

        // Then
        assertThat(id).isEqualTo(fakeSpanId.toString())
        verify(mockSpan).finish(endTimestamp.toLong() * 1000)
    }

    @Test
    fun `M do nothing W startSpan() + finishSpan() with unknown id`(
        @LongForgery(100L, 2000L) duration: Long,
        @StringForgery(type = StringForgeryType.HEXADECIMAL)
        @LongForgery(100L, 2000L)
        otherSpanId: Long
    ) {
        // Given
        assumeTrue(otherSpanId != fakeSpanId)
        val endTimestamp = fakeTimestamp + duration

        // When
        testedTrace.startSpan(
            fakeOperation,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )
        val id = lastResolvedValue.toString()
        testedTrace.finishSpan(
            otherSpanId.toString(),
            fakeContext.toReadableMap(),
            endTimestamp,
            mockPromise
        )

        // Then
        assertThat(id).isEqualTo(fakeSpanId.toString())
        verify(mockSpan, never()).finish(any())
    }

    @Test
    fun `M start and stop span with context on start W startSpan() + finishSpan()`(
        @LongForgery(100L, 2000L) duration: Long
    ) {
        // Given
        val endTimestamp = fakeTimestamp + duration

        // When
        testedTrace.startSpan(
            fakeOperation,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )
        val id = lastResolvedValue.toString()
        testedTrace.finishSpan(
            id as String,
            emptyMap<String, String>().toReadableMap(),
            endTimestamp,
            mockPromise
        )

        // Then
        assertThat(id).isEqualTo(fakeSpanId.toString())
        verify(mockSpan).context()
        verify(mockSpan).finish(endTimestamp.toLong() * 1000)
        fakeContext.forEach {
            verify(mockSpan).setTag(it.key, it.value)
        }
        verifyNoMoreInteractions(mockSpan)
    }

    @Test
    fun `M start and stop span with context on finish W startSpan() + finishSpan()`(
        @LongForgery(100L, 2000L) duration: Long
    ) {
        // Given
        val endTimestamp = fakeTimestamp + duration

        // When
        testedTrace.startSpan(
            fakeOperation,
            emptyMap<String, String>().toReadableMap(),
            fakeTimestamp,
            mockPromise
        )
        val id = lastResolvedValue.toString()
        testedTrace.finishSpan(id, fakeContext.toReadableMap(), endTimestamp, mockPromise)

        // Then
        assertThat(id).isEqualTo(fakeSpanId.toString())
        verify(mockSpan).context()
        verify(mockSpan).finish(endTimestamp.toLong() * 1000)
        fakeContext.forEach {
            verify(mockSpan).setTag(it.key, it.value)
        }
        verifyNoMoreInteractions(mockSpan)
    }

    @Test
    fun `M start and stop span with global state on start W startSpan() + finishSpan()`(
        @LongForgery(100L, 2000L) duration: Long
    ) {
        // Given
        val endTimestamp = fakeTimestamp + duration

        // When
        fakeGlobalState.forEach { (k, v) ->
            GlobalState.addAttribute(k, v)
        }
        testedTrace.startSpan(
            fakeOperation,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )
        val id = lastResolvedValue.toString()
        testedTrace.finishSpan(
            id,
            emptyMap<String, String>().toReadableMap(),
            endTimestamp,
            mockPromise
        )

        // Then
        assertThat(id).isEqualTo(fakeSpanId.toString())
        verify(mockSpan).context()
        verify(mockSpan).finish(endTimestamp.toLong() * 1000)
        fakeContext.forEach {
            verify(mockSpan).setTag(it.key, it.value)
        }
        fakeGlobalState.forEach {
            verify(mockSpan, times(2)).setTag(it.key, it.value)
        }
        verifyNoMoreInteractions(mockSpan)
    }

    @Test
    fun `M start and stop span with global state on finish W startSpan() + finishSpan()`(
        @LongForgery(100L, 2000L) duration: Long
    ) {
        // Given
        val endTimestamp = fakeTimestamp + duration
        val expectedAttributes = fakeContext + fakeGlobalState

        // When
        testedTrace.startSpan(
            fakeOperation,
            emptyMap<String, String>().toReadableMap(),
            fakeTimestamp,
            mockPromise
        )
        val id = lastResolvedValue.toString()
        fakeGlobalState.forEach { (k, v) ->
            GlobalState.addAttribute(k, v)
        }
        testedTrace.finishSpan(id, fakeContext.toReadableMap(), endTimestamp, mockPromise)

        // Then
        assertThat(id).isEqualTo(fakeSpanId.toString())
        verify(mockSpan).context()
        verify(mockSpan).finish(endTimestamp.toLong() * 1000)
        expectedAttributes.forEach {
            verify(mockSpan).setTag(it.key, it.value)
        }
        verifyNoMoreInteractions(mockSpan)
    }
}
