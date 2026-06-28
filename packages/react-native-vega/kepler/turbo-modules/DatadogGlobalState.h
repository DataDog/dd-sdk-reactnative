// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#pragma once

#include <memory>
#include <mutex>

#include "datadog/core.hpp"
#include "datadog/rum.hpp"

namespace datadog_rn_vega {

/**
 * Thread-safe singleton that holds shared pointers to the Datadog Core and RUM
 * instances. Both are initially null and must be set via initialize() before
 * use.
 */
class DatadogGlobalState {
   public:
    static DatadogGlobalState& getInstance();

    void setCore(std::shared_ptr<datadog::Core> core);
    std::shared_ptr<datadog::Core> getCore();

    void setRum(std::shared_ptr<datadog::Rum> rum);
    std::shared_ptr<datadog::Rum> getRum();

    /** Clears both core and rum pointers (e.g. for testing or re-initialization). */
    void reset();

   private:
    DatadogGlobalState() = default;
    DatadogGlobalState(const DatadogGlobalState&) = delete;
    DatadogGlobalState& operator=(const DatadogGlobalState&) = delete;

    std::mutex mutex_;
    std::shared_ptr<datadog::Core> core_;
    std::shared_ptr<datadog::Rum> rum_;
};

}  // namespace datadog_rn_vega
