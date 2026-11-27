// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#pragma once
#include <Kepler/turbomodule/JSValue.h>
#include <string>
namespace datadog_rn_vega {
bool setSdkConsent(const std::string &consent);
bool clearSdkData();
bool initializeSdk(const com::amazon::kepler::turbomodule::JSObject &configuration);
}
