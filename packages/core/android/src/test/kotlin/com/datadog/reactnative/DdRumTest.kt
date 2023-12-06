/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.rum.RumActionType
import com.datadog.android.rum.RumAttributes
import com.datadog.android.rum.RumErrorSource
import com.datadog.android.rum.RumMonitor
import com.datadog.android.rum.RumResourceKind
import com.datadog.android.rum.RumResourceMethod
import com.datadog.tools.unit.forge.BaseConfigurator
import com.datadog.tools.unit.toReadableMap
import com.facebook.react.bridge.Promise
import fr.xgouchet.elmyr.Forge
import fr.xgouchet.elmyr.annotation.BoolForgery
import fr.xgouchet.elmyr.annotation.DoubleForgery
import fr.xgouchet.elmyr.annotation.Forgery
import fr.xgouchet.elmyr.annotation.IntForgery
import fr.xgouchet.elmyr.annotation.StringForgery
import fr.xgouchet.elmyr.annotation.StringForgeryType
import fr.xgouchet.elmyr.junit5.ForgeConfiguration
import fr.xgouchet.elmyr.junit5.ForgeExtension
import java.util.Date
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.doReturn
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
@ForgeConfiguration(BaseConfigurator::class)
internal class DdRumTest {

    // TODO: 14/12/2020 RUMM-925 Add the relevant unit tests after merging the feature/bridge branch

    lateinit var testedDdRum: DdRumImplementation

    @Mock
    lateinit var mockRumMonitor: RumMonitor

    @Mock
    lateinit var mockDatadog: DatadogWrapper

    @Mock
    lateinit var mockPromise: Promise

    lateinit var fakeContext: Map<String, Any?>

    @DoubleForgery(1000000000000.0, 2000000000000.0)
    var fakeTimestamp: Double = 0.0

    @BeforeEach
    fun `set up`(forge: Forge) {
        whenever(mockDatadog.getRumMonitor()) doReturn mockRumMonitor

        fakeContext = forge.aMap {
            anAlphabeticalString() to aNullable {
                anElementFrom(
                    anHexadecimalString(),
                    anInt(),
                    aLong(),
                    getForgery<Date>(),
                    getForgery<Throwable>()
                )
            }
        }

        testedDdRum = DdRumImplementation(mockDatadog)
    }

    @AfterEach
    fun `tear down`() {
    }

    @Test
    fun `M call startView W startView()`(
        @StringForgery key: String,
        @StringForgery name: String
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }

        // When
        testedDdRum.startView(key, name, fakeContext.toReadableMap(), fakeTimestamp, mockPromise)

