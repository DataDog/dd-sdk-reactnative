// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#pragma once

#include "DatadogGlobalState.h"

namespace datadog_rn_vega {

template <typename Operation> bool applyToFeatures(Operation operation) {
    auto &state = DatadogGlobalState::getInstance();
    auto rum = state.getRum();
    auto logging = state.getLogging();
    if (rum)
        operation(*rum);
    if (logging)
        operation(*logging);
    return bool(rum) || bool(logging);
}

} // namespace datadog_rn_vega
