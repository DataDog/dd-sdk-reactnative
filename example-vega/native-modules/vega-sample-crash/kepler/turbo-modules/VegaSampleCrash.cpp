#include "VegaSampleCrash.h"

using namespace com::amazon::kepler::turbomodule;

namespace VegaSampleCrashTurboModule {

VegaSampleCrash::VegaSampleCrash() {}
VegaSampleCrash::~VegaSampleCrash() noexcept {}

Promise VegaSampleCrash::crashForTesting() {
  __builtin_trap();
}

} // namespace VegaSampleCrashTurboModule
