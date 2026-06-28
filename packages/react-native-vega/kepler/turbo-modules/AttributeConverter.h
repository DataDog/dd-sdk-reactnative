// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#pragma once

#include <Kepler/turbomodule/JSValue.h>

#include "datadog/attribute.hpp"

namespace datadog_rn_vega {

/**
 * Converts a Kepler JSValue variant to a datadog::Attribute.
 *
 * JSValue = std::variant<nullptr_t, bool, int8_t, uint8_t, int16_t, uint16_t,
 *                        int32_t, uint32_t, int64_t, float, double,
 *                        std::string, JSArray, JSObject>
 */
datadog::Attribute jsValueToAttribute(
    const com::amazon::kepler::turbomodule::JSValue& value);

/**
 * Converts a Kepler JSObject (std::map<std::string, JSValue>) to a
 * datadog::Attribute of type Object. Each entry in the map becomes a named
 * property of the resulting Attribute.
 */
datadog::Attribute jsObjectToAttribute(
    const com::amazon::kepler::turbomodule::JSObject& object);

}  // namespace datadog_rn_vega
