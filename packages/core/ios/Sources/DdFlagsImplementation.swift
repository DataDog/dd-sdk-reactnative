/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import DatadogFlags

@objc
public class DdFlagsImplementation: NSObject {
    // Store a registry of client providers by name
    // Use providers instead of direct clients to ensure lazy initialization
    private var clientProviders: [String: () -> FlagsClientProtocol] = [:]

    private func getClient(name: String) -> FlagsClientProtocol {
        if let provider = clientProviders[name] {
            return provider()
        }

        let client = FlagsClient.create(name: name)

        clientProviders[name] = { FlagsClient.shared(named: name) }

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
                resolve(nil)
            case .failure(let error):
                reject(error.localizedDescription, "", error)
            }
        }
    }

    @objc
    public func getBooleanValue(
        _ clientName: String,
        key: String,
        defaultValue: Bool,
        resolve: RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) {
        let client = getClient(name: clientName)
        let value = client.getBooleanValue(key: key, defaultValue: defaultValue)
        resolve(value)
    }

    @objc
    public func getBooleanDetails(
        _ clientName: String,
        key: String,
        defaultValue: Bool,
        resolve: RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) {
        let client = getClient(name: clientName)
        let details = client.getBooleanDetails(key: key, defaultValue: defaultValue)
        let serializedDetails = details.toSerializedDictionary()
        resolve(serializedDetails)
    }

    @objc
    public func getStringValue(
        _ clientName: String,
        key: String,
        defaultValue: String,
        resolve: RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) {
        let client = getClient(name: clientName)
        let value = client.getStringValue(key: key, defaultValue: defaultValue)
        resolve(value)
    }

    @objc
    public func getNumberValue(
        _ clientName: String,
        key: String,
        defaultValue: Double,
        resolve: RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) {
        let client = getClient(name: clientName)
        // TODO: Handle Integer flag values...
        let value = client.getDoubleValue(key: key, defaultValue: defaultValue)
        resolve(value)
    }

    @objc
    public func getObjectValue(
        _ clientName: String,
        key: String,
        defaultValue: NSDictionary,
        resolve: RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) {
        let client = getClient(name: clientName)
        let value = client.getObjectValue(key: key, defaultValue: AnyValue.wrap(defaultValue))
        resolve(value)
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
