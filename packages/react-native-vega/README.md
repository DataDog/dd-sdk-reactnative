# Datadog React Native Vega SDK

This package is a proof of concept React Native bridge for Amazon Vega OS backed by
`dd-sdk-cpp`.

The native Vega module links `dd-sdk-cpp` through CMake. By default it fetches
`https://github.com/DataDog/dd-sdk-cpp.git` at the `0.7.0` tag. Pass
`-DDatadog_SOURCE_DIR=/path/to/dd-sdk-cpp` to use a local checkout during development.

Important: items listed as not implemented or not fully validated below are not known
to be broken on Vega. They were left out because there was not enough time in this PoC
to wire them completely and test them properly on device.

## Preview Tarballs

This preview depends on unreleased changes in `@datadog/mobile-react-native`,
including the `./internal` package export used by the Vega bridge. Ship and install
matching preview tarballs for both packages:

```sh
yarn workspace @datadog/mobile-react-native prepare
(cd packages/core && npm --cache /tmp/dd-sdk-reactnative-npm-cache pack)

(cd packages/react-native-vega && vega build -b Release)
yarn workspace @datadog/mobile-react-native-vega prepare
(cd packages/react-native-vega && npm --cache /tmp/dd-sdk-reactnative-npm-cache pack)
```

In a consuming Vega app, install both generated tarballs together so the exact
`@datadog/mobile-react-native@3.5.4-vega.0` dependency is satisfied by the preview
core package, not by the public `3.5.2` package.

## C++ SDK Feature Coverage

The C++ SDK exposes these main feature areas:

-   Core SDK lifecycle, configuration, storage, uploads, tracking consent, user info, and
    account info.
-   RUM registration, views, actions, resources, errors, attributes, sessions, and
    feature operations.
-   Logging registration, loggers, log levels, logger attributes, tags, and log to RUM
    error correlation.
-   Crash Reporting registration and build-time crash handler modes.

### Fully Implemented In Vega

| C++ SDK area              | Vega support | Notes                                                                                                                                                                              |
| ------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core configuration        | Implemented  | Creates `datadog::Core`, configures client token, env, service, site, batch size, upload frequency, batch processing level, app version, source, and a writable Vega storage path. |
| Core initialization/start | Implemented  | Registers features before `core->Start()` and starts the SDK during `DdSdkReactNative.initialize()`.                                                                               |
| Tracking consent          | Implemented  | Initial consent is passed to `Core::Create`; later updates call `core->SetTrackingConsent()`.                                                                                      |
| HTTP uploads              | Implemented  | `dd-sdk-cpp` is built with `DD_HTTP_CLIENT=none`; Vega provides a JS `fetch()` proxy for SDK upload requests.                                                                      |
| RUM registration          | Implemented  | Registers `datadog::Rum` when `rumConfiguration.applicationId` is provided.                                                                                                        |
| RUM session sample rate   | Implemented  | Maps `rumConfiguration.sessionSampleRate` to `RumConfig::SetSessionSampleRate()`.                                                                                                  |
| RUM global attributes     | Implemented  | `addAttribute`, `removeAttribute`, `addAttributes`, and `removeAttributes` map to RUM global attributes.                                                                           |
| RUM views                 | Implemented  | `startView` and `stopView` map to `Rum::StartView()` and `Rum::StopView()`.                                                                                                        |
| RUM actions               | Implemented  | `startAction`, `stopAction`, and `addAction` map to the C++ RUM action APIs.                                                                                                       |
| RUM resources             | Implemented  | `startResource` and successful `stopResource` map to `Rum::StartResource()` and `Rum::StopResource()`.                                                                             |
| RUM errors                | Implemented  | `addError` maps to `Rum::AddError()`.                                                                                                                                              |
| RUM view attributes       | Implemented  | `addViewAttribute`, `removeViewAttribute`, `addViewAttributes`, and `removeViewAttributes` map to C++ view attributes.                                                             |
| RUM session stop          | Implemented  | `stopSession` maps to `Rum::StopSession()`.                                                                                                                                        |

