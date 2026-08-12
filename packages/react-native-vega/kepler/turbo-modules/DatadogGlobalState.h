// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#pragma once

#include <memory>
#include <mutex>

#include "datadog/core.hpp"
#include "datadog/logging.hpp"
#include "datadog/rum.hpp"

namespace datadog_rn_vega {

/**
 * Thread-safe singleton that holds the Datadog Core and registered feature
 * instances. They are initially null and must be set during initialization
 * before use.
 */
class DatadogGlobalState {
   public:
    static DatadogGlobalState& getInstance();

    void setCore(std::shared_ptr<datadog::Core> core);
    std::shared_ptr<datadog::Core> getCore();

    void setRum(std::shared_ptr<datadog::Rum> rum);
    std::shared_ptr<datadog::Rum> getRum();

    void setLogging(std::shared_ptr<datadog::Logging> logging);
    std::shared_ptr<datadog::Logging> getLogging();

    void setLogger(std::shared_ptr<datadog::Logger> logger);
    std::shared_ptr<datadog::Logger> getLogger();

    /** Clears the core and all registered feature pointers. */
    void reset();

   private:
    DatadogGlobalState() = default;
    DatadogGlobalState(const DatadogGlobalState&) = delete;
    DatadogGlobalState& operator=(const DatadogGlobalState&) = delete;

    std::mutex mutex_;
    std::shared_ptr<datadog::Core> core_;
    std::shared_ptr<datadog::Rum> rum_;
    std::shared_ptr<datadog::Logging> logging_;
    std::shared_ptr<datadog::Logger> logger_;
};

}  // namespace datadog_rn_vega
