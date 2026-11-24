// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#pragma once

#include "datadog/core.hpp"
#include <Kepler/turbomodule/JSValue.h>

namespace datadog_rn_vega {

// Call before Core::Start, and only when a logs configuration is present.
void configureLogging(
    const std::shared_ptr<datadog::Core> &core,
    const com::amazon::kepler::turbomodule::JSObject &configuration);

} // namespace datadog_rn_vega
