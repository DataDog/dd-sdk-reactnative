/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import DatadogInternal
@_spi(Internal)
import DatadogFlags

@objc
public class DdFlagsImplementation: NSObject {
    private let core: DatadogCoreProtocol

    internal var clientProviders: [String: () -> FlagsClientProtocol] = [:]

    /// Exposing this initializer for testing purposes. React Native will always use the default initializer.
    internal init(core: DatadogCoreProtocol) {
        self.core = core
    }

    @objc
    public override convenience init() {
        self.init(core: CoreRegistry.default)
    }

    @objc
    public func enable(_ configuration: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        // Client providers become stale upon subsequent enable calls (which can happen e.g. in case of a React Native hot reload).
        clientProviders.removeAll()

        if let config = configuration.asFlagsConfiguration() {
            Flags.enable(with: config)
        } else {
            consolePrint("Invalid configuration provided for Flags. Feature initialization skipped.", .error)
        }

        resolve(nil)
    }

    /// Retrieve a `FlagsClient` instance in a non-interruptive way for usage in methods bridged to React Native.
    ///
    /// We create a simple registry of client providers by client name holding closures for retrieving a client since client references are kept internally in the flagging SDK.
    /// This is motivated by the fact that it is impossible to create a bridged synchronous `FlagsClient` creation; thus, we create a client instance dynamically on-demand.
    private func getClient(name: String) -> FlagsClientProtocol {
        if let provider = clientProviders[name] {
            return provider()
        }

        let client = FlagsClient.create(name: name, in: self.core)
        clientProviders[name] = { FlagsClient.shared(named: name, in: self.core) }
        return client
    }

    // Using @escaping RCTPromiseResolveBlock type will result in an issue when compiling the Swift header file.
    @objc
    public func setEvaluationContext(_ clientName: String, targetingKey: String, attributes: NSDictionary, resolve: @escaping ((Any?) -> Void), reject: @escaping ((String?, String?, NSError?) -> Void)) {
        let client = getClient(name: clientName)
        guard let clientInternal = client as? FlagsClientInternal else {
            reject("CLIENT_NOT_INITIALIZED", "Flags client '\(clientName)' is not properly initialized. Make sure the Datadog SDK has been initialized and Flags.enable() has been called.", nil)
            return
        }

        let evaluationContext = buildEvaluationContext(targetingKey: targetingKey, attributes: attributes)

        client.setEvaluationContext(evaluationContext) { result in
            switch result {
            case .success:
                guard let flagsSnapshot = clientInternal.getFlagAssignments() else {
                    reject("CLIENT_NOT_INITIALIZED", "Failed to retrieve feature flags for client '\(clientName)'. Make sure the client has been properly initialized.", nil)
                    return
                }

                let serializedFlagsSnapshot = Dictionary(
                    uniqueKeysWithValues: flagsSnapshot.map { key, flagAssignment in
                        (key, flagAssignment.asDictionary(flagKey: key))
                    }
                )

                resolve(serializedFlagsSnapshot)
            case .failure(let error):
                var errorCode: String
                var errorMessage: String
                switch (error) {
                case .clientNotInitialized:
                    errorCode = "CLIENT_NOT_INITIALIZED"
                    errorMessage = "Failed to retrieve feature flags for client '\(clientName)'. Make sure the client has been properly initialized."
                case .invalidConfiguration:
                    errorCode = "INVALID_CONFIGURATION"
                    errorMessage = "The flags configuration for client '\(clientName)' is invalid. Check that all required parameters are provided."
                case .invalidResponse:
                    errorCode = "INVALID_RESPONSE"
                    errorMessage = "The flags service returned an invalid response for client '\(clientName)'."
                case .networkError:
                    errorCode = "NETWORK_ERROR"
                    errorMessage = "A network error occurred while fetching feature flags for client '\(clientName)'."
                }
                reject(errorCode, errorMessage, error as NSError)
            }
        }
    }

    @objc
    public func trackEvaluation(_ clientName: String, key: String, rawFlag: NSDictionary, targetingKey: String, attributes: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        guard let client = getClient(name: clientName) as? FlagsClientInternal else {
            reject("CLIENT_NOT_INITIALIZED", "Flags client '\(clientName)' is not properly initialized. Make sure the Datadog SDK has been initialized and Flags.enable() has been called.", nil)
            return
        }
        guard let flagAssignment = rawFlag.asFlagAssignment() else {
            reject("INVALID_FLAG_ASSIGNMENT", "Failed to parse correct flag assignment from the provided raw flag data.", nil)
            return
        }

        let evaluationContext = buildEvaluationContext(targetingKey: targetingKey, attributes: attributes)

        client.sendFlagEvaluation(key: key, assignment: flagAssignment, context: evaluationContext)

        resolve(nil)
    }

