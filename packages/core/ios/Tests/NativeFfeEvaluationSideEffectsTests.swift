/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import XCTest
@_spi(Internal)
import DatadogFlags

@testable import DatadogSDKReactNative

final class NativeFfeEvaluationSideEffectsTests: XCTestCase {
    private let fakeTracker = FakeEvaluationTracker()

    func testTrackEvaluationWithSuccessfulNativeEvaluationResult() throws {
        let testedSideEffects = NativeFfeEvaluationSideEffects(tracker: fakeTracker)
        let fixture = try sideEffectFixture("tracked-string-evaluation.json")

        let status = testedSideEffects.trackEvaluation(
            result: fixture.result,
            context: fixture.context
        )

        let request = try XCTUnwrap(fakeTracker.trackedRequest)
        XCTAssertEqual(status, "tracked")
        XCTAssertEqual(request.clientName, "default")
        XCTAssertEqual(request.flagKey, "checkout.copy")
        XCTAssertEqual(request.assignment.variationKey, "treatment")
        XCTAssertEqual(request.assignment.allocationKey, "pro allocation")
        XCTAssertEqual(request.assignment.reason, "TARGETING_MATCH")
        XCTAssertEqual(request.assignment.doLog, true)
        if case .string(let variationValue) = request.assignment.variation {
            XCTAssertEqual(variationValue, "enabled")
        } else {
            XCTFail("Expected string variation")
        }
        XCTAssertEqual(request.context.targetingKey, "user-123")

        let debugState = testedSideEffects.debugState()
        XCTAssertEqual(debugState["attemptedCount"] as? Int, 1)
        XCTAssertEqual(debugState["trackedCount"] as? Int, 1)
        XCTAssertEqual(debugState["skippedCount"] as? Int, 0)
        XCTAssertEqual(debugState["failedCount"] as? Int, 0)
        XCTAssertEqual(debugState["lastStatus"] as? String, "tracked")
    }

    func testSkipEvaluationSideEffectsWithDefaultResult() throws {
        let testedSideEffects = NativeFfeEvaluationSideEffects(tracker: fakeTracker)
        let fixture = try sideEffectFixture("skipped-default-evaluation.json")

        let status = testedSideEffects.trackEvaluation(
            result: fixture.result,
            context: fixture.context
        )

        XCTAssertEqual(status, "skipped")
        XCTAssertNil(fakeTracker.trackedRequest)
        let debugState = testedSideEffects.debugState()
        XCTAssertEqual(debugState["attemptedCount"] as? Int, 0)
        XCTAssertEqual(debugState["trackedCount"] as? Int, 0)
        XCTAssertEqual(debugState["skippedCount"] as? Int, 1)
        XCTAssertEqual(debugState["failedCount"] as? Int, 0)
        XCTAssertEqual(debugState["lastStatus"] as? String, "skipped")
    }

    private func sideEffectFixture(_ fileName: String) throws -> SideEffectFixture {
        let fixture = try NativeFfeTestFixtures.jsonObject(
            "native-ffe/evaluation-side-effects/\(fileName)"
        )
        return SideEffectFixture(
            result: try XCTUnwrap(fixture["result"] as? [String: Any]),
            context: (fixture["context"] as? [String: Any]) ?? [:]
        )
    }

    private struct SideEffectFixture {
        let result: [String: Any]
        let context: [String: Any]
    }

    private final class FakeEvaluationTracker: NativeFfeEvaluationTracking {
        var trackedRequest: NativeFfeEvaluationSideEffectRequest?

        func track(_ request: NativeFfeEvaluationSideEffectRequest) throws {
            trackedRequest = request
        }
    }
}
