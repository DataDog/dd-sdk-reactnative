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

    private func asAnyValue(_ value: Any) -> AnyValue {
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
        } else if let value = value as? NSDictionary {
            return .dictionary(parseAttributes(attributes: value))
        } else if let value = value as? NSArray {
            return .array(value.compactMap(asAnyValue))
        } else {
            return .null
        }
    }

    private func parseAttributes(attributes: NSDictionary) -> [String: AnyValue] {
        var result: [String: AnyValue] = [:]
        for (key, value) in attributes {
            guard let stringKey = key as? String else {
                continue
            }
            result[stringKey] = asAnyValue(value)
        }
        return result
    }

    @objc
    public func setEvaluationContext(_ clientName: String, targetingKey: String, attributes: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        let client = getClient(name: clientName)

        let evaluationContext = FlagsEvaluationContext(targetingKey: targetingKey, attributes: parseAttributes(attributes: attributes))

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

        let val = asAnyValue(defaultValue)
        let value = client.getObjectValue(key: key, defaultValue: val)
        // TODO: Convert to Dictionary.
        resolve(value)
    }
}
