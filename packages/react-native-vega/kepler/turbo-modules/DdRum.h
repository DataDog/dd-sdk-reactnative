// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#pragma once

#include "generated/DdRumSpec.h"

namespace DdRumTurboModule {

class DdRum : public DdRumSpec {
  public:
    DdRum() = default;
    ~DdRum() noexcept override = default;

    com::amazon::kepler::turbomodule::Promise
    startView(std::string key, std::string name,
              com::amazon::kepler::turbomodule::JSObject context,
              double timestampMs) override;
    com::amazon::kepler::turbomodule::Promise
    stopView(std::string key,
             com::amazon::kepler::turbomodule::JSObject context,
             double timestampMs) override;
    com::amazon::kepler::turbomodule::Promise
    startAction(std::string type, std::string name,
                com::amazon::kepler::turbomodule::JSObject context,
                double timestampMs) override;
    com::amazon::kepler::turbomodule::Promise
    stopAction(std::string type, std::string name,
               com::amazon::kepler::turbomodule::JSObject context,
               double timestampMs) override;
    com::amazon::kepler::turbomodule::Promise
    addAction(std::string type, std::string name,
              com::amazon::kepler::turbomodule::JSObject context,
              double timestampMs) override;
    com::amazon::kepler::turbomodule::Promise
    startResource(std::string key, std::string method, std::string url,
                  com::amazon::kepler::turbomodule::JSObject context,
                  double timestampMs) override;
    com::amazon::kepler::turbomodule::Promise
    stopResource(std::string key, double statusCode, std::string kind,
                 double size,
                 com::amazon::kepler::turbomodule::JSObject context,
                 double timestampMs) override;
    com::amazon::kepler::turbomodule::Promise
    addError(std::string message, std::string source, std::string stacktrace,
             com::amazon::kepler::turbomodule::JSObject context,
             double timestampMs, std::string fingerprint) override;
    com::amazon::kepler::turbomodule::Promise
    addViewAttribute(std::string key,
                     com::amazon::kepler::turbomodule::JSObject value) override;
    com::amazon::kepler::turbomodule::Promise
    removeViewAttribute(std::string key) override;
    com::amazon::kepler::turbomodule::Promise addViewAttributes(
        com::amazon::kepler::turbomodule::JSObject attributes) override;
    com::amazon::kepler::turbomodule::Promise
    removeViewAttributes(std::vector<std::string> keys) override;
    com::amazon::kepler::turbomodule::Promise
    reportAppFullyDisplayed() override;
    com::amazon::kepler::turbomodule::Promise stopSession() override;
    com::amazon::kepler::turbomodule::Promise startFeatureOperation(
        std::string name, std::string operationKey,
        com::amazon::kepler::turbomodule::JSObject attributes) override;
    com::amazon::kepler::turbomodule::Promise succeedFeatureOperation(
        std::string name, std::string operationKey,
        com::amazon::kepler::turbomodule::JSObject attributes) override;
    com::amazon::kepler::turbomodule::Promise failFeatureOperation(
        std::string name, std::string operationKey, std::string reason,
        com::amazon::kepler::turbomodule::JSObject attributes) override;
    com::amazon::kepler::turbomodule::Promise addTiming(std::string name) override;
    com::amazon::kepler::turbomodule::Promise addViewLoadingTime(bool overwrite) override;
    com::amazon::kepler::turbomodule::Promise addFeatureFlagEvaluation(
        std::string name, com::amazon::kepler::turbomodule::JSObject value) override;
    com::amazon::kepler::turbomodule::Promise getCurrentSessionId() override;
};

} // namespace DdRumTurboModule
