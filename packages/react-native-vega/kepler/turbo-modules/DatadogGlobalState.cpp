// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#include "DatadogGlobalState.h"

namespace datadog_rn_vega {

DatadogGlobalState& DatadogGlobalState::getInstance() {
    static DatadogGlobalState instance;
    return instance;
}

void DatadogGlobalState::setCore(std::shared_ptr<datadog::Core> core) {
    std::lock_guard<std::mutex> lock(mutex_);
    core_ = std::move(core);
}

std::shared_ptr<datadog::Core> DatadogGlobalState::getCore() {
    std::lock_guard<std::mutex> lock(mutex_);
    return core_;
}

void DatadogGlobalState::setRum(std::shared_ptr<datadog::Rum> rum) {
    std::lock_guard<std::mutex> lock(mutex_);
    rum_ = std::move(rum);
}

std::shared_ptr<datadog::Rum> DatadogGlobalState::getRum() {
    std::lock_guard<std::mutex> lock(mutex_);
    return rum_;
}

void DatadogGlobalState::setLogging(
    std::shared_ptr<datadog::Logging> logging
) {
    std::lock_guard<std::mutex> lock(mutex_);
    logging_ = std::move(logging);
}

std::shared_ptr<datadog::Logging> DatadogGlobalState::getLogging() {
    std::lock_guard<std::mutex> lock(mutex_);
    return logging_;
}

void DatadogGlobalState::setLogger(std::shared_ptr<datadog::Logger> logger) {
    std::lock_guard<std::mutex> lock(mutex_);
    logger_ = std::move(logger);
}

std::shared_ptr<datadog::Logger> DatadogGlobalState::getLogger() {
    std::lock_guard<std::mutex> lock(mutex_);
    return logger_;
}

void DatadogGlobalState::reset() {
    std::lock_guard<std::mutex> lock(mutex_);
    logger_.reset();
    logging_.reset();
    rum_.reset();
    core_.reset();
}

}  // namespace datadog_rn_vega
