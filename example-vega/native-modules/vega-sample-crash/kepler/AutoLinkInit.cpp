#include <Kepler/turbomodule/KeplerTurboModuleRegistration.h>

#include "turbo-modules/VegaSampleCrash.h"

extern "C" {
__attribute__((visibility("default"))) void
    autoLinkKeplerTurboModulesV1() noexcept {
        KEPLER_REGISTER_TURBO_MODULE(
            VegaSampleCrashTurboModule,
            VegaSampleCrash
        );
    }
}
