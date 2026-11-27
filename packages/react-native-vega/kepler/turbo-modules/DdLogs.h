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
    com::amazon::kepler::turbomodule::Promise
    log(std::string level, std::string message, std::string errorKind,
        std::string errorMessage, std::string stacktrace,
        com::amazon::kepler::turbomodule::JSObject context) override;
};

} // namespace DdLogsTurboModule
