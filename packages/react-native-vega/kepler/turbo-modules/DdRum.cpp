// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#include "DdRum.h"
#include "AttributeConverter.h"
#include "EnumParsers.h"
#include "RumBridge.h"

#include <cmath>

using namespace com::amazon::kepler::turbomodule;
using namespace datadog_rn_vega;

namespace DdRumTurboModule {

namespace {
Promise unsupportedRumCall() {
    return Promise([](const std::shared_ptr<Promise> &promise) {
        promise->resolve(true);
    });
}
}

Promise DdRum::addTiming(std::string) { return unsupportedRumCall(); }
Promise DdRum::addViewLoadingTime(bool) { return unsupportedRumCall(); }
Promise DdRum::addFeatureFlagEvaluation(std::string, JSObject) {
    return unsupportedRumCall();
}
Promise DdRum::getCurrentSessionId() {
    return Promise([](const std::shared_ptr<Promise> &promise) {
        promise->resolve(std::string());
    });
}

Promise DdRum::startView(std::string key, std::string name, JSObject context,
                         double /*timestampMs*/) {
    return withRum([=](datadog::Rum &rum) {
        rum.StartView(key, name, jsObjectToAttribute(context));
    });
}

Promise DdRum::stopView(std::string key, JSObject context,
                        double /*timestampMs*/) {
    return withRum([=](datadog::Rum &rum) {
        rum.StopView(key, jsObjectToAttribute(context));
    });
}

Promise DdRum::startAction(std::string type, std::string name, JSObject context,
                           double /*timestampMs*/) {
    return withRum([=](datadog::Rum &rum) {
        rum.StartAction(parseActionType(type), name,
                        jsObjectToAttribute(context));
    });
}

Promise DdRum::stopAction(std::string type, std::string name, JSObject context,
                          double /*timestampMs*/) {
    return withRum([=](datadog::Rum &rum) {
        rum.StopAction(parseActionType(type), name,
                       jsObjectToAttribute(context));
    });
}

Promise DdRum::addAction(std::string type, std::string name, JSObject context,
                         double /*timestampMs*/) {
    return withRum([=](datadog::Rum &rum) {
        rum.AddAction(parseActionType(type), name,
                      jsObjectToAttribute(context));
    });
}

Promise DdRum::startResource(std::string key, std::string method,
                             std::string url, JSObject context,
                             double /*timestampMs*/) {
    return withRum([=](datadog::Rum &rum) {
        rum.StartResource(key, parseResourceMethod(method), url,
                          jsObjectToAttribute(context));
    });
}

Promise DdRum::stopResource(std::string key, double statusCode,
                            std::string kind, double size, JSObject context,
                            double /*timestampMs*/) {
    return withRum([=](datadog::Rum &rum) {
        const auto status =
            std::isfinite(statusCode) && statusCode >= 0 && statusCode <= 599
                ? static_cast<int32_t>(statusCode)
                : 0;
        const auto bytes =
            std::isfinite(size) && size >= 0 && size < 9223372036854775808.0
                ? static_cast<int64_t>(size)
                : -1;
        rum.StopResource(key, status, bytes, parseResourceType(kind),
                         jsObjectToAttribute(context));
    });
}

Promise DdRum::addError(std::string message, std::string source,
                        std::string stacktrace, JSObject context,
                        double /*timestampMs*/, std::string /*fingerprint*/) {
    return withRum([=](datadog::Rum &rum) {
        rum.AddError(parseErrorSource(source), message, "", stacktrace,
                     jsObjectToAttribute(context));
    });
}

Promise DdRum::addViewAttribute(std::string key, JSObject value) {
    return withRum([=](datadog::Rum &rum) {
        rum.AddViewAttribute(key, jsWrappedValueToAttribute(value));
    });
}

Promise DdRum::removeViewAttribute(std::string key) {
    return withRum([=](datadog::Rum &rum) { rum.RemoveViewAttribute(key); });
}

Promise DdRum::addViewAttributes(JSObject attributes) {
    return withRum([=](datadog::Rum &rum) {
        for (const auto &[key, value] : attributes) {
            rum.AddViewAttribute(key, jsValueToAttribute(value));
        }
    });
}

Promise DdRum::removeViewAttributes(std::vector<std::string> keys) {
    return withRum([=](datadog::Rum &rum) {
        for (const auto &key : keys) {
            rum.RemoveViewAttribute(key);
        }
    });
}

Promise DdRum::reportAppFullyDisplayed() {
    return withRum([=](datadog::Rum &rum) { rum.ReportAppFullyDisplayed(); });
}

Promise DdRum::stopSession() {
    return withRum([=](datadog::Rum &rum) { rum.StopSession(); });
}

Promise DdRum::startFeatureOperation(std::string name, std::string operationKey,
                                     JSObject attributes) {
    return withRum([=](datadog::Rum &rum) {
        rum.StartOperation(name, operationKey, jsObjectToAttribute(attributes));
    });
}

Promise DdRum::succeedFeatureOperation(std::string name,
                                       std::string operationKey,
                                       JSObject attributes) {
    return withRum([=](datadog::Rum &rum) {
        rum.SucceedOperation(name, operationKey,
                             jsObjectToAttribute(attributes));
    });
}

Promise DdRum::failFeatureOperation(std::string name, std::string operationKey,
                                    std::string reason, JSObject attributes) {
    return withRum([=](datadog::Rum &rum) {
        rum.FailOperation(name, parseOperationFailureReason(reason),
                          operationKey, jsObjectToAttribute(attributes));
    });
}

} // namespace DdRumTurboModule
