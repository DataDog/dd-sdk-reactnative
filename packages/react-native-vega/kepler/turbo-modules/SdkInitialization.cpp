// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#include "SdkInitialization.h"
#include "DatadogGlobalState.h"
#include "EnumParsers.h"
#include "datadog/uuid.hpp"

#include <filesystem>
#include <mutex>
#include <type_traits>

using namespace com::amazon::kepler::turbomodule;
namespace datadog_rn_vega {
namespace {
std::mutex initializationMutex;
datadog::TrackingConsent currentConsent = datadog::TrackingConsent::Pending;
std::string text(const JSObject &object, const std::string &key) {
    const auto found = object.find(key);
    if (found == object.end()) return {};
    const auto value = std::get_if<std::string>(&found->second);
    return value ? *value : std::string();
}
const JSObject *nested(const JSObject &object, const std::string &key) {
    const auto found = object.find(key);
    return found == object.end() ? nullptr : std::get_if<JSObject>(&found->second);
}
std::string storagePath(const JSObject &configuration) {
    const auto additional = nested(configuration, "additionalConfiguration");
    const auto explicitPath = additional ? text(*additional, "_dd.storage_path") : std::string();
    if (!explicitPath.empty()) return explicitPath;
    for (const std::string &path : {std::string("/data"), std::string("/tmp"), std::string(".")}) {
        const auto probe = std::filesystem::path(path) / ".datadog_vega_probe";
        std::error_code error;
        const bool created = std::filesystem::create_directory(probe, error);
        if (created) {
            std::filesystem::remove(probe, error);
            return path;
        }
    }
    return {};
}
}

bool initializeSdk(const JSObject &configuration) {
    std::lock_guard<std::mutex> lock(initializationMutex);
    auto &state = DatadogGlobalState::getInstance();
    if (state.getCore()) return true;
    const auto token = text(configuration, "clientToken");
    const auto env = text(configuration, "env");
    if (token.empty() || env.empty()) return false;
    const auto rumSettings = nested(configuration, "rumConfiguration");
    if (!rumSettings && !nested(configuration, "logsConfiguration")) return false;
    const auto applicationId = rumSettings ? text(*rumSettings, "applicationId") : std::string();
    if (rumSettings) {
        const auto id = datadog::UUID::Parse(applicationId);
        if (!id || *id == datadog::UUID::Zero) return false;
    }
    const auto storage = storagePath(configuration);
    if (storage.empty()) return false;
    auto service = text(configuration, "service");
    datadog::CoreConfig config(token, service.empty() ? "vega" : service, env);
    config.SetApplicationStoragePath(storage);
    const auto site = text(configuration, "site");
    if (!site.empty()) config.SetSite(parseSite(site));
    const auto batchSize = text(configuration, "batchSize");
    if (!batchSize.empty()) config.SetBatchSize(parseBatchSize(batchSize));
    const auto uploadFrequency = text(configuration, "uploadFrequency");
    if (!uploadFrequency.empty()) config.SetUploadFrequency(parseUploadFrequency(uploadFrequency));
    const auto processing = text(configuration, "batchProcessingLevel");
    if (!processing.empty()) config.SetBatchProcessingLevel(parseBatchProcessingLevel(processing));
    const auto verbosity = text(configuration, "verbosity");
    if (verbosity == "debug") config.SetDiagnosticThreshold(datadog::DiagnosticLevel::Debug);
    else if (verbosity == "info") config.SetDiagnosticThreshold(datadog::DiagnosticLevel::Status);
    else if (verbosity == "warn") config.SetDiagnosticThreshold(datadog::DiagnosticLevel::Warning);
    else if (verbosity == "error") config.SetDiagnosticThreshold(datadog::DiagnosticLevel::Error);
    config.Internal_SetSource("react-native");
    if (const auto additional = nested(configuration, "additionalConfiguration")) {
        const auto sdkVersion = text(*additional, "_dd.sdk_version");
        const auto appVersion = text(*additional, "_dd.version");
        if (!sdkVersion.empty()) config.Internal_SetSdkVersion(sdkVersion);
        if (!appVersion.empty()) config.SetVersion(appVersion);
    }
    auto core = datadog::Core::Create(config, parseTrackingConsent(text(configuration, "trackingConsent")));
    if (!core) return false;
    try {
        if (rumSettings) {
            datadog::RumConfig rumConfig(applicationId);
            const auto rate = rumSettings->find("sessionSampleRate");
            if (rate != rumSettings->end()) {
                std::visit([&rumConfig](const auto &value) {
                    using T = std::decay_t<decltype(value)>;
                    if constexpr (std::is_arithmetic_v<T> && !std::is_same_v<T, bool>)
                        rumConfig.SetSessionSampleRate(static_cast<float>(value));
                }, rate->second);
            }
            state.setRum(datadog::Rum::Register(core, rumConfig));
        }
        if (!core->Start()) {
            state.reset();
            return false;
        }
        state.setCore(core);
        currentConsent = parseTrackingConsent(text(configuration, "trackingConsent"));
        return true;
    } catch (...) {
        core->Stop();
        state.reset();
        throw;
    }
}
bool setSdkConsent(const std::string &consent) {
    std::lock_guard<std::mutex> lock(initializationMutex);
    const auto core = DatadogGlobalState::getInstance().getCore();
    if (!core) return false;
    currentConsent = parseTrackingConsent(consent);
    core->SetTrackingConsent(currentConsent);
    return true;
}

bool clearSdkData() {
    std::lock_guard<std::mutex> lock(initializationMutex);
    const auto core = DatadogGlobalState::getInstance().getCore();
    if (!core) return false;
    // Consent changes are queued in order. Revocation purges pending storage;
    // restoring the configured consent lets subsequent events keep their policy.
    core->SetTrackingConsent(datadog::TrackingConsent::NotGranted);
    core->SetTrackingConsent(currentConsent);
    return true;
}
} // namespace datadog_rn_vega
