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

    private var clientProviders: [String: () -> FlagsClientProtocol] = [:]

    internal init(
        core: DatadogCoreProtocol
    ) {
        self.core = core
    }

    @objc
    public override convenience init() {
        self.init(core: CoreRegistry.default)
    }

    @objc
    public func enable(_ configuration: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        if let config = configuration.asConfigurationForFlags() {
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
    ///
    /// - Important: Due to specifics of React Native hot reloading, this registry is destroyed upon JS bundle refresh. This leads to`FlagsClient.create` being called several times during development process for the same client.
    ///              This should not be a problem because `gracefulModeEnabled` is hard set to `true` for the RN SDK.
    private func getClient(name: String) -> FlagsClientProtocol {
        if let provider = clientProviders[name] {
            return provider()
        }

        let client = FlagsClient.create(name: name, in: self.core)
        clientProviders[name] = { FlagsClient.shared(named: name, in: self.core) }
        return client
    }

    private func parseAttributes(attributes: NSDictionary) -> [String: AnyValue] {
        var result: [String: AnyValue] = [:]
        for (key, value) in attributes {
            guard let stringKey = key as? String else {
                continue
            }
            result[stringKey] = AnyValue.wrap(value)
        }
        return result
    }

    @objc
    public func setEvaluationContext(_ clientName: String, targetingKey: String, attributes: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        let client = getClient(name: clientName)

        let parsedAttributes = parseAttributes(attributes: attributes)  
        let evaluationContext = FlagsEvaluationContext(targetingKey: targetingKey, attributes: parsedAttributes)

        client.setEvaluationContext(evaluationContext) { result in
            switch result {
            case .success:
                guard let flagsDetails = client.getFlagsDetails() else {
                    reject(nil, "CLIENT_NOT_INITIALIZED", nil)
                    return
                }
                
                let result = flagsDetails.compactMapValues { details in
                    details.toSerializedDictionary()
                }
                
                resolve(result)
            case .failure(let error):
                var errorCode: String
                switch (error) {
                case .clientNotInitialized:
                    errorCode = "CLIENT_NOT_INITIALIZED"
                case .invalidConfiguration:
                    errorCode = "INVALID_CONFIGURATION"
                case .invalidResponse:
                    errorCode = "INVALID_RESPONSE"
                case .networkError:
                    errorCode = "NETWORK_ERROR"
                }
                reject(nil, errorCode, error)
            }
        }
    }

    @objc
    public func trackEvaluation(_ clientName: String, key: String, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        let client = getClient(name: clientName)
        client.trackEvaluation(key: key)
        resolve(nil)
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

extension FlagDetails {
    func toSerializedDictionary() -> [String: Any?] {
        let dict: [String: Any?] = [
            "key": key,
            "value": getSerializedValue(),
            "variant": variant as Any?,
            "reason": reason as Any?,
            "error": getSerializedError()
        ]

        return dict
    }
 
    private func getSerializedValue() -> Any {
        if let boolValue = value as? Bool {
            return boolValue
        } else if let stringValue = value as? String {
            return stringValue
        } else if let intValue = value as? Int {
            return intValue
        } else if let doubleValue = value as? Double {
            return doubleValue
        } else if let anyValue = value as? AnyValue {
            return anyValue.unwrap()
        }

        // Fallback for unexpected types.
        return NSNull()
    }
    
    private func getSerializedError() -> String? {
        guard let error = error else {
            return nil
        }

        switch error {
        case .providerNotReady:
            return "PROVIDER_NOT_READY"
        case .flagNotFound:
            return "FLAG_NOT_FOUND"
        case .typeMismatch:
            return "TYPE_MISMATCH"
        }
    }
}
