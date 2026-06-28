// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

// dd-sdk-cpp HTTP client implementation that proxies requests through JS.
// dd-sdk-cpp is built with DD_HTTP_CLIENT=none, so this file is compiled into the
// DatadogVega turbo module and provides the IHttpClient implementation (and the
// datadog::impl::Http::Init() entry point) that the SDK references but does not define.
// It includes dd-sdk-cpp internal headers, made available via target_include_directories.

#include "datadog/impl/core/http/client.hpp"
#include "HttpJsProxy.h"

namespace datadog::impl {

class JsProxyHttpClient final : public IHttpClient {
 public:
  HttpResult Post(
      const char* url, const char* headers,
      HttpBodyWriter body_writer) override {
    auto result = datadog_rn_vega::HttpRequestBridge::getInstance()
        .sendRequest(url, headers, std::move(body_writer));

    if (result.success) {
      return {HttpResultType::GotResponse, result.status_code};
    }
    if (result.retryable) {
      return {HttpResultType::GotNoResponse_Retryable, 0};
    }
    return {HttpResultType::SentNoRequest, 0};
  }
};

class JsProxyHttpSubsystem final : public IHttpSubsystem {
 public:
  std::string_view GetName() const override { return "js-proxy"; }
  std::string_view GetVersion() const override { return "1.0.0"; }

  std::unique_ptr<IHttpClient> CreateClient() override {
    return std::make_unique<JsProxyHttpClient>();
  }
};

std::unique_ptr<IHttpSubsystem> Http::Init(const DiagnosticLogger& logger) {
  (void)logger;
  return std::make_unique<JsProxyHttpSubsystem>();
}

}  // namespace datadog::impl
