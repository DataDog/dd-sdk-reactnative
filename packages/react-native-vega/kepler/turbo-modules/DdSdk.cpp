// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#include "DdSdk.h"
#include "HttpJsProxy.h"
#include "SdkInitialization.h"
#include "RumBridge.h"
#include "DatadogGlobalState.h"
#include "EnumParsers.h"
#include <thread>

using namespace com::amazon::kepler::turbomodule;

namespace DdSdkTurboModule {

DdSdk::DdSdk() = default;

Promise DdSdk::initialize(JSObject configuration) {
    return Promise([configuration](const std::shared_ptr<Promise> &promise) {
        try {
            std::thread([configuration, promise]() {
                try {
                    promise->resolve(datadog_rn_vega::initializeSdk(configuration));
                } catch (...) {
                    promise->resolve(false);
                }
            }).detach();
        } catch (...) {
            promise->resolve(false);
        }
    });
}

Promise DdSdk::setTrackingConsent(std::string trackingConsent) {
    return Promise([trackingConsent](const std::shared_ptr<Promise> &promise) {
        try {
            promise->resolve(datadog_rn_vega::setSdkConsent(trackingConsent));
        } catch (...) { promise->resolve(false); }
    });
}

Promise DdSdk::clearAllData() {
    return Promise([](const std::shared_ptr<Promise> &promise) {
        try {
            promise->resolve(datadog_rn_vega::clearSdkData());
        } catch (...) { promise->resolve(false); }
    });
}

Promise DdSdk::addAttribute(std::string key, JSObject value) {
    return datadog_rn_vega::withRum([=](datadog::Rum &rum) {
        rum.AddAttribute(key,
                         datadog_rn_vega::jsWrappedValueToAttribute(value));
    });
}

Promise DdSdk::removeAttribute(std::string key) {
    return datadog_rn_vega::withRum(
        [=](datadog::Rum &rum) { rum.RemoveAttribute(key); });
}

Promise DdSdk::addAttributes(JSObject attributes) {
    return datadog_rn_vega::withRum([=](datadog::Rum &rum) {
        for (const auto &[key, value] : attributes) {
            rum.AddAttribute(key, datadog_rn_vega::jsValueToAttribute(value));
        }
    });
}

Promise DdSdk::removeAttributes(std::vector<std::string> keys) {
    return datadog_rn_vega::withRum([=](datadog::Rum &rum) {
        for (const auto &key : keys) {
            rum.RemoveAttribute(key);
        }
    });
}

namespace {
// Shared core may call these APIs even though Vega has no corresponding feature.
Promise compatibilityNoop() {
    return Promise([](const std::shared_ptr<Promise> &promise) {
        promise->resolve(true);
    });
}
}

Promise DdSdk::sendTelemetryLog(std::string, JSObject, JSObject) {
    return compatibilityNoop();
}
Promise DdSdk::telemetryDebug(std::string) { return compatibilityNoop(); }
Promise DdSdk::telemetryError(std::string, std::string, std::string) {
    return compatibilityNoop();
}
Promise DdSdk::consumeWebviewEvent(std::string) { return compatibilityNoop(); }

Promise DdSdk::startHttpProxy() {
    return Promise([this](const std::shared_ptr<Promise> &promise) {
        datadog_rn_vega::HttpRequestBridge::getInstance().setEmitFunction(
            [this](const std::string &requestId, const std::string &url,
                   const std::string &headers, const std::string &body) {
                JSObject payload;
                payload["requestId"] = requestId;
                payload["url"] = url;
                payload["headers"] = headers;
                payload["body"] = body;
                emit("ddHttpRequest", payload);
            });
        promise->resolve(true);
    });
}

DdSdk::~DdSdk() noexcept {
    datadog_rn_vega::HttpRequestBridge::getInstance().setEmitFunction({});
}

Promise DdSdk::stopHttpProxy() {
    return Promise([](const std::shared_ptr<Promise> &promise) {
        datadog_rn_vega::HttpRequestBridge::getInstance().setEmitFunction({});
        promise->resolve(true);
    });
}

Promise DdSdk::httpResponse(std::string requestId, double statusCode) {
    return Promise(
        [requestId, statusCode](const std::shared_ptr<Promise> &promise) {
            datadog_rn_vega::HttpRequestBridge::getInstance().onResponse(
                requestId, static_cast<int>(statusCode));
            promise->resolve(true);
        });
}

} // namespace DdSdkTurboModule
