// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#include "DdSdk.h"
#include "HttpJsProxy.h"

using namespace com::amazon::kepler::turbomodule;

namespace DdSdkTurboModule {

DdSdk::DdSdk() = default;

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

Promise DdSdk::httpResponse(std::string requestId, double statusCode) {
    return Promise(
        [requestId, statusCode](const std::shared_ptr<Promise> &promise) {
            datadog_rn_vega::HttpRequestBridge::getInstance().onResponse(
                requestId, static_cast<int>(statusCode));
            promise->resolve(true);
        });
}

} // namespace DdSdkTurboModule
