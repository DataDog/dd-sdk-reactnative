/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-Present Datadog, Inc.
 */

import Foundation

internal struct GlobalState {
    /// Holds global attributes to be used with Logs and Traces, because they don't expose Global instances, unlike RUM
    internal static var globalAttributes: [String: Encodable] = [:]

    internal static func addAttribute(forKey: String, value: Encodable?) {
        GlobalState.globalAttributes[forKey] = value
    }

    internal static func removeAttribute(key: String) {
        GlobalState.globalAttributes.removeValue(forKey: key)
    }
}

internal extension Dictionary where Key == String, Value == Encodable {
    func mergeWithGlobalAttributes() -> [String: Encodable] {
        // values of current attributes are more important than values of global attributes,
        // because they are coming with a current call
        return merging(GlobalState.globalAttributes) { current, _ in current }
    }
}
