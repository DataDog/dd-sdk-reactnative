// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#pragma once

#include <string>

#include "datadog/core.hpp"
#include "datadog/rum.hpp"

namespace datadog_rn_vega {

datadog::RumActionType parseActionType(const std::string& type);
datadog::RumResourceMethod parseResourceMethod(const std::string& method);
datadog::RumResourceType parseResourceType(const std::string& kind);
datadog::RumErrorSource parseErrorSource(const std::string& source);
datadog::RumOperationFailureReason parseOperationFailureReason(
    const std::string& reason);
datadog::TrackingConsent parseTrackingConsent(const std::string& consent);
datadog::Site parseSite(const std::string& site);
datadog::BatchSize parseBatchSize(const std::string& size);
datadog::UploadFrequency parseUploadFrequency(const std::string& frequency);
datadog::BatchProcessingLevel parseBatchProcessingLevel(
    const std::string& level);

}  // namespace datadog_rn_vega
