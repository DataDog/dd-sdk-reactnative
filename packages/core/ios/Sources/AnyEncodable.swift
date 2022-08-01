/*
* Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
* This product includes software developed at Datadog (https://www.datadoghq.com/).
* Copyright 2019-2020 Datadog, Inc.
*/

import Foundation

internal func castAttributesToSwift(_ attributes: NSDictionary) -> [String: Encodable] {
    return castAttributesToSwift(attributes as? [String: Any] ?? [:])
}

internal func castAttributesToSwift(_ attributes: [String: Any]) -> [String: Encodable] {
    var casted: [String: Encodable] = [:]

    attributes.forEach { key, value in
        if let castedValue = castByPreservingTypeInformation(attributeValue: value) {
            // If possible, cast attribute by preserving its type information
            casted[key] = castedValue
        } else {
            // Otherwise, cast by preserving its encoded value (and loosing type information)
            casted[key] = castByPreservingEncodedValue(attributeValue: value)
        }
    }

    return casted
}

/// Casts `Any` value to `Encodable` by preserving its type information.
private func castByPreservingTypeInformation(attributeValue: Any) -> Encodable? {
    switch attributeValue {
    case let string as String: // unpacking `NSTaggedPointerString`
        return string // cast to String
    case let number as NSNumber: // unpacking `__NSCFNumber`
        switch CFNumberGetType(number) {
        case .charType:
            return number.boolValue // cast to Bool
        case .sInt8Type:
            return number.int8Value // cast to Int8
        case .sInt16Type:
            return number.int16Value // cast to Int16
        case .sInt32Type:
            return number.int32Value // cast to Int32
        case .sInt64Type:
            return number.int64Value // cast to Int64
        case .shortType:
            return number.uint16Value // cast to UInt 16
        case .longType:
            return number.uint32Value // cast to UInt32
        case .longLongType:
            return number.uint64Value // cast to UInt64
        case .intType, .nsIntegerType, .cfIndexType:
            return number.intValue // cast to Int
        case .floatType, .float32Type:
            return number.floatValue // cast to Float
        case .doubleType, .float64Type, .cgFloatType:
            return number.doubleValue // cast to Double
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

/// Type erasing `Encodable` wrapper to bridge Objective-C's `Any` to Swift `Encodable`.
///
/// Inspired by `AnyCodable` by Flight-School (MIT):
/// https://github.com/Flight-School/AnyCodable/blob/master/Sources/AnyCodable/AnyEncodable.swift
internal class AnyEncodable: Encodable {
    internal let value: Any

    init(_ value: Any) {
        self.value = value
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case let number as NSNumber:
            try encodeNSNumber(number, into: &container)
        case is NSNull, is Void:
            try container.encodeNil()
        case let string as String:
            try container.encode(string)
        case let date as Date:
            try container.encode(date)
        case let url as URL:
            try container.encode(url)
        case let array as [Any]:
            try container.encode(array.map { AnyEncodable($0) })
        case let dictionary as [String: Any]:
            try container.encode(dictionary.mapValues { AnyEncodable($0) })
        default:
            let context = EncodingError.Context(
                codingPath: container.codingPath,
                debugDescription: "Value \(value) cannot be encoded - \(type(of: value)) is not supported by `AnyEncodable`."
            )
            throw EncodingError.invalidValue(value, context)
        }
    }
}

private func encodeNSNumber(_ nsnumber: NSNumber, into container: inout SingleValueEncodingContainer) throws {
    switch CFNumberGetType(nsnumber) {
    case .charType:
        try container.encode(nsnumber.boolValue)
    case .sInt8Type:
        try container.encode(nsnumber.int8Value)
    case .sInt16Type:
        try container.encode(nsnumber.int16Value)
    case .sInt32Type:
        try container.encode(nsnumber.int32Value)
    case .sInt64Type:
        try container.encode(nsnumber.int64Value)
    case .shortType:
        try container.encode(nsnumber.uint16Value)
    case .longType:
        try container.encode(nsnumber.uint32Value)
    case .longLongType:
        try container.encode(nsnumber.uint64Value)
    case .intType, .nsIntegerType, .cfIndexType:
        try container.encode(nsnumber.intValue)
    case .floatType, .float32Type:
        try container.encode(nsnumber.floatValue)
    case .doubleType, .float64Type, .cgFloatType:
        try container.encode(nsnumber.doubleValue)
    @unknown default:
        return
    }
}
