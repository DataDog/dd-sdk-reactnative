// Unless explicitly stated otherwise all files in this repository are licensed
// under the Apache License Version 2.0.
//
// This product includes software developed at Datadog
// (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

#include <Kepler/turbomodule/KeplerTurboModuleRegistration.h>
#include "turbo-modules/DdSdk.h"
#include "turbo-modules/DdRum.h"

extern "C" {
__attribute__((visibility("default"))) void
    autoLinkKeplerTurboModulesV1() noexcept {
        KEPLER_REGISTER_TURBO_MODULE(DdSdkTurboModule, DdSdk);
        KEPLER_REGISTER_TURBO_MODULE(DdRumTurboModule, DdRum);
    }
}
