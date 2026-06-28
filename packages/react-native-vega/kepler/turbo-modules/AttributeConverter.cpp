// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#include "AttributeConverter.h"

namespace datadog_rn_vega {

using JSValue = com::amazon::kepler::turbomodule::JSValue;
using JSArray = com::amazon::kepler::turbomodule::JSArray;
using JSObject = com::amazon::kepler::turbomodule::JSObject;

datadog::Attribute jsValueToAttribute(const JSValue& value) {
    return std::visit(
        [](const auto& v) -> datadog::Attribute {
            using T = std::decay_t<decltype(v)>;

            if constexpr (std::is_same_v<T, std::nullptr_t>) {
                return datadog::Attribute::Null();
            } else if constexpr (std::is_same_v<T, bool>) {
                return datadog::Attribute::Bool(v);
            } else if constexpr (std::is_same_v<T, int8_t> ||
                                 std::is_same_v<T, int16_t> ||
                                 std::is_same_v<T, int32_t> ||
                                 std::is_same_v<T, int64_t>) {
                return datadog::Attribute::Int(static_cast<int64_t>(v));
            } else if constexpr (std::is_same_v<T, uint8_t> ||
                                 std::is_same_v<T, uint16_t> ||
                                 std::is_same_v<T, uint32_t>) {
                return datadog::Attribute::UInt(static_cast<uint64_t>(v));
            } else if constexpr (std::is_same_v<T, float> ||
                                 std::is_same_v<T, double>) {
                return datadog::Attribute::Double(static_cast<double>(v));
            } else if constexpr (std::is_same_v<T, std::string>) {
                return datadog::Attribute::String(v);
            } else if constexpr (std::is_same_v<T, JSArray>) {
                datadog::Attribute arr = datadog::Attribute::Array(v.size());
                for (const JSValue& item : v) {
                    arr.ArrayPush(jsValueToAttribute(item));
                }
                return arr;
            } else if constexpr (std::is_same_v<T, JSObject>) {
                return jsObjectToAttribute(v);
            } else {
                return datadog::Attribute::Null();
            }
        },
        value);
}

datadog::Attribute jsObjectToAttribute(const JSObject& object) {
    datadog::Attribute attr = datadog::Attribute::Object(object.size());
    for (const auto& [key, val] : object) {
        attr.SetObjectProperty(key, jsValueToAttribute(val));
    }
    return attr;
}

}  // namespace datadog_rn_vega
