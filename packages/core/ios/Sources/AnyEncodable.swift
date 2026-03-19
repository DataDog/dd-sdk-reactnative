/*
* Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
* This product includes software developed at Datadog (https://www.datadoghq.com/).
* Copyright 2019-2020 Datadog, Inc.
*/

import DatadogInternal
import Foundation

internal func castAttributesToSwift(_ attributes: NSDictionary) -> [String: Encodable] {
    return castAttributesToSwift(attributes as? [String: Any] ?? [:])
}

internal func castAttributesToSwift(_ attributes: [String: Any]) -> [String: Encodable] {
    var casted: [String: Encodable] = [:]

    attributes.forEach { key, value in
        casted[key] = castValueToSwift(value)
    }

    return casted
}

internal func castValueToSwift(_ value: Any) -> Encodable {
    var casted: Encodable
    if let castedValue = castByPreservingTypeInformation(attributeValue: value) {
        // If possible, cast attribute by preserving its type information
        casted = castedValue
    } else {
        // Otherwise, cast by preserving its encoded value (and loosing type information)
        casted = castByPreservingEncodedValue(attributeValue: value)
    }

    return casted
}

/// Casts `Any` value to `Encodable` by preserving its type information.
private func castByPreservingTypeInformation(attributeValue: Any) -> Encodable? {
    switch attributeValue {
    case let string as String:  // unpacking `NSTaggedPointerString`
        return string  // cast to String
    case let number as NSNumber:  // unpacking `__NSCFNumber`
        switch CFNumberGetType(number) {
        case .charType:
            return number.boolValue  // cast to Bool
        case .sInt8Type:
            return number.int8Value  // cast to Int8
        case .sInt16Type:
            return number.int16Value  // cast to Int16
        case .sInt32Type:
            return number.int32Value  // cast to Int32
        case .sInt64Type:
            return number.int64Value  // cast to Int64
        case .shortType:
            return number.uint16Value  // cast to UInt 16
        case .longType:
            return number.uint32Value  // cast to UInt32
        case .longLongType:
            return number.uint64Value  // cast to UInt64
        case .intType, .nsIntegerType, .cfIndexType:
            return number.intValue  // cast to Int
        case .floatType, .float32Type:
            return number.floatValue  // cast to Float
        case .doubleType, .float64Type, .cgFloatType:
            return number.doubleValue  // cast to Double
        @unknown default:
            return nil
        }
    default:
        return nil
    }
}

/// Casts `Any` value to `Encodable` ereasing its type information, but preserving data representation
/// when value gets encoded.
private func castByPreservingEncodedValue(attributeValue: Any) -> Encodable {
    return AnyEncodable(attributeValue)
}
