// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#include "HttpJsProxy.h"

#include <chrono>
#include <vector>

namespace datadog_rn_vega {

static const size_t BODY_WRITER_EOF = 0;
static const size_t BODY_WRITER_ABORT = 0xffffffff;

HttpRequestBridge& HttpRequestBridge::getInstance() {
    static HttpRequestBridge instance;
    return instance;
}

void HttpRequestBridge::setEmitFunction(EmitFn fn) {
    std::lock_guard<std::mutex> lock(mutex_);
    emitFn_ = std::move(fn);
}

HttpProxyResult HttpRequestBridge::sendRequest(
    const char* url, const char* headers, BodyWriter body_writer) {

    // Read the full body from the writer callback
    std::vector<char> chunk(64 * 1024);
    std::string body;
    while (true) {
        size_t n = body_writer(chunk.data(), chunk.size());
        if (n == BODY_WRITER_EOF) break;
        if (n == BODY_WRITER_ABORT) {
            return {false, false, 0};
        }
        body.append(chunk.data(), n);
    }

    // Create a pending request with unique ID
    std::string requestId;
    auto pending = std::make_shared<PendingHttpRequest>();
    {
        std::lock_guard<std::mutex> lock(mutex_);
        requestId = std::to_string(nextRequestId_++);
        pending_[requestId] = pending;
    }

    // Emit the request to JS
    EmitFn emitFn;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        emitFn = emitFn_;
    }

    if (!emitFn) {
        std::lock_guard<std::mutex> lock(mutex_);
        pending_.erase(requestId);
        return {false, false, 0};
    }

    emitFn(requestId, std::string(url), std::string(headers), body);

    // Block until JS responds (30s timeout)
    {
        std::unique_lock<std::mutex> lock(pending->mutex);
        bool ok = pending->cv.wait_for(
            lock, std::chrono::seconds(30),
            [&] { return pending->completed; });

        if (!ok) {
            std::lock_guard<std::mutex> glock(mutex_);
            pending_.erase(requestId);
            return {false, true, 0};  // timeout → retryable
        }
    }

    int statusCode = pending->status_code;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        pending_.erase(requestId);
    }

    if (statusCode == 0) {
        return {false, true, 0};  // fetch() failed → retryable
    }
    return {true, false, statusCode};
}

void HttpRequestBridge::onResponse(const std::string& requestId, int statusCode) {
    std::shared_ptr<PendingHttpRequest> pending;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = pending_.find(requestId);
        if (it == pending_.end()) {
            return;
        }
        pending = it->second;
    }

    {
        std::lock_guard<std::mutex> lock(pending->mutex);
        pending->status_code = statusCode;
        pending->completed = true;
    }
    pending->cv.notify_one();
}

}  // namespace datadog_rn_vega
