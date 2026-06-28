// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

// Custom UUID implementation for Vega OS, which does not include libuuid.
// Reads 16 random bytes from /dev/urandom to generate UUIDs.

#include "datadog/impl/core/platform/uuid.hpp"

#include <cstdio>

namespace datadog::platform {

void UuidGenerate(uint8_t out[16]) {
  FILE* f = std::fopen("/dev/urandom", "rb");
  if (f) {
    std::fread(out, 1, 16, f);
    std::fclose(f);

    // Set version 4 (random) UUID bits per RFC 4122
    out[6] = (out[6] & 0x0F) | 0x40;  // version 4
    out[8] = (out[8] & 0x3F) | 0x80;  // variant 1
  } else {
    // Fallback: zero-fill (should not happen on Vega OS)
    for (int i = 0; i < 16; ++i) {
      out[i] = 0;
    }
  }
}

}  // namespace datadog::platform
