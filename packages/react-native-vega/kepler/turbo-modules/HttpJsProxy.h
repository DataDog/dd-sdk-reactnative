// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#pragma once

#include <condition_variable>
#include <functional>
#include <map>
#include <memory>
#include <mutex>
#include <string>

namespace datadog_rn_vega {

/**
 * Holds a pending HTTP request that's waiting for a JS response.
 */
struct PendingHttpRequest {
    std::mutex mutex;
    std::condition_variable cv;
    bool completed = false;
    int status_code = 0;
};

/**
 * Result of an HTTP request proxied through JS.
 */
struct HttpProxyResult {
    bool success;       // true if we got a response
    bool retryable;     // true if failure is transient (timeout, etc.)
    int status_code;    // HTTP status code (0 if no response)
};

/**
 * Manages pending HTTP requests and their JS responses.
 * Thread-safe singleton.
 *
 * Used by:
 * - http_js_proxy_client.cpp (compiled inside dd_native): calls sendRequest()
 * - DdSdk.cpp (our TurboModule): wires up emitFn and calls onResponse()
 */
class HttpRequestBridge {
  public:
    static HttpRequestBridge& getInstance();

    using EmitFn = std::function<void(const std::string& requestId,
                                      const std::string& url,
                                      const std::string& headers,
                                      const std::string& body)>;

    /**
     * Body writer callback — reads chunks of request body.
     * Returns number of bytes written, 0 for EOF, 0xffffffff for abort.
     */
    using BodyWriter = std::function<size_t(char* buffer, size_t num_bytes)>;

    void setEmitFunction(EmitFn fn);

    /**
     * Called from the upload thread. Reads the full body, emits an HTTP
     * request event to JS, and blocks until httpResponse() is called.
     */
    HttpProxyResult sendRequest(
        const char* url, const char* headers, BodyWriter body_writer);

    /**
     * Called from JS thread via DdSdk.httpResponse().
     * Unblocks the waiting upload thread.
     */
    void onResponse(const std::string& requestId, int statusCode);

  private:
    HttpRequestBridge() = default;

    std::mutex mutex_;
    EmitFn emitFn_;
    uint64_t nextRequestId_ = 0;
    std::map<std::string, std::shared_ptr<PendingHttpRequest>> pending_;
};

}  // namespace datadog_rn_vega
