// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#include "CrashReportingConfiguration.h"
#include "DatadogGlobalState.h"
#include "datadog/uuid.hpp"

#include <csignal>
#include <cstdlib>
#include <filesystem>
#include <iostream>

using namespace datadog_rn_vega;
using namespace com::amazon::kepler::turbomodule;

void check(bool condition, const char *message) {
    if (!condition) {
        std::cerr << message << std::endl;
        std::exit(1);
    }
}

int main(int argc, char **argv) {
    check(argc == 2, "test storage directory required");
    std::filesystem::create_directories(argv[1]);
    datadog::CoreConfig config("test-token", "example.app", "test");
    config.SetApplicationStoragePath(argv[1]);
    configureApplicationMetadata(config,
                                 {{"_dd.version", std::string("2.1-beta")},
                                  {"_dd.sdk_version", std::string("3.13.0")}});
    auto core =
        datadog::Core::Create(config, datadog::TrackingConsent::Pending);
    auto &state = DatadogGlobalState::getInstance();
    const auto id = datadog::UUID::Random().ToString();
    JSObject enabled{{"applicationId", id}, {"nativeCrashReportEnabled", true}};
    struct sigaction original {
    }, current{};
    check(sigaction(SIGSEGV, nullptr, &original) == 0,
          "cannot read signal disposition");
    configureCrashReporting(core, enabled);
    check(!state.getCrashReporting(), "registered crashes without RUM");
    state.setRum(datadog::Rum::Register(core, datadog::RumConfig(id)));
    for (const auto &settings :
         {JSObject{}, JSObject{{"applicationId", id}},
          JSObject{{"applicationId", id}, {"nativeCrashReportEnabled", false}},
          JSObject{{"applicationId", id},
                   {"nativeCrashReportEnabled", std::string("true")}},
          JSObject{{"applicationId", std::string("invalid")},
                   {"nativeCrashReportEnabled", true}},
          JSObject{{"applicationId", datadog::UUID::Zero.ToString()},
                   {"nativeCrashReportEnabled", true}}}) {
        configureCrashReporting(core, settings);
        check(!state.getCrashReporting(),
              "disabled or invalid RUM settings registered crashes");
        check(sigaction(SIGSEGV, nullptr, &current) == 0,
              "cannot read signal disposition");
        check(current.sa_sigaction == original.sa_sigaction,
              "disabled setting installed a signal handler");
    }
    configureCrashReporting(nullptr, enabled);
    check(!state.getCrashReporting(), "null core registered crashes");
    configureCrashReporting(core, enabled);
    auto crashReporting = state.getCrashReporting();
    check(bool(crashReporting), "enabled setting did not register crashes");
    check(sigaction(SIGSEGV, nullptr, &current) == 0,
          "cannot read signal disposition");
    check(current.sa_sigaction != original.sa_sigaction,
          "in-process crash handler was not installed");
    configureCrashReporting(core, enabled);
    check(state.getCrashReporting() == crashReporting,
          "repeated configuration replaced the crash feature");
    check(core->Start(), "configured core did not start");
    core->Stop();
    state.reset();
    check(!state.getCrashReporting(), "reset retained the crash interface");
    std::cout << "Native crash configuration tests passed" << std::endl;
}
