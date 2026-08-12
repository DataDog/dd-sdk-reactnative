// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#pragma once

#include "generated/DdLogsSpec.h"

namespace DdLogsTurboModule {

class DdLogs : public DdLogsSpec {
   public:
    DdLogs();
    ~DdLogs() noexcept;

    com::amazon::kepler::turbomodule::Promise debug(
        std::string message,
        com::amazon::kepler::turbomodule::JSObject context) override;
    com::amazon::kepler::turbomodule::Promise info(
        std::string message,
        com::amazon::kepler::turbomodule::JSObject context) override;
    com::amazon::kepler::turbomodule::Promise warn(
        std::string message,
        com::amazon::kepler::turbomodule::JSObject context) override;
    com::amazon::kepler::turbomodule::Promise error(
        std::string message,
        com::amazon::kepler::turbomodule::JSObject context) override;
    com::amazon::kepler::turbomodule::Promise debugWithError(
        std::string message,
        std::string errorKind,
        std::string errorMessage,
        std::string stacktrace,
        com::amazon::kepler::turbomodule::JSObject context) override;
    com::amazon::kepler::turbomodule::Promise infoWithError(
        std::string message,
        std::string errorKind,
        std::string errorMessage,
        std::string stacktrace,
        com::amazon::kepler::turbomodule::JSObject context) override;
    com::amazon::kepler::turbomodule::Promise warnWithError(
        std::string message,
        std::string errorKind,
        std::string errorMessage,
        std::string stacktrace,
        com::amazon::kepler::turbomodule::JSObject context) override;
    com::amazon::kepler::turbomodule::Promise errorWithError(
        std::string message,
        std::string errorKind,
        std::string errorMessage,
        std::string stacktrace,
        com::amazon::kepler::turbomodule::JSObject context) override;
};

}  // namespace DdLogsTurboModule
