// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#include "AttributeConverter.h"
#include "EnumParsers.h"
#include <stdexcept>

using namespace com::amazon::kepler::turbomodule;
using namespace datadog_rn_vega;
using datadog::ValueType;

void check(bool condition) {
    if (!condition) throw std::runtime_error("Attribute conversion mismatch");
}

int main() {
    check(jsValueToAttribute(nullptr).GetType() == ValueType::Null);
    check(jsValueToAttribute(false).GetType() == ValueType::Bool);
    check(!jsValueToAttribute(false).GetBoolValue());
    check(jsValueToAttribute(true).GetBoolValue());
    for (const JSValue& value : {JSValue(int8_t(-2)), JSValue(int16_t(-2)),
                                JSValue(int32_t(-2)), JSValue(int64_t(-2))}) {
        const auto attribute = jsValueToAttribute(value);
        check(attribute.GetType() == ValueType::Int);
        check(attribute.GetIntValue() == -2);
    }
    for (const JSValue& value : {JSValue(uint8_t(2)), JSValue(uint16_t(2)),
                                JSValue(uint32_t(2))}) {
        check(jsValueToAttribute(value).GetType() == ValueType::UInt);
        check(jsValueToAttribute(value).GetUIntValue() == 2);
    }
    check(jsValueToAttribute(1.25f).GetDoubleValue() == 1.25);
    check(jsValueToAttribute(2.5).GetDoubleValue() == 2.5);
    check(jsValueToAttribute(std::string("text")).GetStringValue() == "text");
    const JSObject nested{{"value", false}};
    const JSArray values{nullptr, 0.0, std::string("text"), nested};
    const auto converted = jsObjectToAttribute({{"array", values}, {"object", nested}});
    const auto array = converted.GetObjectProperty("array");
    check(array.GetType() == ValueType::Array && array.GetArrayLen() == 4);
    check(array.GetArrayItem(0).GetType() == ValueType::Null);
    check(array.GetArrayItem(1).GetDoubleValue() == 0.0);
    check(array.GetArrayItem(2).GetStringValue() == "text");
    check(array.GetArrayItem(3).GetObjectProperty("value").GetType() == ValueType::Bool);
    check(converted.GetObjectProperty("object").GetObjectProperty("value").GetType() == ValueType::Bool);
    check(jsWrappedValueToAttribute({{"value", nested}}).GetObjectProperty("value").GetType() == ValueType::Bool);
    check(jsWrappedValueToAttribute({{"value", nullptr}}).GetType() == ValueType::Null);
    check(jsWrappedValueToAttribute({}).GetType() == ValueType::Object);
    check(jsValueToAttribute(JSArray{}).GetArrayLen() == 0);
    check(jsObjectToAttribute({}).GetObjectPropertyCount() == 0);

    check(parseActionType("TAP") == datadog::RumActionType::Tap);
    check(parseActionType("BACK") == datadog::RumActionType::Custom);
    check(parseResourceMethod("PATCH") == datadog::RumResourceMethod::Patch);
    check(parseResourceType("fetch") == datadog::RumResourceType::Fetch);
    check(parseResourceType("xhr") == datadog::RumResourceType::Xhr);
    check(parseResourceType("invalid") == datadog::RumResourceType::Unknown);
    check(parseErrorSource("NETWORK") == datadog::RumErrorSource::Network);
    check(parseOperationFailureReason("ERROR") == datadog::RumOperationFailureReason::Error);
    check(parseOperationFailureReason("ABANDONED") == datadog::RumOperationFailureReason::Abandoned);
    check(parseOperationFailureReason("OTHER") == datadog::RumOperationFailureReason::Other);
}
