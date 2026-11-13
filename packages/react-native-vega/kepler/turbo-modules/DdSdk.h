// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#pragma once

#include "generated/DdSdkSpec.h"

namespace DdSdkTurboModule {

class DdSdk : public DdSdkSpec {
  public:
    DdSdk();
    ~DdSdk() noexcept override;

    com::amazon::kepler::turbomodule::Promise startHttpProxy() override;
    com::amazon::kepler::turbomodule::Promise
    httpResponse(std::string requestId, double statusCode) override;
};

} // namespace DdSdkTurboModule
