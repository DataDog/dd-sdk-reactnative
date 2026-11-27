// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#include "AttributeConverter.h"
#include "EnumParsers.h"
#include <algorithm>
#include <cctype>
#include <initializer_list>
#include <stdexcept>
#include <utility>

using namespace com::amazon::kepler::turbomodule;
using namespace datadog_rn_vega;
using datadog::ValueType;

void check(bool condition) {
    if (!condition) throw std::runtime_error("Attribute conversion mismatch");
}

template <typename Enum, typename Parser>
void checkCasings(Parser parse,
                  std::initializer_list<std::pair<std::string, Enum>> cases) {
    for (const auto& [token, expected] : cases) {
        std::string lowercase = token;
        std::transform(lowercase.begin(), lowercase.end(), lowercase.begin(),
                       [](unsigned char c) { return std::tolower(c); });
        std::string mixed = lowercase;
        mixed.front() = token.front();
        for (const auto& spelling : {token, lowercase, mixed}) {
            if (parse(spelling) != expected) {
                throw std::runtime_error(
                    "Unexpected enum mapping for: " + spelling);
            }
        }
    }
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

    using Action = datadog::RumActionType;
    checkCasings<Action>(parseActionType, {
        {"TAP", Action::Tap}, {"SCROLL", Action::Scroll},
        {"SWIPE", Action::Swipe}, {"BACK", Action::Custom},
        {"CUSTOM", Action::Custom}, {"CLICK", Action::Click}
    });
    using Method = datadog::RumResourceMethod;
    checkCasings<Method>(parseResourceMethod, {
        {"GET", Method::Get}, {"POST", Method::Post}, {"PUT", Method::Put},
        {"DELETE", Method::Delete}, {"HEAD", Method::Head},
        {"PATCH", Method::Patch}, {"OPTIONS", Method::Options},
        {"CONNECT", Method::Connect}, {"TRACE", Method::Trace}
    });
    using Source = datadog::RumErrorSource;
    checkCasings<Source>(parseErrorSource, {
        {"NETWORK", Source::Network}, {"SOURCE", Source::Source},
        {"CONSOLE", Source::Console}, {"WEBVIEW", Source::Webview},
        {"CUSTOM", Source::Custom}, {"LOGGER", Source::Logger},
        {"AGENT", Source::Agent}, {"REPORT", Source::Report}
    });
    for (const auto& unknown : {"", "unknown", "PoSt-invalid", "\xC3\xA9"}) {
        check(parseActionType(unknown) == Action::Custom);
        check(parseResourceMethod(unknown) == Method::Get);
        check(parseErrorSource(unknown) == Source::Custom);
    }
    check(parseResourceType("fetch") == datadog::RumResourceType::Fetch);
    check(parseResourceType("xhr") == datadog::RumResourceType::Xhr);
    check(parseResourceType("invalid") == datadog::RumResourceType::Unknown);
    check(parseOperationFailureReason("ERROR") == datadog::RumOperationFailureReason::Error);
    check(parseOperationFailureReason("ABANDONED") == datadog::RumOperationFailureReason::Abandoned);
    check(parseOperationFailureReason("OTHER") == datadog::RumOperationFailureReason::Other);
}
