// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#include "SdkInitialization.h"
#include "DatadogGlobalState.h"
#include "datadog/uuid.hpp"
#include <cstdlib>
#include <filesystem>
#include <iostream>

using namespace datadog_rn_vega;
using namespace com::amazon::kepler::turbomodule;
void check(bool value, const char *message) {
    if (!value) { std::cerr << message << std::endl; std::exit(1); }
}
int main(int argc, char **argv) {
    check(argc == 2, "storage path is required");
    std::filesystem::create_directories(argv[1]);
    check(!initializeSdk({}), "empty settings initialized the SDK");
    check(!setSdkConsent("pending"), "consent succeeded without a core");
    JSObject config{{"clientToken", std::string("test-token")}, {"env", std::string("test")},
        {"service", std::string("test-service")}, {"trackingConsent", std::string("pending")},
        {"batchSize", std::string("SMALL")}, {"uploadFrequency", std::string("FREQUENT")},
        {"batchProcessingLevel", std::string("LOW")}, {"verbosity", std::string("error")},
        {"additionalConfiguration", JSObject{{"_dd.storage_path", std::string(argv[1])},
            {"_dd.version", std::string("2.1-beta")}, {"_dd.sdk_version", std::string("3.13.0")}}},
        {"rumConfiguration", JSObject{{"applicationId", std::string("invalid")}}}};
    check(!initializeSdk(config), "invalid RUM identifier initialized the SDK");
    config["rumConfiguration"] = JSObject{{"applicationId", datadog::UUID::Random().ToString()}, {"sessionSampleRate", 0.0}};
    check(initializeSdk(config), "valid settings did not initialize the SDK");
    auto &state = DatadogGlobalState::getInstance();
    const auto core = state.getCore();
    check(bool(core) && bool(state.getRum()), "initialized feature handles are missing");
    check(initializeSdk(config) && state.getCore() == core, "repeated setup replaced the core");
    check(setSdkConsent("not_granted") && setSdkConsent("pending"), "consent changes failed");
    check(clearSdkData() && state.getCore() == core, "clearing data replaced or stopped the core");
    core->Stop();
    state.reset();
    std::cout << "Native SDK initialization tests passed" << std::endl;
}
