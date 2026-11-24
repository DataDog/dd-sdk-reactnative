// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#include "LoggingConfiguration.h"
#include "DatadogGlobalState.h"
#include "datadog/logging.hpp"

namespace datadog_rn_vega {

void configureLogging(
    const std::shared_ptr<datadog::Core> &core,
    const com::amazon::kepler::turbomodule::JSObject &configuration) {
    if (!core)
        return;
    auto logging = datadog::Logging::Register(core);
    if (!logging)
        return;
    datadog::LoggerConfig config;
    config.SetName("react-native");
    const auto entry = configuration.find("bundleLogsWithRum");
    const auto enrich = entry == configuration.end()
                            ? nullptr
                            : std::get_if<bool>(&entry->second);
    config.SetEnrichWithRumContext(enrich ? *enrich : true);
    auto logger = logging->CreateLogger(config);
    auto &state = DatadogGlobalState::getInstance();
    state.setLogging(logging);
    state.setLogger(logger);
}

} // namespace datadog_rn_vega
