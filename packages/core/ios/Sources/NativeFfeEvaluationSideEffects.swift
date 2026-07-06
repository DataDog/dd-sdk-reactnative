/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import DatadogInternal
@_spi(Internal)
import DatadogFlags
import Foundation

internal final class NativeFfeEvaluationSideEffects {
    private let tracker: NativeFfeEvaluationTracking
    private var attemptedCount = 0
    private var trackedCount = 0
    private var skippedCount = 0
    private var failedCount = 0
    private var lastStatus: String?
    private var lastError: String?

    init(tracker: NativeFfeEvaluationTracking = DatadogFlagsEvaluationTracker()) {
        self.tracker = tracker
    }

    @discardableResult
    func trackEvaluation(result: [String: Any], context: [String: Any]) -> String {
        guard let request = buildRequest(result: result, context: context) else {
            skippedCount += 1
            lastStatus = Status.skipped
            lastError = nil
            return Status.skipped
        }

        attemptedCount += 1
        do {
            try tracker.track(request)
            trackedCount += 1
            lastStatus = Status.tracked
            lastError = nil
            return Status.tracked
        } catch {
            failedCount += 1
            lastStatus = Status.failed
            lastError = error.localizedDescription
            let message = "Native FFE evaluation side effects failed for flag " +
                "'\(request.flagKey)': \(error.localizedDescription)"
            consolePrint(message, .warn)
            return Status.failed
        }
    }

    func debugState() -> [String: Any] {
        buildMap([
            ("attemptedCount", attemptedCount),
            ("trackedCount", trackedCount),
            ("skippedCount", skippedCount),
            ("failedCount", failedCount),
            ("lastStatus", lastStatus),
            ("lastError", lastError),
        ])
    }

    private func buildMap(_ values: [(String, Any?)]) -> [String: Any] {
        Dictionary(
            uniqueKeysWithValues: values.compactMap { key, value in
                guard let value else {
                    return nil
                }
                return (key, value)
            }
        )
    }

    private func buildRequest(
        result: [String: Any],
        context: [String: Any]
    ) -> NativeFfeEvaluationSideEffectRequest? {
        guard
            let metadata = result["flagMetadata"] as? [String: Any],
            let flagKey = stringValue(result["flagKey"]),
            let variationKey = stringValue(result["variant"]),
            let allocationKey = stringValue(metadata["allocationKey"]),
            let reason = stringValue(result["reason"]),
            let value = result["value"],
            let targetingKey = stringValue(context["targetingKey"]),
            !targetingKey.isEmpty
        else {
            return nil
        }

        let attributes = dictionaryValue(context["attributes"]) ?? [:]
        let evaluationContext = FlagsEvaluationContext(
            targetingKey: targetingKey,
            attributes: attributes.compactMapValues { AnyValue.wrap($0) }
        )

        return NativeFfeEvaluationSideEffectRequest(
            clientName: stringValue(context["clientName"]) ?? Constants.defaultClientName,
            flagKey: flagKey,
            assignment: FlagAssignment(
                allocationKey: allocationKey,
                variationKey: variationKey,
                variation: variation(from: value),
                reason: reason,
                doLog: boolValue(metadata["doLog"]) ?? false
            ),
            context: evaluationContext
        )
    }

    private func dictionaryValue(_ value: Any?) -> [String: Any]? {
        value as? [String: Any]
    }

    private func stringValue(_ value: Any?) -> String? {
        switch value {
        case let value as String:
            return value
        case let value as NSNumber:
            return value.stringValue
        default:
            return nil
        }
    }

    private func boolValue(_ value: Any?) -> Bool? {
        switch value {
        case let value as Bool:
            return value
        case let value as NSNumber:
            return value.boolValue
        default:
            return nil
        }
    }

    private func variation(from value: Any) -> FlagAssignment.Variation {
        switch value {
        case let boolValue as Bool:
            return .boolean(boolValue)
        case let stringValue as String:
            return .string(stringValue)
        case let intValue as Int:
            return .integer(intValue)
        case let doubleValue as Double:
            return .double(doubleValue)
        case let numberValue as NSNumber:
            if CFGetTypeID(numberValue) == CFBooleanGetTypeID() {
                return .boolean(numberValue.boolValue)
            }
            let doubleValue = numberValue.doubleValue
            if doubleValue.rounded(.towardZero) == doubleValue {
                return .integer(numberValue.intValue)
            }
            return .double(doubleValue)
        case let dictValue as [String: Any]:
            return .object(AnyValue.wrap(dictValue))
        default:
            return .unknown(String(describing: value))
        }
    }

    private enum Constants {
        static let defaultClientName = "default"
    }

    private enum Status {
        static let tracked = "tracked"
        static let skipped = "skipped"
        static let failed = "failed"
    }
}

internal struct NativeFfeEvaluationSideEffectRequest {
    let clientName: String
    let flagKey: String
    let assignment: FlagAssignment
    let context: FlagsEvaluationContext
}

internal protocol NativeFfeEvaluationTracking {
    func track(_ request: NativeFfeEvaluationSideEffectRequest) throws
}

private final class DatadogFlagsEvaluationTracker: NativeFfeEvaluationTracking {
    private let core: DatadogCoreProtocol
    private var clientProviders: [String: () -> FlagsClientProtocol] = [:]

    init(core: DatadogCoreProtocol = CoreRegistry.default) {
        self.core = core
    }

    func track(_ request: NativeFfeEvaluationSideEffectRequest) throws {
        guard let client = getClient(name: request.clientName) as? FlagsClientInternal else {
            throw NativeFfeEvaluationSideEffectsError.clientNotInitialized(request.clientName)
        }

        client.sendFlagEvaluation(
            key: request.flagKey,
            assignment: request.assignment,
            context: request.context
        )
    }

    private func getClient(name: String) -> FlagsClientProtocol {
        if let provider = clientProviders[name] {
            return provider()
        }

        let client = FlagsClient.create(name: name, in: core)
        clientProviders[name] = { FlagsClient.shared(named: name, in: self.core) }
        return client
    }
}

private enum NativeFfeEvaluationSideEffectsError: LocalizedError {
    case clientNotInitialized(String)

    var errorDescription: String? {
        switch self {
        case .clientNotInitialized(let clientName):
            return "Flags client '\(clientName)' is not properly initialized"
        }
    }
}
