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
        func asAnyValue(value: Any) -> AnyValue {
            switch value {
            case let s as String: return .string(s)
            case let b as Bool: return .bool(b)
            case let i as Int: return .int(i)
            case let d as Double: return .double(d)
            // FIXME: Do we even support nested evaluation contexts?
            case let dict as NSDictionary: return .dictionary(parseAttributes(attributes: dict))
            case let arr as NSArray: return .array(arr.compactMap(asAnyValue))
            case is NSNull: return .null
            default: return .null
            }
        }
        
        var result: [String: AnyValue] = [:]
        for (key, value) in attributes {
            guard let stringKey = key as? String else {
                continue
            }
            result[stringKey] = asAnyValue(value: value)
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
}
