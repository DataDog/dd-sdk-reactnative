// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#include "../kepler/turbo-modules/HttpJsProxy.h"

#ifdef NDEBUG
#undef NDEBUG
#endif
#include <cassert>
#include <chrono>
#include <cstring>
#include <future>
#include <stdexcept>
#include <vector>

using datadog_rn_vega::HttpRequestBridge;

int main() {
    auto &bridge = HttpRequestBridge::getInstance();
    auto emptyBody = [](char *, size_t) { return size_t{0}; };
    bridge.setEmitFunction({});
    assert(!bridge.sendRequest("url", "", emptyBody).success);

    bridge.setEmitFunction([&](const auto &id, const auto &url,
                               const auto &headers, const auto &body) {
        assert(url == "https://example.com/upload");
        assert(headers == "Content-Type: application/json\n");
        assert(body == "{}");
        bridge.onResponse(id, 202);
        bridge.onResponse(id,
                          500); // A duplicate must not overwrite the result.
    });
    auto result = bridge.sendRequest(
        "https://example.com/upload", "Content-Type: application/json\n",
        [written = false](char *buffer, size_t) mutable -> size_t {
            if (written)
                return 0;
            written = true;
            std::memcpy(buffer, "{}", 2);
            return 2;
        });
    assert(result.success && result.status_code == 202);

    bridge.setEmitFunction([&](const auto &id, const auto &, const auto &,
                               const auto &) { bridge.onResponse(id, 0); });
    result = bridge.sendRequest("url", "", emptyBody);
    assert(!result.success && result.retryable);

    bridge.setEmitFunction(
        [](const auto &, const auto &, const auto &, const auto &) {
            throw std::runtime_error("emitter unavailable");
        });
    result = bridge.sendRequest("url", "", emptyBody);
    assert(!result.success && result.retryable);

    bridge.setEmitFunction(
        [](const auto &, const auto &, const auto &, const auto &) {
            throw std::runtime_error("an aborted body must never be emitted");
        });
    result = bridge.sendRequest(
        "url", "", [](char *, size_t) { return size_t{0xffffffff}; });
    assert(!result.success && !result.retryable);
    result = bridge.sendRequest("url", "",
                                [](char *, size_t size) { return size + 1; });
    assert(!result.success && !result.retryable);

    bridge.setEmitFunction(
        [&](const auto &id, const auto &url, const auto &, const auto &) {
            bridge.onResponse(id, std::stoi(url));
        });
    std::vector<std::future<void>> requests;
    for (int status = 200; status < 220; ++status) {
        requests.push_back(std::async(std::launch::async, [&, status] {
            const auto request = bridge.sendRequest(
                std::to_string(status).c_str(), "", emptyBody);
            assert(request.success && request.status_code == status);
        }));
    }
    for (auto &request : requests)
        request.get();
    bridge.onResponse("unknown-request", 200);
    bridge.setEmitFunction({});

    std::promise<void> entered;
    std::promise<void> release;
    auto released = release.get_future().share();
    bridge.setEmitFunction(
        [&](const auto &id, const auto &, const auto &, const auto &) {
            entered.set_value();
            released.wait();
            bridge.onResponse(id, 202);
        });
    auto sending = std::async(std::launch::async, [&] {
        return bridge.sendRequest("url", "", emptyBody);
    });
    entered.get_future().wait();
    std::promise<void> clearing;
    auto teardown = std::async(std::launch::async, [&] {
        clearing.set_value();
        bridge.setEmitFunction({});
    });
    clearing.get_future().wait();
    assert(teardown.wait_for(std::chrono::milliseconds(20)) ==
           std::future_status::timeout);
    release.set_value();
    assert(sending.get().status_code == 202);
    teardown.get();
    assert(!bridge.sendRequest("url", "", emptyBody).success);
}
