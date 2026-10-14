/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.heatmaps.CrossPlatformHeatmapActionData
import com.datadog.android.rum.RumActionType
import com.datadog.android.rum.RumAttributes
import com.datadog.android.rum.RumErrorSource
import com.datadog.android.rum.RumMonitor
import com.datadog.android.rum.RumResourceKind
import com.datadog.android.rum.RumResourceMethod
import com.datadog.android.rum._RumInternalProxy
import com.datadog.tools.unit.forge.BaseConfigurator
import com.datadog.tools.unit.toReadableArray
import com.datadog.tools.unit.toReadableMap
import com.facebook.react.bridge.Promise
import fr.xgouchet.elmyr.Forge
import fr.xgouchet.elmyr.annotation.AdvancedForgery
import fr.xgouchet.elmyr.annotation.BoolForgery
import fr.xgouchet.elmyr.annotation.DoubleForgery
import fr.xgouchet.elmyr.annotation.Forgery
import fr.xgouchet.elmyr.annotation.IntForgery
import fr.xgouchet.elmyr.annotation.MapForgery
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
import org.mockito.kotlin.any
import org.mockito.kotlin.doReturn
import org.mockito.kotlin.eq
import org.mockito.kotlin.inOrder
import org.mockito.kotlin.never
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

    /**
     * `RumMonitor._getInternal()` is a synthetic method (dd-sdk-android's `@NoOpImplementation`);
     * Mockito can't override it, so stubbing it directly throws `AbstractMethodError`. A real
     * compiled override sidesteps that.
     */
    private class RumMonitorWithInternalProxy(
        monitor: RumMonitor,
        private val internalProxy: _RumInternalProxy?
    ) : RumMonitor by monitor {
        override fun _getInternal(): _RumInternalProxy? = internalProxy
    }

    // TODO: 14/12/2020 RUMM-925 Add the relevant unit tests after merging the feature/bridge branch

    lateinit var testedDdRum: DdRumImplementation

    @Mock
    lateinit var mockRumMonitor: RumMonitor

    @Mock
    lateinit var mockDatadog: DatadogWrapper

    @Mock
    lateinit var mockPromise: Promise

    @Mock
    lateinit var mockInternalProxy: _RumInternalProxy

    @Mock
    lateinit var mockHeatmapTouchResolver: HeatmapTouchResolver

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
        // Reset global heatmaps flag so it never leaks into subsequent tests
        HeatmapActionHandler.heatmapsEnabled = false
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
            null,
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
        testedDdRum.addAction(
            type,
            name,
            null,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

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
            "",
            mockPromise
        )

        // Then
        verify(mockRumMonitor).addErrorWithStacktrace(message, source, stackTrace, updatedContext)
    }

    @Test
    fun `M call addError with custom fingerprint W addError() with fingerprint`(
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
            "custom-error-fingerprint",
            mockPromise
        )

        // Then
        updatedContext["_dd.error.fingerprint"] = "custom-error-fingerprint"
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
            "",
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
    fun `M call addViewAttribute W addViewAttribute()`(
        @StringForgery key: String,
        @StringForgery value: String
    ) {
        var attributeMap = mutableMapOf<String, Any?>()
        attributeMap.put("value", value)

        var attributes = mutableMapOf<String, Any?>()
        attributes.put(key, value)

        // When
        testedDdRum.addViewAttribute(key, attributeMap.toReadableMap(), mockPromise)

        // Then
        verify(mockRumMonitor).addViewAttributes(attributes)
    }

    @Test
    fun `M call removeViewAttribute W removeViewAttribute()`(@StringForgery key: String) {
        // When
        testedDdRum.removeViewAttribute(key, mockPromise)

        // Then
        verify(mockRumMonitor).removeViewAttributes(listOf(key))
    }

    @Test
    fun `M call addViewAttributes W addViewAttributes()`(
        @MapForgery(
            key = AdvancedForgery(string = [StringForgery(StringForgeryType.NUMERICAL)]),
            value = AdvancedForgery(string = [StringForgery(StringForgeryType.ASCII)])
        ) customAttributes: Map<String, String>
    ) {
        // When
        testedDdRum.addViewAttributes(customAttributes.toReadableMap(), mockPromise)

        // Then
        verify(mockRumMonitor).addViewAttributes(customAttributes)
    }

    @Test
    fun `𝕄 call removeViewAttributes 𝕎 removeViewAttributes`(
        @MapForgery(
            key = AdvancedForgery(string = [StringForgery(StringForgeryType.NUMERICAL)]),
            value = AdvancedForgery(string = [StringForgery(StringForgeryType.ASCII)])
        ) customAttributes: Map<String, String>
    ) {
        // When
        testedDdRum.removeViewAttributes(customAttributes.keys.toReadableArray(), mockPromise)

        // Then
        verify(mockRumMonitor).removeViewAttributes(customAttributes.keys.toList())
    }

    @Test
    fun `M call addViewLoadingTime w addViewLoadingTime()`(@BoolForgery overwrite: Boolean) {
        // When
        testedDdRum.addViewLoadingTime(overwrite, mockPromise)

        // Then
        verify(mockRumMonitor).addViewLoadingTime(overwrite)
    }

    @Test
    fun `M call reportAppFullyDisplayed w reportAppFullyDisplayed()`() {
        // When
        testedDdRum.reportAppFullyDisplayed(mockPromise)

        // Then
        verify(mockRumMonitor).reportAppFullyDisplayed()
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

    @Test
    fun `M call addActionWithHeatmap W addAction() with TAP type and resolver returns data`(
        @StringForgery name: String,
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 300.0) fakeX: Double,
        @DoubleForgery(0.0, 300.0) fakeY: Double,
        @StringForgery fakeViewUrl: String
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }
        HeatmapActionHandler.heatmapsEnabled = true
        whenever(mockDatadog.getRumMonitor()) doReturn RumMonitorWithInternalProxy(
            mockRumMonitor,
            mockInternalProxy
        )
        whenever(mockInternalProxy.getCurrentViewUrl()) doReturn fakeViewUrl

        val fakeHeatmapData = CrossPlatformHeatmapActionData(
            elementPath = listOf("cls:android.view.View#0"),
            viewUrl = fakeViewUrl,
            positionX = fakeX.toLong(),
            positionY = fakeY.toLong(),
            targetWidth = 100L,
            targetHeight = 50L
        )
        whenever(
            mockHeatmapTouchResolver.resolveHeatmapActionData(
                fakeReactTag,
                fakeX.toLong(),
                fakeY.toLong(),
                fakeViewUrl
            )
        ) doReturn fakeHeatmapData

        val testedDdRumWithHeatmap = DdRumImplementation(
            datadog = mockDatadog,
            heatmapActionHandler = HeatmapActionHandler(
                heatmapTouchResolver = mockHeatmapTouchResolver,
                mainThreadExecutor = { it() }
            )
        )
        val fakeTouch = mapOf<String, Any>(
            "reactTag" to fakeReactTag,
            "x" to fakeX,
            "y" to fakeY,
            "pageX" to fakeX,
            "pageY" to fakeY
        ).toReadableMap()

        // When
        testedDdRumWithHeatmap.addAction(
            "TAP",
            name,
            fakeTouch,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

        // Then
        verify(mockInternalProxy).addActionWithHeatmap(
            eq(RumActionType.TAP),
            eq(name),
            eq(fakeHeatmapData),
            eq(updatedContext)
        )
        verify(mockPromise).resolve(null)
        verify(mockRumMonitor, never()).addAction(RumActionType.TAP, name, updatedContext)
    }

    @Test
    fun `M fall back to addAction W addAction() with TAP type and resolver returns null`(
        @StringForgery name: String,
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 300.0) fakeX: Double,
        @DoubleForgery(0.0, 300.0) fakeY: Double,
        @StringForgery fakeViewUrl: String
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }
        HeatmapActionHandler.heatmapsEnabled = true
        whenever(mockDatadog.getRumMonitor()) doReturn RumMonitorWithInternalProxy(
            mockRumMonitor,
            mockInternalProxy
        )
        whenever(mockInternalProxy.getCurrentViewUrl()) doReturn fakeViewUrl
        whenever(
            mockHeatmapTouchResolver.resolveHeatmapActionData(any(), any(), any(), any())
        ) doReturn null

        val testedDdRumWithHeatmap = DdRumImplementation(
            datadog = mockDatadog,
            heatmapActionHandler = HeatmapActionHandler(
                heatmapTouchResolver = mockHeatmapTouchResolver,
                mainThreadExecutor = { it() }
            )
        )
        val fakeTouch = mapOf<String, Any>(
            "reactTag" to fakeReactTag,
            "x" to fakeX,
            "y" to fakeY,
            "pageX" to fakeX,
            "pageY" to fakeY
        ).toReadableMap()

        // When
        testedDdRumWithHeatmap.addAction(
            "TAP",
            name,
            fakeTouch,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

        // Then
        verify(mockRumMonitor).addAction(RumActionType.TAP, name, updatedContext)
        verify(mockInternalProxy, never()).addActionWithHeatmap(any(), any(), any(), any())
        verify(mockPromise).resolve(null)
    }

    @Test
    fun `M call addAction W addAction() with TAP type and no internal proxy`(
        @StringForgery name: String,
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 300.0) fakeX: Double,
        @DoubleForgery(0.0, 300.0) fakeY: Double
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }
        HeatmapActionHandler.heatmapsEnabled = true
        whenever(mockDatadog.getRumMonitor()) doReturn RumMonitorWithInternalProxy(
            mockRumMonitor,
            null
        )

        val fakeTouch = mapOf<String, Any>(
            "reactTag" to fakeReactTag,
            "x" to fakeX,
            "y" to fakeY,
            "pageX" to fakeX,
            "pageY" to fakeY
        ).toReadableMap()

        // When
        testedDdRum.addAction(
            "TAP",
            name,
            fakeTouch,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

        // Then
        verify(mockRumMonitor).addAction(RumActionType.TAP, name, updatedContext)
        verify(mockPromise).resolve(null)
    }

    // region heatmapsEnabled gate and type guard

    @Test
    fun `M call addAction W addAction() TAP with touch but heatmapsEnabled false`(
        @StringForgery name: String,
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 300.0) fakeX: Double,
        @DoubleForgery(0.0, 300.0) fakeY: Double
    ) {
        // Given — heatmapsEnabled false short-circuits before _getInternal() is reached
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }

        val fakeTouch = mapOf<String, Any>(
            "reactTag" to fakeReactTag,
            "x" to fakeX,
            "y" to fakeY,
            "pageX" to fakeX,
            "pageY" to fakeY
        ).toReadableMap()

        // When
        testedDdRum.addAction(
            "TAP",
            name,
            fakeTouch,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

        // Then
        verify(mockRumMonitor).addAction(RumActionType.TAP, name, updatedContext)
        verify(mockInternalProxy, never()).addActionWithHeatmap(
            any(),
            any(),
            any(),
            any()
        )
    }

    @Test
    fun `M call addAction W addAction() non-TAP type with touch and heatmapsEnabled`(
        @StringForgery name: String,
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 300.0) fakeX: Double,
        @DoubleForgery(0.0, 300.0) fakeY: Double
    ) {
        // Given — non-TAP type short-circuits before _getInternal() is reached
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }
        HeatmapActionHandler.heatmapsEnabled = true

        val fakeTouch = mapOf<String, Any>(
            "reactTag" to fakeReactTag,
            "x" to fakeX,
            "y" to fakeY,
            "pageX" to fakeX,
            "pageY" to fakeY
        ).toReadableMap()

        val testedDdRumWithHeatmap = DdRumImplementation(
            datadog = mockDatadog,
            heatmapActionHandler = HeatmapActionHandler(
                heatmapTouchResolver = mockHeatmapTouchResolver,
                mainThreadExecutor = { it() }
            )
        )

        // When
        testedDdRumWithHeatmap.addAction(
            "SCROLL",
            name,
            fakeTouch,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

        // Then
        verify(mockRumMonitor).addAction(RumActionType.SCROLL, name, updatedContext)
        verify(mockInternalProxy, never()).addActionWithHeatmap(
            any(),
            any(),
            any(),
            any()
        )
    }

    @Test
    fun `M fall back to addAction W addAction() TAP with touch missing required keys`(
        @StringForgery name: String,
        @StringForgery fakeViewUrl: String
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }
        HeatmapActionHandler.heatmapsEnabled = true
        whenever(mockDatadog.getRumMonitor()) doReturn RumMonitorWithInternalProxy(
            mockRumMonitor,
            mockInternalProxy
        )
        whenever(mockInternalProxy.getCurrentViewUrl()) doReturn fakeViewUrl

        val fakeIncompleteTouch = mapOf<String, Any>("reactTag" to 1).toReadableMap()

        val testedDdRumWithHeatmap = DdRumImplementation(
            datadog = mockDatadog,
            heatmapActionHandler = HeatmapActionHandler(
                heatmapTouchResolver = mockHeatmapTouchResolver,
                mainThreadExecutor = { it() }
            )
        )

        // When
        testedDdRumWithHeatmap.addAction(
            "TAP",
            name,
            fakeIncompleteTouch,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

        // Then
        verify(mockRumMonitor).addAction(RumActionType.TAP, name, updatedContext)
        verify(mockInternalProxy, never()).addActionWithHeatmap(any(), any(), any(), any())
        verify(mockPromise).resolve(null)
    }

    @Test
    fun `M fall back to addAction W addAction() TAP with touch fields of the wrong type`(
        @StringForgery name: String,
        @StringForgery fakeViewUrl: String
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }
        HeatmapActionHandler.heatmapsEnabled = true
        whenever(mockDatadog.getRumMonitor()) doReturn RumMonitorWithInternalProxy(
            mockRumMonitor,
            mockInternalProxy
        )
        whenever(mockInternalProxy.getCurrentViewUrl()) doReturn fakeViewUrl

        val fakeMistypedTouch = mapOf<String, Any>(
            "reactTag" to 1,
            "x" to "not-a-number",
            "y" to 2.0
        ).toReadableMap()

        val testedDdRumWithHeatmap = DdRumImplementation(
            datadog = mockDatadog,
            heatmapActionHandler = HeatmapActionHandler(
                heatmapTouchResolver = mockHeatmapTouchResolver,
                mainThreadExecutor = { it() }
            )
        )

        // When
        testedDdRumWithHeatmap.addAction(
            "TAP",
            name,
            fakeMistypedTouch,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

        // Then
        verify(mockRumMonitor).addAction(RumActionType.TAP, name, updatedContext)
        verify(mockInternalProxy, never()).addActionWithHeatmap(any(), any(), any(), any())
        verify(mockPromise).resolve(null)
    }

    @Test
    fun `M fall back to addAction W addAction() TAP with no current view url`(
        @StringForgery name: String,
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 300.0) fakeX: Double,
        @DoubleForgery(0.0, 300.0) fakeY: Double
    ) {
        // Given
        val updatedContext = fakeContext.toReadableMap().toHashMap().toMutableMap().apply {
            put(RumAttributes.INTERNAL_TIMESTAMP, fakeTimestamp.toLong())
        }
        HeatmapActionHandler.heatmapsEnabled = true
        whenever(mockDatadog.getRumMonitor()) doReturn RumMonitorWithInternalProxy(
            mockRumMonitor,
            mockInternalProxy
        )
        whenever(mockInternalProxy.getCurrentViewUrl()) doReturn null

        val fakeTouch = mapOf<String, Any>(
            "reactTag" to fakeReactTag,
            "x" to fakeX,
            "y" to fakeY,
            "pageX" to fakeX,
            "pageY" to fakeY
        ).toReadableMap()

        val testedDdRumWithHeatmap = DdRumImplementation(
            datadog = mockDatadog,
            heatmapActionHandler = HeatmapActionHandler(
                heatmapTouchResolver = mockHeatmapTouchResolver,
                mainThreadExecutor = { it() }
            )
        )

        // When
        testedDdRumWithHeatmap.addAction(
            "TAP",
            name,
            fakeTouch,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

        // Then
        verify(mockRumMonitor).addAction(RumActionType.TAP, name, updatedContext)
        verify(mockInternalProxy, never()).addActionWithHeatmap(any(), any(), any(), any())
        verify(mockPromise).resolve(null)
    }

    @Test
    fun `M resolve promise before dispatching heatmap work W addAction() with TAP type`(
        @StringForgery name: String,
        @IntForgery(min = 1) fakeReactTag: Int,
        @DoubleForgery(0.0, 300.0) fakeX: Double,
        @DoubleForgery(0.0, 300.0) fakeY: Double,
        @StringForgery fakeViewUrl: String
    ) {
        // Given
        HeatmapActionHandler.heatmapsEnabled = true
        whenever(mockDatadog.getRumMonitor()) doReturn RumMonitorWithInternalProxy(
            mockRumMonitor,
            mockInternalProxy
        )
        whenever(mockInternalProxy.getCurrentViewUrl()) doReturn fakeViewUrl

        val fakeHeatmapData = CrossPlatformHeatmapActionData(
            elementPath = listOf("cls:android.view.View#0"),
            viewUrl = fakeViewUrl,
            positionX = fakeX.toLong(),
            positionY = fakeY.toLong(),
            targetWidth = 100L,
            targetHeight = 50L
        )
        whenever(
            mockHeatmapTouchResolver.resolveHeatmapActionData(any(), any(), any(), any())
        ) doReturn fakeHeatmapData

        val testedDdRumWithHeatmap = DdRumImplementation(
            datadog = mockDatadog,
            heatmapActionHandler = HeatmapActionHandler(
                heatmapTouchResolver = mockHeatmapTouchResolver,
                mainThreadExecutor = { it() }
            )
        )
        val fakeTouch = mapOf<String, Any>(
            "reactTag" to fakeReactTag,
            "x" to fakeX,
            "y" to fakeY,
            "pageX" to fakeX,
            "pageY" to fakeY
        ).toReadableMap()

        // When
        testedDdRumWithHeatmap.addAction(
            "TAP",
            name,
            fakeTouch,
            fakeContext.toReadableMap(),
            fakeTimestamp,
            mockPromise
        )

        // Then — order holds even though mainThreadExecutor runs synchronously here
        inOrder(mockPromise, mockInternalProxy) {
            verify(mockPromise).resolve(null)
            verify(mockInternalProxy).addActionWithHeatmap(any(), any(), any(), any())
        }
    }

    // endregion
}