### Wired But Not Fully Validated

| C++ SDK area                | Vega support     | Notes                                                                                                                                                                                                                                                                                            |
| --------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RUM feature operations      | Wired            | `startFeatureOperation`, `succeedFeatureOperation`, and `failFeatureOperation` call the C++ operation APIs. They need more device-level validation.                                                                                                                                              |
| Automatic resource tracking | Wired through JS | React Native resource tracking is enabled from JS and reports through the Vega RUM wrapper. The C++ manual resource APIs are implemented, and C++ RUM resources can carry trace correlation attributes, but automatic interception and distributed tracing headers need broader testing on Vega. |
| Logging                     | Wired            | Registers C++ Logging when `logsConfiguration` is present and exports Vega `DdLogs` methods for debug, info, warn, and error events, including per-event context and attached error details. Error logs use C++ RUM-context enrichment. Device-level validation is still required.                 |
| `clearAllData` behavior     | Best effort      | Current implementation stops and restarts the core. This is not equivalent to a fully validated storage purge API.                                                                                                                                                                               |

### Not Wired Yet

| C++ SDK area               | Vega support          | Notes                                                                                                                                                                           |
| -------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User info                  | Not wired             | `dd-sdk-cpp` exposes `Core::SetUserInfo()`, `AddUserExtraInfo()`, and `ClearUserInfo()`, but the Vega native methods are currently no-ops.                                      |
| Account info               | Not wired             | `dd-sdk-cpp` exposes account APIs, but the Vega native methods are currently no-ops.                                                                                            |
| Crash Reporting            | Not wired             | `dd-sdk-cpp` exposes `CrashReporting`, but the Vega build currently uses `DD_CRASH_MODE=noop` and does not register crash reporting.                                            |
| Failed resource completion | Not wired             | `dd-sdk-cpp` exposes `Rum::StopResourceWithError()`, but the Vega bridge currently only maps successful `stopResource` plus separate `addError`.                                |
| Feature flag evaluations   | Not backed by C++ API | The React Native compatibility method exists, but `dd-sdk-cpp` does not expose a matching public feature flag API.                                                              |
| RUM custom timing          | Not backed by C++ API | The React Native compatibility method exists, but `dd-sdk-cpp` does not expose a matching public `addTiming` API.                                                               |
| Current session ID access  | Not backed by C++ API | Session IDs are generated internally by `dd-sdk-cpp` and included in RUM events, but there is no public getter.                                                                 |
| WebView events             | Not wired             | The React Native compatibility method is currently a no-op.                                                                                                                     |
| SDK telemetry APIs         | Not wired             | The React Native telemetry compatibility methods are currently no-ops.                                                                                                          |
| Standalone trace package   | Not backed by C++ API | `dd-sdk-cpp` does not currently expose a public standalone tracing/span API equivalent to React Native `DdTrace`. RUM resource trace correlation is separate and covered above. |
| Feature flags package      | Not exported          | This package intentionally does not export `DdFlags` in the current PoC.                                                                                                        |

## Run The Example App

From the repository root:

```sh
yarn install
```

Set local Datadog credentials in `example-vega/src/ddCredentials.ts`:

```ts
export const CLIENT_TOKEN = '<client-token>';
export const APPLICATION_ID = '<rum-application-id>';
export const ENVIRONMENT = 'dev';
```

Do not stage or commit real credentials.

Build and run the Vega app:

```sh
cd example-vega
vega build -b Debug
vega run-app build/aarch64-debug/examplevega_aarch64.vpkg
```

If Metro port forwarding is needed for local development:

```sh
vega device start-port-forwarding --port 8081 --forward false
vega device is-port-forwarded --port 8081 --forward false
```

To stop that port forwarding:

```sh
vega device stop-port-forwarding --port 8081 --forward false
```

## Running Tests

```sh
yarn jest packages/react-native-vega --runInBand --no-watchman
cd example-vega
yarn jest --config jest.config.json --runInBand --no-watchman
```
