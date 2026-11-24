// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#pragma once

#include "generated/DdSdkSpec.h"

namespace DdSdkTurboModule {

class DdSdk : public DdSdkSpec {
  public:
    DdSdk();
    ~DdSdk() noexcept override;
    com::amazon::kepler::turbomodule::Promise initialize(com::amazon::kepler::turbomodule::JSObject configuration) override;
    com::amazon::kepler::turbomodule::Promise setTrackingConsent(std::string trackingConsent) override;
    com::amazon::kepler::turbomodule::Promise clearAllData() override;

    com::amazon::kepler::turbomodule::Promise
    addAttribute(std::string key,
                 com::amazon::kepler::turbomodule::JSObject value) override;
    com::amazon::kepler::turbomodule::Promise
    removeAttribute(std::string key) override;
    com::amazon::kepler::turbomodule::Promise addAttributes(
        com::amazon::kepler::turbomodule::JSObject attributes) override;
    com::amazon::kepler::turbomodule::Promise
    removeAttributes(std::vector<std::string> keys) override;
    com::amazon::kepler::turbomodule::Promise sendTelemetryLog(
        std::string message, com::amazon::kepler::turbomodule::JSObject attributes,
        com::amazon::kepler::turbomodule::JSObject config) override;
    com::amazon::kepler::turbomodule::Promise telemetryDebug(std::string message) override;
    com::amazon::kepler::turbomodule::Promise telemetryError(
        std::string message, std::string stack, std::string kind) override;
    com::amazon::kepler::turbomodule::Promise consumeWebviewEvent(std::string message) override;
    com::amazon::kepler::turbomodule::Promise
    setUserInfo(com::amazon::kepler::turbomodule::JSObject info) override;
    com::amazon::kepler::turbomodule::Promise clearUserInfo() override;
    com::amazon::kepler::turbomodule::Promise
    addUserExtraInfo(com::amazon::kepler::turbomodule::JSObject info) override;
    com::amazon::kepler::turbomodule::Promise
    setAccountInfo(com::amazon::kepler::turbomodule::JSObject info) override;
    com::amazon::kepler::turbomodule::Promise clearAccountInfo() override;
    com::amazon::kepler::turbomodule::Promise addAccountExtraInfo(
        com::amazon::kepler::turbomodule::JSObject info) override;

    com::amazon::kepler::turbomodule::Promise startHttpProxy() override;
    com::amazon::kepler::turbomodule::Promise stopHttpProxy() override;
    com::amazon::kepler::turbomodule::Promise
    httpResponse(std::string requestId, double statusCode) override;
};

} // namespace DdSdkTurboModule
