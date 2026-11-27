// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#pragma once

#include "DatadogGlobalState.h"
#include <Kepler/turbomodule/Promise.h>
#include <utility>

namespace datadog_rn_vega {

// Rum enqueues events itself. Calling it in bridge order avoids a detached
// thread per event reordering start/stop calls and attribute changes.
template <typename Operation>
com::amazon::kepler::turbomodule::Promise withRum(Operation operation) {
    using com::amazon::kepler::turbomodule::Promise;
    return Promise([operation = std::move(operation)](
                       const std::shared_ptr<Promise> &promise) {
        bool accepted = false;
        try {
            auto rum = DatadogGlobalState::getInstance().getRum();
            if (rum) {
                operation(*rum);
                accepted = true;
            }
        } catch (...) {
            // An SDK failure must not escape into the host app.
        }
        promise->resolve(accepted);
    });
}

} // namespace datadog_rn_vega