        // Then
        verify(mockRumMonitor).startView(key, name, updatedContext)
    }

    @Test
    fun `M call stopView W stopView()`(
        @StringForgery key: String
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }

        // When
        testedDdRum.stopView(key, fakeContext.toReadableMap(), fakeTimestamp, mockPromise)

        // Then
        verify(mockRumMonitor).stopView(key, updatedContext)
    }

    @Test
    fun `M call addAction W addAction()`(
        @StringForgery name: String,
        @Forgery type: RumActionType
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }

        // When
        testedDdRum.addAction(
            type.name,
            name,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

        // Then
        verify(mockRumMonitor).addAction(type, name, updatedContext)
    }

    @Test
    fun `M call addAction W addAction() with invalid type`(
        @StringForgery name: String,
        @StringForgery(StringForgeryType.HEXADECIMAL) type: String
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }

        // When
        testedDdRum.addAction(type, name, fakeContext.toReadableMap(), fakeTimestamp, mockPromise)

        // Then
        verify(mockRumMonitor).addAction(RumActionType.CUSTOM, name, updatedContext)
    }

    @Test
    fun `M call startAction W startAction()`(
        @Forgery type: RumActionType,
        @StringForgery name: String
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }

        // When
        testedDdRum.startAction(
            type.name,
            name,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

        // Then
        verify(mockRumMonitor).startAction(type, name, updatedContext)
    }

    @Test
    fun `M call startAction W startAction() with invalid type`(
        @StringForgery name: String,
        @StringForgery(StringForgeryType.HEXADECIMAL) type: String
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }

        // When
        testedDdRum.startAction(type, name, fakeContext.toReadableMap(), fakeTimestamp, mockPromise)

        // Then
        verify(mockRumMonitor).startAction(RumActionType.CUSTOM, name, updatedContext)
    }

    @Test
    fun `M call stopAction W stopAction()`(
        @Forgery type: RumActionType,
        @StringForgery name: String
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }

        // When
        testedDdRum.stopAction(
            type.name,
            name,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

        // Then
        verify(mockRumMonitor).stopAction(type, name, updatedContext)
    }

    @Test
    fun `M call stopAction W stopAction() with invalid type`(
        @StringForgery name: String,
        @StringForgery(StringForgeryType.HEXADECIMAL) type: String
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }

        // When
        testedDdRum.stopAction(type, name, fakeContext.toReadableMap(), fakeTimestamp, mockPromise)

        // Then
        verify(mockRumMonitor).stopAction(RumActionType.CUSTOM, name, updatedContext)
    }

    @Test
    fun `M call startResource W startResource()`(
        @StringForgery key: String,
        @Forgery method: RumResourceMethod,
        @StringForgery(regex = "http(s?)://[a-z]+\\.com/\\w+") url: String
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }

        // When
        testedDdRum.startResource(
            key,
            method.toString(),
            url,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

        // Then
        verify(mockRumMonitor).startResource(key, method, url, updatedContext)
    }

    @Test
    fun `M call stopResource W stopResource()`(
        @StringForgery key: String,
        @IntForgery(200, 600) statusCode: Int,
        @DoubleForgery(min = 0.0) resourceSize: Double,
        @Forgery kind: RumResourceKind
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }

        // When
        testedDdRum.stopResource(
            key,
            statusCode.toDouble(),
            kind.toString(),
            resourceSize,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

        // Then
        verify(mockRumMonitor).stopResource(
            key,
            statusCode,
            resourceSize.toLong(),
            kind,
            updatedContext
        )
    }

    @Test
    fun `M call stopResource W stopResource() with invalid kind`(
        @StringForgery key: String,
        @IntForgery(200, 600) statusCode: Int,
        @DoubleForgery(min = 0.0) resourceSize: Double,
        @StringForgery(StringForgeryType.HEXADECIMAL) kind: String
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }

        // When
        testedDdRum.stopResource(
            key,
            statusCode.toDouble(),
            kind,
            resourceSize,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

        // Then
        verify(mockRumMonitor).stopResource(
            key,
            statusCode,
            resourceSize.toLong(),
            RumResourceKind.UNKNOWN,
            updatedContext
        )
    }

    @Test
    fun `M call stopResource W stopResource() with missing resource size`(
        @StringForgery key: String,
        @IntForgery(200, 600) statusCode: Int,
        @StringForgery(StringForgeryType.HEXADECIMAL) kind: String
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }

        // When
        testedDdRum.stopResource(
            key,
            statusCode.toDouble(),
            kind,
            -1.0,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

        // Then
        verify(mockRumMonitor).stopResource(
            key,
            statusCode,
            null,
            RumResourceKind.UNKNOWN,
            updatedContext
        )
    }

    @Test
    fun `M call addError W addError()`(
        @StringForgery message: String,
        @Forgery source: RumErrorSource,
        @StringForgery stackTrace: String
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }

        // When
        testedDdRum.addError(
            message,
            source.name,
            stackTrace,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

        // Then
        verify(mockRumMonitor).addErrorWithStacktrace(message, source, stackTrace, updatedContext)
    }

    @Test
    fun `M call addError W addError() with invalid source`(
        @StringForgery message: String,
        @StringForgery(StringForgeryType.HEXADECIMAL) source: String,
        @StringForgery stackTrace: String
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }

        // When
        testedDdRum.addError(
            message,
            source,
            stackTrace,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

        // Then
        verify(mockRumMonitor).addErrorWithStacktrace(
            message,
            RumErrorSource.SOURCE,
            stackTrace,
            updatedContext
        )
    }

    @Test
    fun `M call addTiming W addTiming()`(@StringForgery timing: String) {
        // When
        testedDdRum.addTiming(timing, mockPromise)

        // Then
        verify(mockRumMonitor).addTiming(timing)
    }

    @Test
    fun `M call stopSession W stopSession()`() {
        // When
        testedDdRum.stopSession(mockPromise)

        // Then
        verify(mockRumMonitor).stopSession()
    }

    @Test
    fun `M call addFeatureFlagEvaluation W addFeatureFlagEvaluation(boolean value)`(
        @StringForgery name: String,
        @BoolForgery value: Boolean
    ) {
        val valueAsReadableMap = mapOf<String, Any?>(
            "value" to value
        )

        // When
        testedDdRum.addFeatureFlagEvaluation(name, valueAsReadableMap.toReadableMap(), mockPromise)

        // Then
        verify(mockRumMonitor).addFeatureFlagEvaluation(name, value)
    }
}
