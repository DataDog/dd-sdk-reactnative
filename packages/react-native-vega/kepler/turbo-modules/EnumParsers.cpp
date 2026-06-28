// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#include "EnumParsers.h"

namespace datadog_rn_vega {

datadog::RumActionType parseActionType(const std::string& type) {
    if (type == "TAP") return datadog::RumActionType::Tap;
    if (type == "SCROLL") return datadog::RumActionType::Scroll;
    if (type == "SWIPE") return datadog::RumActionType::Swipe;
    if (type == "BACK") return datadog::RumActionType::Custom;
    if (type == "CUSTOM") return datadog::RumActionType::Custom;
    if (type == "CLICK") return datadog::RumActionType::Click;
    return datadog::RumActionType::Custom;
}

datadog::RumResourceMethod parseResourceMethod(const std::string& method) {
    if (method == "GET") return datadog::RumResourceMethod::Get;
    if (method == "POST") return datadog::RumResourceMethod::Post;
    if (method == "PUT") return datadog::RumResourceMethod::Put;
    if (method == "DELETE") return datadog::RumResourceMethod::Delete;
    if (method == "HEAD") return datadog::RumResourceMethod::Head;
    if (method == "PATCH") return datadog::RumResourceMethod::Patch;
    if (method == "OPTIONS") return datadog::RumResourceMethod::Options;
    if (method == "CONNECT") return datadog::RumResourceMethod::Connect;
    if (method == "TRACE") return datadog::RumResourceMethod::Trace;
    return datadog::RumResourceMethod::Get;
}

datadog::RumResourceType parseResourceType(const std::string& kind) {
    if (kind == "xhr") return datadog::RumResourceType::Xhr;
    if (kind == "fetch") return datadog::RumResourceType::Fetch;
    if (kind == "document") return datadog::RumResourceType::Document;
    if (kind == "image") return datadog::RumResourceType::Image;
    if (kind == "font") return datadog::RumResourceType::Font;
    if (kind == "css") return datadog::RumResourceType::Css;
    if (kind == "js") return datadog::RumResourceType::Js;
    if (kind == "media") return datadog::RumResourceType::Media;
    if (kind == "beacon") return datadog::RumResourceType::Beacon;
    if (kind == "native") return datadog::RumResourceType::Native;
    if (kind == "other") return datadog::RumResourceType::Other;
    return datadog::RumResourceType::Unknown;
}

datadog::RumErrorSource parseErrorSource(const std::string& source) {
    if (source == "NETWORK") return datadog::RumErrorSource::Network;
    if (source == "SOURCE") return datadog::RumErrorSource::Source;
    if (source == "CONSOLE") return datadog::RumErrorSource::Console;
    if (source == "WEBVIEW") return datadog::RumErrorSource::Webview;
    if (source == "CUSTOM") return datadog::RumErrorSource::Custom;
    if (source == "LOGGER") return datadog::RumErrorSource::Logger;
    if (source == "AGENT") return datadog::RumErrorSource::Agent;
    if (source == "REPORT") return datadog::RumErrorSource::Report;
    return datadog::RumErrorSource::Custom;
}

datadog::RumOperationFailureReason parseOperationFailureReason(
    const std::string& reason) {
    if (reason == "ERROR") return datadog::RumOperationFailureReason::Error;
    if (reason == "ABANDONED")
        return datadog::RumOperationFailureReason::Abandoned;
    return datadog::RumOperationFailureReason::Other;
}

datadog::TrackingConsent parseTrackingConsent(const std::string& consent) {
    if (consent == "granted") return datadog::TrackingConsent::Granted;
    if (consent == "not_granted") return datadog::TrackingConsent::NotGranted;
    return datadog::TrackingConsent::Pending;
}

datadog::Site parseSite(const std::string& site) {
    if (site == "US1") return datadog::Site::us1;
    if (site == "US3") return datadog::Site::us3;
    if (site == "US5") return datadog::Site::us5;
    if (site == "EU1") return datadog::Site::eu1;
    if (site == "AP1") return datadog::Site::ap1;
    if (site == "AP2") return datadog::Site::ap2;
    if (site == "US1_FED") return datadog::Site::us1_fed;
    return datadog::Site::us1;
}

datadog::BatchSize parseBatchSize(const std::string& size) {
    if (size == "SMALL") return datadog::BatchSize::Small;
    if (size == "LARGE") return datadog::BatchSize::Large;
    return datadog::BatchSize::Medium;
}

datadog::UploadFrequency parseUploadFrequency(const std::string& frequency) {
    if (frequency == "RARE") return datadog::UploadFrequency::Rare;
    if (frequency == "FREQUENT") return datadog::UploadFrequency::Frequent;
    return datadog::UploadFrequency::Average;
}

datadog::BatchProcessingLevel parseBatchProcessingLevel(
    const std::string& level) {
    if (level == "LOW") return datadog::BatchProcessingLevel::Low;
    if (level == "HIGH") return datadog::BatchProcessingLevel::High;
    return datadog::BatchProcessingLevel::Medium;
}

}  // namespace datadog_rn_vega
