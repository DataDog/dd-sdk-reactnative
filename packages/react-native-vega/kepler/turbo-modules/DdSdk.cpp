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
#include "AttributeConverter.h"

using namespace com::amazon::kepler::turbomodule;

namespace DdSdkTurboModule {

namespace {
template <typename Operation> Promise withCore(Operation operation) {
    return Promise([operation](const std::shared_ptr<Promise> &promise) {
        try {
            auto core =
                datadog_rn_vega::DatadogGlobalState::getInstance().getCore();
            if (!core) {
                promise->resolve(false);
                return;
            }
            operation(*core);
            promise->resolve(true);
        } catch (...) {
            promise->resolve(false);
        }
    });
}

std::string stringField(const JSObject &object, const std::string &key) {
    const auto entry = object.find(key);
    if (entry == object.end())
        return {};
    const auto value = std::get_if<std::string>(&entry->second);
    return value ? *value : std::string();
}

datadog::Attribute extraInfo(const JSObject &object) {
    const auto entry = object.find("extraInfo");
    if (entry != object.end()) {
        const auto value = std::get_if<JSObject>(&entry->second);
        if (value)
            return datadog_rn_vega::jsObjectToAttribute(*value);
    }
    return datadog::Attribute::Object();
}
template <typename Operation> Promise withFeatures(Operation operation) {
    return Promise([operation](const std::shared_ptr<Promise> &promise) {
        try {
            auto &state = datadog_rn_vega::DatadogGlobalState::getInstance();
            auto rum = state.getRum();
            auto logging = state.getLogging();
            if (rum)
                operation(*rum);
            if (logging)
                operation(*logging);
            promise->resolve(bool(rum) || bool(logging));
        } catch (...) {
            promise->resolve(false);
        }
    });
}
} // namespace

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
    return withFeatures([=](auto &feature) {
        feature.AddAttribute(key,
                             datadog_rn_vega::jsWrappedValueToAttribute(value));
    });
}

Promise DdSdk::removeAttribute(std::string key) {
    return withFeatures([=](auto &feature) { feature.RemoveAttribute(key); });
}

Promise DdSdk::addAttributes(JSObject attributes) {
    return withFeatures([=](auto &feature) {
        for (const auto &[key, value] : attributes) {
            feature.AddAttribute(key,
                                 datadog_rn_vega::jsValueToAttribute(value));
        }
    });
}

Promise DdSdk::removeAttributes(std::vector<std::string> keys) {
    return withFeatures([=](auto &feature) {
        for (const auto &key : keys) {
            feature.RemoveAttribute(key);
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

Promise DdSdk::setUserInfo(JSObject info) {
    return withCore([info](datadog::Core &core) {
        core.SetUserInfo(stringField(info, "id"), stringField(info, "name"),
                         stringField(info, "email"), extraInfo(info));
    });
}

Promise DdSdk::clearUserInfo() {
    return withCore([](datadog::Core &core) { core.ClearUserInfo(); });
}

Promise DdSdk::addUserExtraInfo(JSObject info) {
    return withCore([info](datadog::Core &core) {
        core.AddUserExtraInfo(datadog_rn_vega::jsObjectToAttribute(info));
    });
}

Promise DdSdk::setAccountInfo(JSObject info) {
    return withCore([info](datadog::Core &core) {
        core.SetAccountInfo(stringField(info, "id"), stringField(info, "name"),
                            extraInfo(info));
    });
}

Promise DdSdk::clearAccountInfo() {
    return withCore([](datadog::Core &core) { core.ClearAccountInfo(); });
}

Promise DdSdk::addAccountExtraInfo(JSObject info) {
    return withCore([info](datadog::Core &core) {
        core.AddAccountExtraInfo(datadog_rn_vega::jsObjectToAttribute(info));
    });
}

} // namespace DdSdkTurboModule
