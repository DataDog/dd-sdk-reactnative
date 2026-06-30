/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import org.assertj.core.api.Assertions.assertThat
import org.json.JSONObject
import org.junit.jupiter.api.Test

internal class NativeFfeEvaluationSideEffectsTest {
    private val fakeTracker = FakeEvaluationTracker()
    private val testedSideEffects = NativeFfeEvaluationSideEffects(fakeTracker)

    @Test
    fun `M track evaluation W successful native evaluation result`() {
        // Given
        val fixture = sideEffectFixture("tracked-string-evaluation.json")

        // When
        val status = testedSideEffects.trackEvaluation(fixture.result, fixture.context)

        // Then
        val request = fakeTracker.trackedRequest
        assertThat(status).isEqualTo("tracked")
        assertThat(request?.clientName).isEqualTo("default")
        assertThat(request?.flagKey).isEqualTo("checkout.copy")
        assertThat(request?.flag?.variationType).isEqualTo("string")
        assertThat(request?.flag?.variationValue).isEqualTo("enabled")
        assertThat(request?.flag?.variationKey).isEqualTo("treatment")
        assertThat(request?.flag?.allocationKey).isEqualTo("pro allocation")
        assertThat(request?.flag?.doLog).isEqualTo(true)
        assertThat(request?.flag?.reason).isEqualTo("TARGETING_MATCH")
        assertThat(request?.flag?.extraLogging?.optString("owner")).isEqualTo("feature-flags")
        assertThat(testedSideEffects.debugState())
            .containsEntry("attemptedCount", 1)
            .containsEntry("trackedCount", 1)
            .containsEntry("skippedCount", 0)
            .containsEntry("failedCount", 0)
            .containsEntry("lastStatus", "tracked")
    }

    @Test
    fun `M skip evaluation side effects W default result`() {
        // Given
        val fixture = sideEffectFixture("skipped-default-evaluation.json")

        // When
        val status = testedSideEffects.trackEvaluation(fixture.result, fixture.context)

        // Then
        assertThat(status).isEqualTo("skipped")
        assertThat(fakeTracker.trackedRequest).isNull()
        assertThat(testedSideEffects.debugState())
            .containsEntry("attemptedCount", 0)
            .containsEntry("trackedCount", 0)
            .containsEntry("skippedCount", 1)
            .containsEntry("failedCount", 0)
            .containsEntry("lastStatus", "skipped")
    }

    private class FakeEvaluationTracker : NativeFfeEvaluationTracker {
        var trackedRequest: NativeFfeEvaluationSideEffectRequest? = null

        override fun track(request: NativeFfeEvaluationSideEffectRequest) {
            trackedRequest = request
        }
    }

    private fun sideEffectFixture(fileName: String): SideEffectFixture {
        val fixture = JSONObject(
            readNativeFfeFixture(
                javaClass,
                "native-ffe/evaluation-side-effects/$fileName"
            )
        )

        return SideEffectFixture(
            result = fixture.getJSONObject("result").toNativeFfeFixtureMap(),
            context = (fixture.optJSONObject("context") ?: JSONObject()).toNativeFfeFixtureMap(),
        )
    }

    private data class SideEffectFixture(
        val result: Map<String, Any?>,
        val context: Map<String, Any?>,
    )
}
