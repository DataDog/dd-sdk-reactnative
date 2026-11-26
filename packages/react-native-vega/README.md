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
if initialization fails. Failed native setup leaves JavaScript uninitialized.
Direct `initialize()` calls can be explicitly retried after failure. Failed
provider setup does not trigger another attempt on subsequent renders; provider
callbacks run only after initialization succeeds. Vega contains provider failures
and reports warnings through core's existing logger, respecting the configured
verbosity. Consent changes use the C++ SDK.

`clearAllData()` currently revokes and restores consent. With C++ SDK 0.10.0,
this removes pending-consent batches only; granted-consent batches remain
eligible for upload. Clearing both stores requires a native C++ clear-data API.

The optional `VEGA_TEST_INITIALIZATION=ON` host test needs
`DATADOG_CPP_SOURCE_DIR`, `KEPLER_INCLUDE_DIR`, and `NODE_API_INCLUDE_DIR`.
It exercises actual C++ SDK setup, invalid configuration, repeated setup,
consent, and pending-data clearing. Default host tests require no SDK headers.

## Manual RUM and global attributes

Import `DdRum` and `DdSdkReactNative` from `@datadog/mobile-react-native-vega`.
After RUM is initialized, use `DdRum` to start and stop views, record discrete or
continuous actions, start and stop resources, report errors, update view
attributes, stop a session, report full app display, and track feature operations.

`DdSdkReactNative.addAttribute`, `addAttributes`, `removeAttribute`, and
`removeAttributes` update global RUM and logging attributes and the shared
JavaScript context. They also work when only logging is enabled.
View attributes take precedence over global attributes until removed or the view
ends. JSON-compatible values retain their types, including nested objects,
arrays, numbers, booleans, and null. Singular attribute calls wrap the value for
the bridge; that wrapper is removed before passing it to the C++ SDK.

Calls resolve safely when the native module or RUM feature is unavailable. They
are not buffered for later initialization. Native calls keep bridge order and use
the C++ SDK's existing event queue.

### Manual API limitations

- `addTiming`, `addViewLoadingTime`, and `addFeatureFlagEvaluation` are safe no-ops,
  including their native bindings. The native session getter resolves an empty
  string; the manual JavaScript wrapper exposes `undefined`.
- `getCurrentSessionId` resolves to `undefined`; the SDK does not expose a getter.
- Event timestamps come from the native SDK. Optional `timestampMs` arguments are
  accepted for compatibility but do not override that clock.
- Custom error fingerprints are accepted but are not supported by the native SDK.
- `BACK` actions map to the C++ SDK's `Custom` action type.
- Event mappers and tracing helpers use shared core instrumentation; manual
  Vega calls bypass those mappers. Error context includes source and Debug ID.

Attribute conversion tests can run on the host with dd-sdk-cpp 0.10.0 and the Vega
SDK headers installed. Pass `DATADOG_CPP_SOURCE_DIR`, `KEPLER_INCLUDE_DIR` (a root
containing `Kepler/` and `JsonContainer/`), and `NODE_API_INCLUDE_DIR` to the test
CMake configuration. Keep platform system headers separate from those roots when
building on macOS. The default host test command still runs the transport tests
without these SDK dependencies.

`DdLogs` forwards debug, info, warn and error logs, with optional error kind,
message, stack and attributes. `DdSdkReactNative` supports setting, updating and
clearing user/account information. Native failures leave JavaScript context
unchanged and do not reject into application code.

The native initializer calls `configureLogging(core, logsConfiguration)`
when a logs configuration is present, before starting the core. The logger uses
`bundleLogsWithRum` to control RUM correlation (defaults to `true`). Importing
these APIs does not initialize the SDK. Logs are ignored until the native
logger has been configured.

The optional log `source` argument does not change the C++ logger's source.
Custom fingerprints are kept in attributes but do not control native error
grouping in C++ SDK 0.10.0. Error enrichment and symbolication metadata are
described below.

Anonymous user attributes are supported through `addUserExtraInfo`, matching
core. Account attributes require an account ID to be set first.

### Logging registration compatibility

C++ SDK 0.10.0 returns non-null no-op objects when logging registration fails.
Vega builds compile a private copy of that source with nullable failure returns,
so failed registrations leave logging disabled. Repeated configuration keeps the
working logger. The dependency checkout is never edited, including when using
`Datadog_SOURCE_DIR`. The build rejects unexpected SDK versions or source changes
so this adjustment is reviewed when the C++ SDK is upgraded.

Set `VEGA_TEST_LOGGING_CONFIGURATION=ON` in the host test CMake configuration to
build the actual SDK and test failed registration, repeated configuration, and
logging-only attributes. This uses the same compatibility source as Vega builds
and requires the SDK and include paths described above.

## Crash reporting and application metadata

Native builds include the in-process crash backend. Setup registers it only when
RUM is configured with a valid application ID and `nativeCrashReportEnabled` is
`true`. Native crash capture is disabled by default. The C++ SDK installs its
handler once per process; this is a setup setting, not a runtime toggle.

RUM errors and logs with error details include the React Native source type and
the bundle Debug ID, when available. Use the core Metro configuration to generate
that Debug ID and upload the matching source map. Ordinary logs keep their
existing attributes.

SDK initialization connects these configuration hooks:

- `buildApplicationMetadata(configuration)` resolves service and version defaults
  from the platform's existing `DeviceInfoModule` constants. Explicit `service`
  and `version` values take precedence. It applies `versionSuffix` once and keeps
  the SDK version separate. If app details are unavailable, the service defaults
  to `vega` and the app version stays unset.
- `configureApplicationMetadata(coreConfig, additionalConfiguration)` sets native
  source, SDK version, and app version before `Core::Create`.
- `configureCrashReporting(core, rumConfiguration)` runs after RUM registration
  and before `Core::Start`, alongside the logging configuration hook.

Shared core enables JavaScript error tracking when `rumConfiguration.trackErrors`
is `true`, using the registered Vega native bridge. This preserves core's event
mappers, attribute encoding, and buffering without installing a second handler.
Importing the package does not install handlers. Fatal errors wait for native
reporting to settle before the crash-context delay and the app's error handler.
Non-fatal and console reporting have a timeout. Reporting failures still reach
the app's existing handlers.

Host native
coverage can be enabled with `VEGA_TEST_CRASH_CONFIGURATION=ON`, using the SDK
and include paths described above. It verifies signal-handler registration
without intentionally crashing the test process.
