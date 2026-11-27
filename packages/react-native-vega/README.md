# Datadog React Native SDK for Vega OS

This private package provides the native bridge and HTTP transport for Vega OS.
The bridge uses Datadog C++ SDK 0.10.0 and Kepler TurboModules. Native upload
requests are forwarded through JavaScript `fetch`; responses are returned to the
native upload thread. Direct, provider-based, and deferred SDK initialization
reuse core's shared configuration and automatic instrumentation.

SDK initialization manages the HTTP transport internally. Applications initialize
the SDK through `DdSdkReactNative.initialize(...)` or `DatadogProvider`; they do
not need to start or stop the transport separately. Uploads use a 25-second
JavaScript deadline alongside native's 30-second response wait. Timeouts and
cancellation keep batches eligible for retry. SDK uploads bypass automatic Fetch
and XHR resource tracking without adding headers or excluding app requests to
the same URL.

Native modules are resolved on use, keeping package imports safe on other
platforms. This package follows the shared repository version with a `-beta`
suffix while remaining private and excluded from publishing.

Run the transport tests with:

```sh
yarn test --runTestsByPath packages/react-native-vega/__tests__/*.test.ts --runInBand --watchman=false
yarn workspace @datadog/mobile-react-native-vega test:native
```

Regenerate the native module bindings after changing the specification:

```sh
yarn workspace @datadog/mobile-react-native-vega codegen
```

Build the native module with the Vega SDK installed:

```sh
cd packages/react-native-vega
vega build -b Release
```

For local C++ SDK development, pass an explicit source directory. This builds
its currently checked-out branch instead of downloading the pinned release:

```sh
vega build -b Release --cmakeFlags=-DDatadog_SOURCE_DIR=/path/to/dd-sdk-cpp
```

Telemetry and WebView-event bridge methods remain compatibility no-ops on Vega.
They resolve without doing work, including when shared core calls them directly.
Babel interaction telemetry uses the shared SDK wrapper and cannot interrupt the
application's press handler when telemetry is missing or fails.

## Initialization

Import `DdSdkReactNative`, `DatadogProvider`, and the shared configuration classes
from this package. Core's configuration translation, event mappers, attribute
encoders, buffering, and initialization modes are reused through lazy Kepler
adapters. Importing the package does not resolve native modules.

The core must successfully register at least one configured native feature before
it can start. A configuration without RUM or logging cannot start the core and
leaves JavaScript uninitialized. Logging-only setup also requires the native logging
bridge.

Setup waits for the HTTP listener and emitter before starting native upload
threads. It reuses a ready internal transport and cleans up a transport it started
if initialization fails. Failed native setup leaves JavaScript uninitialized
and permits retry; provider callbacks run only after initialization succeeds.
Vega handles provider failures in its own wrapper and reports warnings through
core's existing logger, respecting the configured verbosity. Consent changes use
the C++ SDK.

`clearAllData()` currently revokes and restores consent. With C++ SDK 0.10.0,
this removes pending-consent batches only; granted-consent batches remain
eligible for upload. Clearing both stores requires a native C++ clear-data API.

The optional `VEGA_TEST_INITIALIZATION=ON` host test needs
`DATADOG_CPP_SOURCE_DIR`, `KEPLER_INCLUDE_DIR`, and `NODE_API_INCLUDE_DIR`.
It exercises actual C++ SDK setup, invalid configuration, repeated setup,
consent, and pending-data clearing. Default host tests require no SDK headers.