    /// Construct an `FlagsEvaluationContext` from a targeting key and a dictionary of attributes.
    private func buildEvaluationContext(targetingKey: String, attributes: NSDictionary) -> FlagsEvaluationContext {
        let dict = attributes as? [String: Any] ?? [:]

        let parsedAttributes = dict.compactMapValues { value in AnyValue.wrap(value) }

        return FlagsEvaluationContext(targetingKey: targetingKey, attributes: parsedAttributes)
    }
}

extension NSDictionary {
    func asFlagsConfiguration() -> Flags.Configuration? {
        let enabled = object(forKey: "enabled") as? Bool ?? false

        if !enabled {
            return nil
        }

        // Hard set `gracefulModeEnabled` to `true` because this misconfiguration is handled on JS side.
        let gracefulModeEnabled = true

        let trackExposures = object(forKey: "trackExposures") as? Bool
        let rumIntegrationEnabled = object(forKey: "rumIntegrationEnabled") as? Bool

        var customFlagsEndpointURL: URL? = nil
        if let customFlagsEndpoint = object(forKey: "customFlagsEndpoint") as? String {
            customFlagsEndpointURL = URL(string: "\(customFlagsEndpoint)/precompute-assignments" as String)
        }
        var customExposureEndpointURL: URL? = nil
        if let customExposureEndpoint = object(forKey: "customExposureEndpoint") as? String {
            customExposureEndpointURL = URL(string: "\(customExposureEndpoint)/api/v2/exposures" as String)
        }

        var configuration = Flags.Configuration(
            gracefulModeEnabled: gracefulModeEnabled,
            customFlagsEndpoint: customFlagsEndpointURL,
            customExposureEndpoint: customExposureEndpointURL,
            trackExposures: trackExposures ?? true,
            rumIntegrationEnabled: rumIntegrationEnabled ?? true
        )

        if let assignmentRequestTimeoutMs = object(forKey: "assignmentRequestTimeoutMs") as? NSNumber {
            configuration.assignmentRequestTimeout = assignmentRequestTimeoutMs.doubleValue / 1_000
        }
        if let assignmentRequestRetryCount = object(forKey: "assignmentRequestRetryCount") as? NSNumber {
            configuration.assignmentRequestRetryCount = assignmentRequestRetryCount.intValue
        }

        return configuration
    }
}

extension FlagAssignment {
    public func asDictionary(flagKey: String) -> [String: Any] {
        let value = switch self.variation {
        case .boolean(let v): v
        case .string(let v): v
        case .integer(let v): v
        case .double(let v): v
        case .object(let v): v.unwrap()
        case .unknown: NSNull()
        }

        return [
            "key": flagKey,
            "value": value,
            "allocationKey": allocationKey,
            "variationKey": variationKey,
            "reason": reason,
            "doLog": doLog,
            // Parity with Android. We don't use the following properties in iOS SDK.
            "variationType": "",
            "variationValue": "",
            "extraLogging": [:],
        ]
    }
}

extension NSDictionary {
    func asFlagAssignment() -> FlagAssignment? {
        guard
            let allocationKey = object(forKey: "allocationKey") as? String,
            let variationKey = object(forKey: "variationKey") as? String,
            let reason = object(forKey: "reason") as? String,
            let doLog = object(forKey: "doLog") as? Bool,
            let value = object(forKey: "value")
        else {
            return nil
        }

        let variation: FlagAssignment.Variation = switch value {
        case let boolValue as Bool: .boolean(boolValue)
        case let stringValue as String: .string(stringValue)
        case let intValue as Int: .integer(intValue)
        case let doubleValue as Double: .double(doubleValue)
        case let dictValue as [String: Any]: .object(AnyValue.wrap(dictValue))
        default: .unknown(String(describing: value))
        }

        return FlagAssignment(
            allocationKey: allocationKey,
            variationKey: variationKey,
            variation: variation,
            reason: reason,
            doLog: doLog
        )
    }
}

extension AnyValue {
    static func wrap(_ value: Any) -> AnyValue {
        if value is NSNull {
            return .null
        }

        if let value = value as? String {
            return .string(value)
        } else if let value = value as? Bool {
            return .bool(value)
        } else if let value = value as? Int {
            return .int(value)
        } else if let value = value as? Double {
            return .double(value)
        } else if let value = value as? [String: Any] {
            return .dictionary(value.mapValues(AnyValue.wrap))
        } else if let value = value as? [Any] {
            return .array(value.map(AnyValue.wrap))
        } else {
            return .null
        }
    }

    func unwrap() -> Any {
        switch self {
        case .string(let value):
            return value
        case .bool(let value):
            return value
        case .int(let value):
            return value
        case .double(let value):
            return value
        case .dictionary(let dict):
            return dict.mapValues { $0.unwrap() }
        case .array(let array):
            return array.map { $0.unwrap() }
        case .null:
            return NSNull()
        }
    }
}
