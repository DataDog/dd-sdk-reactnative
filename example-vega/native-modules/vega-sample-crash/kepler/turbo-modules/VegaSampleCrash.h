#pragma once

#include "generated/VegaSampleCrashSpec.h"

namespace VegaSampleCrashTurboModule {

class VegaSampleCrash : public VegaSampleCrashSpec {
public:
  VegaSampleCrash();
  ~VegaSampleCrash() noexcept;

  com::amazon::kepler::turbomodule::Promise crashForTesting() override;
};

} // namespace VegaSampleCrashTurboModule
