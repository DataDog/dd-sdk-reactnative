// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#include "DdLogs.h"
#include "AttributeConverter.h"
#include "DatadogGlobalState.h"

using namespace com::amazon::kepler::turbomodule;

namespace DdLogsTurboModule {

Promise DdLogs::log(std::string level, std::string message,
                    std::string errorKind, std::string errorMessage,
                    std::string stacktrace, JSObject context) {
    return Promise([=](const std::shared_ptr<Promise> &promise) {
        try {
            auto logger =
                datadog_rn_vega::DatadogGlobalState::getInstance().getLogger();
            if (!logger) {
                promise->resolve(false);
                return;
            }
            const auto attributes =
                datadog_rn_vega::jsObjectToAttribute(context);
            const datadog::LogError error{errorMessage, errorKind, stacktrace};
            if (level == "debug") {
                logger->Debug(message, error, attributes);
            } else if (level == "info") {
                logger->Info(message, error, attributes);
            } else if (level == "warn") {
                logger->Warn(message, error, attributes);
            } else if (level == "error") {
                logger->Error(message, error, attributes);
            } else {
                promise->resolve(false);
                return;
            }
            promise->resolve(true);
        } catch (...) {
            promise->resolve(false);
        }
    });
}

} // namespace DdLogsTurboModule
