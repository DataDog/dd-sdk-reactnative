# Vega Sample Native Crash Module

This is an application-owned TurboModule used to validate symbolication for
native code supplied by a Vega application, independently of the Datadog SDK.
Its `crashForTesting` method deliberately executes a trap instruction inside
`libVegaSampleCrash.so`. This keeps the faulting frame in the application-owned
library so the crash is a deterministic symbolication test on every architecture.

The example app's `build:release` and `build:debug` scripts build this module
before building the application. After a Release build, upload the app-owned
debug symbols from the application build output:

```sh
export PATH="$(brew --prefix binutils)/bin:$PATH"

DD_BETA_COMMANDS_ENABLED=1 datadog-ci elf-symbols upload \
  build/aarch64-release/debug/libVegaSampleCrash.so.debug \
  build/armv7-release/debug/libVegaSampleCrash.so.debug \
  build/x86_64-release/debug/libVegaSampleCrash.so.debug
```

Use the **Crash App TurboModule** action to generate the matching native crash.
Relaunch the app afterward so the Datadog SDK can upload the persisted report.
