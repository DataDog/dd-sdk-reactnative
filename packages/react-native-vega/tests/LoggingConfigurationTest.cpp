// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>

#include "FeatureAttributes.h"
#include "LoggingConfiguration.h"

using namespace datadog_rn_vega;

void check(bool condition, const char *message) {
    if (!condition) {
        std::cerr << message << std::endl;
        std::exit(1);
    }
}

bool addAttribute() {
    return applyToFeatures([](auto &feature) {
        feature.AddAttribute("enabled", datadog::Attribute::Bool(true));
    });
}

int main(int argc, char **argv) {
    check(argc == 2, "test data directory is required");
    const std::filesystem::path directory(argv[1]);
    std::filesystem::create_directories(directory);
    auto &state = DatadogGlobalState::getInstance();
    auto createCore = [&](const std::string &name) {
        std::filesystem::create_directories(directory / name);
        datadog::CoreConfig config("test-token", "test-service", "test");
        config.SetApplicationStoragePath((directory / name).string());
        return datadog::Core::Create(config, datadog::TrackingConsent::Pending);
    };
    auto expectDisabled = [&] {
        check(!state.getLogging(),
              "failed registration stored a logging feature");
        check(!state.getLogger(), "failed registration stored a logger");
        check(!addAttribute(),
              "failed registration accepted logging-only attributes");
    };

    configureLogging(nullptr, {});
    expectDisabled();

    datadog::CoreConfig invalid("", "test-service", "test");
    configureLogging(
        datadog::Core::Create(invalid, datadog::TrackingConsent::Pending), {});
    expectDisabled();

    const auto blocked = directory / "storage-file";
    std::ofstream(blocked) << "not a directory";
    datadog::CoreConfig storageFailure("test-token", "test-service", "test");
    storageFailure.SetApplicationStoragePath(blocked.string());
    configureLogging(datadog::Core::Create(storageFailure,
                                           datadog::TrackingConsent::Pending),
                     {});
    expectDisabled();

    auto registered = createCore("already-registered");
    auto externalLogging = datadog::Logging::Register(registered);
    check(bool(externalLogging), "test setup could not register logging");
    configureLogging(registered, {});
    expectDisabled();

    check(registered->Start(), "test setup could not start core");
    configureLogging(registered, {});
    expectDisabled();
    registered->Stop();

    auto core = createCore("working");
    configureLogging(core, {});
    auto logging = state.getLogging();
    auto logger = state.getLogger();
    check(bool(logging) && bool(logger),
          "valid logging registration was not published");
    check(addAttribute(), "logging-only attributes were not accepted");
    configureLogging(core, {{"bundleLogsWithRum", false}});
    check(state.getLogging() == logging,
          "repeat configuration replaced working logging");
    check(state.getLogger() == logger,
          "repeat configuration replaced working logger");
    check(core->Start(), "configured logging could not start");
    configureLogging(core, {});
    check(state.getLogger() == logger,
          "configuration after start replaced working logger");
    core->Stop();
    state.reset();
    expectDisabled();
    std::cout << "Logging configuration tests passed" << std::endl;
}
