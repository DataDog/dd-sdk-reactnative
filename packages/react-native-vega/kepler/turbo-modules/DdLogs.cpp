// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#include "DdLogs.h"

#include <thread>
#include <utility>

#include "AttributeConverter.h"
#include "DatadogGlobalState.h"
#include "datadog/logging.hpp"

using namespace com::amazon::kepler::turbomodule;

namespace DdLogsTurboModule {
namespace {

enum class Level { Debug, Info, Warn, Error };

Promise emitLog(
    Level level,
    std::string message,
    JSObject context,
    std::string errorKind = "",
    std::string errorMessage = "",
    std::string stacktrace = ""
) {
    return Promise([
        level,
        message = std::move(message),
        context = std::move(context),
        errorKind = std::move(errorKind),
        errorMessage = std::move(errorMessage),
        stacktrace = std::move(stacktrace)
    ](const std::shared_ptr<Promise>& promise) {
        std::thread([
            promise,
            level,
            message,
            context,
            errorKind,
            errorMessage,
            stacktrace
        ]() {
            auto logger =
                datadog_rn_vega::DatadogGlobalState::getInstance().getLogger();
            if (logger) {
                const auto attributes =
                    datadog_rn_vega::jsObjectToAttribute(context);
                const datadog::LogError logError{
                    errorMessage, errorKind, stacktrace};

                switch (level) {
                    case Level::Debug:
                        logger->Debug(message, logError, attributes);
                        break;
                    case Level::Info:
                        logger->Info(message, logError, attributes);
                        break;
                    case Level::Warn:
                        logger->Warn(message, logError, attributes);
                        break;
                    case Level::Error:
                        logger->Error(message, logError, attributes);
                        break;
                }
            }
            promise->resolve(true);
        }).detach();
    });
}

}  // namespace

DdLogs::DdLogs() {}
DdLogs::~DdLogs() noexcept {}

Promise DdLogs::debug(std::string message, JSObject context) {
    return emitLog(Level::Debug, std::move(message), std::move(context));
}

Promise DdLogs::info(std::string message, JSObject context) {
    return emitLog(Level::Info, std::move(message), std::move(context));
}

Promise DdLogs::warn(std::string message, JSObject context) {
    return emitLog(Level::Warn, std::move(message), std::move(context));
}

Promise DdLogs::error(std::string message, JSObject context) {
    return emitLog(Level::Error, std::move(message), std::move(context));
}

Promise DdLogs::debugWithError(
    std::string message,
    std::string errorKind,
    std::string errorMessage,
    std::string stacktrace,
    JSObject context
) {
    return emitLog(
        Level::Debug,
        std::move(message),
        std::move(context),
        std::move(errorKind),
        std::move(errorMessage),
        std::move(stacktrace));
}

Promise DdLogs::infoWithError(
    std::string message,
    std::string errorKind,
    std::string errorMessage,
    std::string stacktrace,
    JSObject context
) {
    return emitLog(
        Level::Info,
        std::move(message),
        std::move(context),
        std::move(errorKind),
        std::move(errorMessage),
        std::move(stacktrace));
}

Promise DdLogs::warnWithError(
    std::string message,
    std::string errorKind,
    std::string errorMessage,
    std::string stacktrace,
    JSObject context
) {
    return emitLog(
        Level::Warn,
        std::move(message),
        std::move(context),
        std::move(errorKind),
        std::move(errorMessage),
        std::move(stacktrace));
}

Promise DdLogs::errorWithError(
    std::string message,
    std::string errorKind,
    std::string errorMessage,
    std::string stacktrace,
    JSObject context
) {
    return emitLog(
        Level::Error,
        std::move(message),
        std::move(context),
        std::move(errorKind),
        std::move(errorMessage),
        std::move(stacktrace));
}

}  // namespace DdLogsTurboModule
