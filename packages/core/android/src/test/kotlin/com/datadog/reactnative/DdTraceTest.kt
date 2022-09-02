/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.tools.unit.toReadableMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.doAnswer
import com.nhaarman.mockitokotlin2.doReturn
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.never
import com.nhaarman.mockitokotlin2.times
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.verifyNoMoreInteractions
import com.nhaarman.mockitokotlin2.whenever
import fr.xgouchet.elmyr.annotation.AdvancedForgery
import fr.xgouchet.elmyr.annotation.DoubleForgery
import fr.xgouchet.elmyr.annotation.LongForgery
import fr.xgouchet.elmyr.annotation.MapForgery
import fr.xgouchet.elmyr.annotation.StringForgery
import fr.xgouchet.elmyr.annotation.StringForgeryType
import fr.xgouchet.elmyr.junit5.ForgeExtension
import io.opentracing.Span
import io.opentracing.SpanContext
import io.opentracing.Tracer
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
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
internal class DdTraceTest {

    lateinit var testedTrace: DdTrace

    @Mock
    lateinit var mockTracer: Tracer

    @Mock
    lateinit var mockSpanBuilder: Tracer.SpanBuilder

    @Mock
    lateinit var mockSpanContext: SpanContext

    @Mock
    lateinit var mockSpan: Span

    @StringForgery
    lateinit var fakeOperation: String

    @DoubleForgery(1000000000000.0, 2000000000000.0)
    var fakeTimestamp: Double = 0.0

    @StringForgery(type = StringForgeryType.HEXADECIMAL)
    lateinit var fakeSpanId: String

    @StringForgery(type = StringForgeryType.HEXADECIMAL)
    lateinit var fakeTraceId: String

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

    @Mock
    lateinit var mockReactContext: ReactApplicationContext

    @BeforeEach
    fun `set up`() {
        whenever(mockTracer.buildSpan(fakeOperation)) doReturn mockSpanBuilder
        whenever(mockSpanBuilder.withStartTimestamp(fakeTimestamp.toLong() * 1000)) doReturn mockSpanBuilder
        whenever(mockSpanBuilder.start()) doReturn mockSpan
        whenever(mockSpan.context()) doReturn mockSpanContext
        whenever(mockSpanContext.toSpanId()) doReturn fakeSpanId
        whenever(mockSpanContext.toTraceId()) doReturn fakeTraceId

        testedTrace = DdTrace(mockReactContext, tracerProvider = { mockTracer })
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
        assertThat(lastResolvedValue).isEqualTo(fakeSpanId)
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
        val id = lastResolvedValue
        testedTrace.finishSpan(id as String, fakeContext.toReadableMap(), endTimestamp, mockPromise)

        // Then
        assertThat(id).isEqualTo(fakeSpanId)
        verify(mockSpan).finish(endTimestamp.toLong() * 1000)
    }

    @Test
    fun `M do nothing W startSpan() + finishSpan() with unknown id`(
        @LongForgery(100L, 2000L) duration: Long,
        @StringForgery(type = StringForgeryType.HEXADECIMAL) otherSpanId: String
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
        val id = lastResolvedValue
        testedTrace.finishSpan(otherSpanId, fakeContext.toReadableMap(), endTimestamp, mockPromise)

        // Then
        assertThat(id).isEqualTo(fakeSpanId)
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
        val id = lastResolvedValue
        testedTrace.finishSpan(
            id as String,
            emptyMap<String, String>().toReadableMap(),
            endTimestamp,
            mockPromise
        )

        // Then
        assertThat(id).isEqualTo(fakeSpanId)
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
        val id = lastResolvedValue
        testedTrace.finishSpan(id as String, fakeContext.toReadableMap(), endTimestamp, mockPromise)

        // Then
        assertThat(id).isEqualTo(fakeSpanId)
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
        val id = lastResolvedValue
        testedTrace.finishSpan(
            id as String,
            emptyMap<String, String>().toReadableMap(),
            endTimestamp,
            mockPromise
        )

        // Then
        assertThat(id).isEqualTo(fakeSpanId)
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
        val id = lastResolvedValue
        fakeGlobalState.forEach { (k, v) ->
            GlobalState.addAttribute(k, v)
        }
        testedTrace.finishSpan(id as String, fakeContext.toReadableMap(), endTimestamp, mockPromise)

        // Then
        assertThat(id).isEqualTo(fakeSpanId)
        verify(mockSpan).context()
        verify(mockSpan).finish(endTimestamp.toLong() * 1000)
        expectedAttributes.forEach {
            verify(mockSpan).setTag(it.key, it.value)
        }
        verifyNoMoreInteractions(mockSpan)
    }
}
