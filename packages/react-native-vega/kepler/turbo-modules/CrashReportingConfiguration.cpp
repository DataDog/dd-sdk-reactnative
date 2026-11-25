// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#include "CrashReportingConfiguration.h"
#include "DatadogGlobalState.h"
#include "datadog/crash_reporting.hpp"
#include "datadog/uuid.hpp"

using namespace com::amazon::kepler::turbomodule;

namespace datadog_rn_vega {
namespace {
std::string stringField(const JSObject &object, const std::string &key) {
    const auto it = object.find(key);
    if (it == object.end())
        return {};
    const auto value = std::get_if<std::string>(&it->second);
    return value ? *value : std::string();
}
} // namespace

void configureApplicationMetadata(datadog::CoreConfig &configuration,
                                  const JSObject &additionalConfiguration) {
    configuration.Internal_SetSource("react-native");
    const auto sdkVersion =
        stringField(additionalConfiguration, "_dd.sdk_version");
    const auto version = stringField(additionalConfiguration, "_dd.version");
    if (!sdkVersion.empty())
        configuration.Internal_SetSdkVersion(sdkVersion);
    if (!version.empty())
        configuration.SetVersion(version);
}

void configureCrashReporting(const std::shared_ptr<datadog::Core> &core,
                             const JSObject &rumConfiguration) {
    const auto entry = rumConfiguration.find("nativeCrashReportEnabled");
    const auto enabled = entry == rumConfiguration.end()
                             ? nullptr
                             : std::get_if<bool>(&entry->second);
    const auto applicationId =
        datadog::UUID::Parse(stringField(rumConfiguration, "applicationId"));
    auto &state = DatadogGlobalState::getInstance();
    if (!core || !enabled || !*enabled || !state.getRum() || !applicationId ||
        *applicationId == datadog::UUID::Zero || state.getCrashReporting())
        return;
    state.setCrashReporting(datadog::CrashReporting::Register(core));
}

} // namespace datadog_rn_vega
