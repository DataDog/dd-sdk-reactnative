# Datadog React Native Vega SDK

This package is a proof of concept React Native bridge for Amazon Vega OS backed by
`dd-sdk-cpp`.

For customer integration instructions, see the [Vega preview usage guide](./PREVIEW_USAGE.md).

The native Vega module links `dd-sdk-cpp` through CMake. By default it fetches
`https://github.com/DataDog/dd-sdk-cpp.git` at the `0.7.0` tag. Pass
`-DDatadog_SOURCE_DIR=/path/to/dd-sdk-cpp` to use a local checkout during development.

Important: items listed as not implemented or not fully validated below are not known
to be broken on Vega. They were left out because there was not enough time in this PoC
to wire them completely and test them properly on device.

## Preview Packages

This preview depends on unreleased changes in `@datadog/mobile-react-native`,
including the `./internal` package export used by the Vega bridge. Ship and install
matching preview tarballs for the core and Vega packages. Automatic interaction
tracking also uses the Babel plugin, and automatic React Navigation view tracking uses
the matching React Navigation integration package.

| Package                                     | Required                   | Purpose                                                                             |
| ------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| `@datadog/mobile-react-native`              | Yes                        | Shared public types, configuration, buffering, and JS instrumentation used by Vega. |
| `@datadog/mobile-react-native-vega`         | Yes                        | Vega public wrappers, Kepler TurboModules, and the compiled `dd-sdk-cpp` libraries. |
| `@datadog/mobile-react-native-babel-plugin` | For automatic interactions | Adds the component metadata used to report user interactions.                       |
| `@datadog/mobile-react-navigation`          | For React Navigation views | Reports route changes as RUM views.                                                 |

Build the preview tarballs from the repository root:

```sh
yarn workspace @datadog/mobile-react-native prepare
(cd packages/core && npm --cache /tmp/dd-sdk-reactnative-npm-cache pack)

(cd packages/react-native-vega && vega build -b Release)
yarn workspace @datadog/mobile-react-native-vega prepare
(cd packages/react-native-vega && npm --cache /tmp/dd-sdk-reactnative-npm-cache pack)

yarn workspace @datadog/mobile-react-native-babel-plugin prepare
(cd packages/react-native-babel-plugin && npm --cache /tmp/dd-sdk-reactnative-npm-cache pack)

yarn workspace @datadog/mobile-react-navigation prepare
(cd packages/react-navigation && npm --cache /tmp/dd-sdk-reactnative-npm-cache pack)
```

The Vega package's `prepack` validation requires Release libraries for `aarch64`,
`armv7`, and `x86_64`. It excludes local build output, Debug libraries, and
`CMakeUserPresets.json` from the tarball.

In a consuming Vega app, install the generated core and Vega tarballs together so the exact
`@datadog/mobile-react-native@3.5.4-vega.0` dependency is satisfied by the preview
core package, not by the public package. Use a new tarball filename when replacing a
preview build so Yarn does not reuse a cached archive with the same name.

```json
{
    "dependencies": {
        "@datadog/mobile-react-native": "file:./rn-core-vega-preview.tgz",
        "@datadog/mobile-react-native-vega": "file:./rn-vega-preview.tgz",
        "@datadog/mobile-react-native-babel-plugin": "file:./rn-babel-vega-preview.tgz",
        "@datadog/mobile-react-navigation": "file:./rn-navigation-vega-preview.tgz"
    }
}
```

## Initialize The SDK

The customer-facing provider and configuration API follows the regular React Native
SDK. Import the public API from the Vega package and include a RUM configuration, a
Logs configuration, or both:

```tsx
import {
    DatadogProvider,
    DatadogProviderConfiguration,
    TrackingConsent
} from '@datadog/mobile-react-native-vega';

const configuration = new DatadogProviderConfiguration(
    CLIENT_TOKEN,
    ENVIRONMENT,
    TrackingConsent.GRANTED,
    {
        rumConfiguration: {
            applicationId: APPLICATION_ID,
            trackInteractions: true,
            trackResources: true,
            sessionSampleRate: 100
        },
        logsConfiguration: {
            bundleLogsWithRum: true
        }
    }
);

export const App = () => (
    <DatadogProvider configuration={configuration}>
        <Application />
    </DatadogProvider>
);
```

Providing `logsConfiguration` registers C++ Logging. Without it, calls to `DdLogs`
do not produce log events. `bundleLogsWithRum` defaults to `true` and enriches logs
with the active RUM context.

The legacy `DdSdkReactNative.initialize(configuration)` path and the provider's
two-phase `DatadogProvider.initialize(...)` path are also available. The provider is
recommended because it enables JS auto-instrumentation before rendering its children.

### Configuration Coverage

The shared React Native configuration accepts more options than the current Vega
native bridge applies:

| Configuration      | Current Vega behavior                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Core               | Applies client token, environment, service, site, tracking consent, batch size, upload frequency, and batch processing level.   |
| RUM registration   | Applies application ID and session sample rate.                                                                                 |
| JS instrumentation | Applies interaction tracking, accessibility-label naming, resource tracking, resource trace sample rate, and first-party hosts. |
| Logs               | The presence of `logsConfiguration` enables Logging, and `bundleLogsWithRum` controls RUM-context enrichment.                   |
| Trace              | `traceConfiguration` is accepted by the shared type but currently has no native effect.                                         |

Application version metadata, proxy configuration, custom intake endpoints,
`bundleLogsWithTraces`, native crash reporting, and most native performance options
are not currently applied by the Vega C++ bridge.

### Send Logs

`DdLogs` is a public API and supports the same basic log calls and attached-error
signature as the React Native SDK:

```ts
import { DdLogs } from '@datadog/mobile-react-native-vega';

const playbackError = new Error('Unable to start playback');

await DdLogs.debug('Loading content', { contentId: '123' });
await DdLogs.info('Content loaded', { contentId: '123' });
await DdLogs.warn('Slow response', { durationMs: 2500 });
await DdLogs.error(
    'Playback failed',
    'PlaybackError',
    playbackError.message,
    playbackError.stack,
    { contentId: '123' },
    'playback-start-failure'
);
```

Log event mappers, custom Logs endpoints, and trace/span correlation are not currently
wired on Vega.

### Track Interactions Automatically

Set `rumConfiguration.trackInteractions` to `true`, install the Datadog Babel plugin,
and add it to the app's Babel configuration:

```js
module.exports = {
    presets: ['module:metro-react-native-babel-preset'],
    plugins: ['@datadog/mobile-react-native-babel-plugin']
};
```

The plugin-backed path is the supported automatic interaction tracking mechanism on
Vega. Automatic user interaction tracking without the plugin is not currently wired.

### Track React Navigation Views Automatically

Install the matching `@datadog/mobile-react-navigation` preview package and Amazon's
Vega-compatible React Navigation packages. The existing Datadog navigation API tracks
the Amazon `NavigationContainer`; no Vega-specific tracker is required.

```json
{
    "dependencies": {
        "@amazon-devices/react-native-safe-area-context": "~2.0.0",
        "@amazon-devices/react-native-screens": "~2.0.0",
        "@amazon-devices/react-navigation__native": "~7.0.0",
        "@amazon-devices/react-navigation__stack": "~7.0.0"
    }
}
```

```tsx
import React, { useEffect } from 'react';
import {
    NavigationContainer,
    useNavigationContainerRef
} from '@amazon-devices/react-navigation__native';
import { DdRumReactNavigationTracking } from '@datadog/mobile-react-navigation';

const AppNavigator = () => {
    const navigationRef = useNavigationContainerRef();

    useEffect(() => {
        return () => {
            if (navigationRef.current) {
                DdRumReactNavigationTracking.stopTrackingViews(
                    navigationRef.current
                );
            }
        };
    }, [navigationRef]);

    return (
        <NavigationContainer
            ref={navigationRef}
            onReady={() => {
                DdRumReactNavigationTracking.startTrackingViews(
                    navigationRef.current
                );
            }}
        >
            {/* navigator and screens */}
        </NavigationContainer>
    );
};
```

Calling `startTrackingViews` once the container is ready reports the active route and
subsequent route changes as RUM views. The optional `viewNamePredicate`,
`viewTrackingPredicate`, and `paramsTrackingPredicate` options are supported. Only one
navigation container can be tracked at a time.

This integration is automatic after the tracker is attached; manual `DdRum.startView`
and `DdRum.stopView` calls remain available for apps that do not use React Navigation.

## Feature Coverage

The C++ SDK exposes these main feature areas:

-   Core SDK lifecycle, configuration, storage, uploads, tracking consent, user info, and
    account info.
-   RUM registration, views, actions, resources, errors, attributes, sessions, and
    feature operations.
-   Logging registration, loggers, log levels, logger attributes, tags, and log to RUM
    error correlation.
-   Crash Reporting registration and build-time crash handler modes.

### Fully Implemented In Vega

| Feature area              | Vega support                    | Notes                                                                                                                                                                    |
| ------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Core configuration        | Implemented                     | Creates `datadog::Core` and configures client token, env, service, site, batch size, upload frequency, batch processing level, source, and a writable Vega storage path. |
| Core initialization/start | Implemented                     | Registers features before `core->Start()` and starts the SDK during `DdSdkReactNative.initialize()`.                                                                     |
| Tracking consent          | Implemented                     | Initial consent is passed to `Core::Create`; later updates call `core->SetTrackingConsent()`.                                                                            |
| HTTP uploads              | Implemented                     | `dd-sdk-cpp` is built with `DD_HTTP_CLIENT=none`; Vega provides a JS `fetch()` proxy for SDK upload requests.                                                            |
| RUM registration          | Implemented                     | Registers `datadog::Rum` when `rumConfiguration.applicationId` is provided.                                                                                              |
| RUM session sample rate   | Implemented                     | Maps `rumConfiguration.sessionSampleRate` to `RumConfig::SetSessionSampleRate()`.                                                                                        |
| RUM global attributes     | Implemented                     | `addAttribute`, `removeAttribute`, `addAttributes`, and `removeAttributes` map to RUM global attributes.                                                                 |
| RUM views                 | Implemented                     | `startView` and `stopView` map to `Rum::StartView()` and `Rum::StopView()`.                                                                                              |
| RUM actions               | Implemented                     | `startAction`, `stopAction`, and `addAction` map to the C++ RUM action APIs.                                                                                             |
| RUM resources             | Implemented                     | `startResource` and successful `stopResource` map to `Rum::StartResource()` and `Rum::StopResource()`.                                                                   |
| RUM errors                | Implemented                     | `addError` maps to `Rum::AddError()`.                                                                                                                                    |
| RUM view attributes       | Implemented                     | `addViewAttribute`, `removeViewAttribute`, `addViewAttributes`, and `removeViewAttributes` map to C++ view attributes.                                                   |
| RUM session stop          | Implemented                     | `stopSession` maps to `Rum::StopSession()`.                                                                                                                              |
| Automatic interactions    | Implemented through JS          | The Datadog Babel plugin reports supported user interactions through the Vega RUM wrapper when `trackInteractions` is enabled.                                           |
| React Navigation views    | Implemented through integration | `@datadog/mobile-react-navigation` reports Amazon React Navigation route changes through the Vega-backed core RUM singleton.                                             |

### Wired But Not Fully Validated

| Feature area                | Vega support     | Notes                                                                                                                                                                                                                                                                                       |
| --------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RUM feature operations      | Wired            | `startFeatureOperation`, `succeedFeatureOperation`, and `failFeatureOperation` call the C++ operation APIs. They need more device-level validation.                                                                                                                                         |
| Automatic resource tracking | Wired through JS | React Native resource tracking is enabled from JS and reports through the Vega RUM wrapper. SDK upload requests are identified while active and excluded from customer RUM resources. Automatic interception and distributed tracing headers need broader testing on Vega.                  |
| Logging                     | Wired            | Registers C++ Logging when `logsConfiguration` is present and exports Vega `DdLogs` methods for debug, info, warn, and error events, including per-event context and attached error details. `bundleLogsWithRum` enriches logs with RUM context. Device-level validation is still required. |
| User info                   | Wired            | `setUserInfo`, `addUserExtraInfo`, and `clearUserInfo` map to the corresponding C++ Core APIs. Replacement, merging, and propagation into RUM and Log events need device-level validation.                                                                                                  |
| Account info                | Wired            | `setAccountInfo`, `addAccountExtraInfo`, and `clearAccountInfo` map to the corresponding C++ Core APIs. Replacement, merging, and propagation into RUM and Log events need device-level validation.                                                                                         |
| `clearAllData` behavior     | Best effort      | Current implementation stops and restarts the core. This is not equivalent to a fully validated storage purge API.                                                                                                                                                                          |

### Not Wired Yet

| Feature area               | Vega support          | Notes                                                                                                                                                                           |
| -------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Crash Reporting            | Not wired             | `dd-sdk-cpp` exposes `CrashReporting`, but the Vega build currently uses `DD_CRASH_MODE=noop` and does not register crash reporting.                                            |
| Failed resource completion | Not wired             | `dd-sdk-cpp` exposes `Rum::StopResourceWithError()`, but the Vega bridge currently only maps successful `stopResource` plus separate `addError`.                                |
| Feature flag evaluations   | Not backed by C++ API | The React Native compatibility method exists, but `dd-sdk-cpp` does not expose a matching public feature flag API.                                                              |
| RUM custom timing          | Not backed by C++ API | The React Native compatibility method exists, but `dd-sdk-cpp` does not expose a matching public `addTiming` API.                                                               |
| RUM view loading time      | Not backed by C++ API | The React Native compatibility method exists, but `dd-sdk-cpp` does not expose a matching public `addViewLoadingTime` API.                                                      |
| Current session ID access  | Not backed by C++ API | Session IDs are generated internally by `dd-sdk-cpp` and included in RUM events, but there is no public getter.                                                                 |
| WebView events             | Not wired             | The React Native compatibility method is currently a no-op.                                                                                                                     |
| SDK telemetry APIs         | Not wired             | The React Native telemetry compatibility methods are currently no-ops.                                                                                                          |
| Standalone trace package   | Not backed by C++ API | `dd-sdk-cpp` does not currently expose a public standalone tracing/span API equivalent to React Native `DdTrace`. RUM resource trace correlation is separate and covered above. |
| Feature flags package      | Not exported          | This package intentionally does not export `DdFlags` in the current PoC.                                                                                                        |

## React Native API Compatibility

The Vega package intentionally keeps its customer-facing API close to
`@datadog/mobile-react-native`, but it is not fully compatible yet.

-   `DatadogProvider`, `DatadogProviderConfiguration`, `DdSdkReactNative`,
    `DdRum`, and `DdLogs` are exported from `@datadog/mobile-react-native-vega`.
-   `DdTrace` is not exported because standalone client spans are not exposed by the
    current `dd-sdk-cpp` public API.
-   `DdFlags` is intentionally not exported for this preview.
-   `LogsConfiguration` is not re-exported, but `logsConfiguration` in the
    `DatadogProviderConfiguration` constructor works and enables native Logging.
-   `TraceConfiguration` is not re-exported. A `traceConfiguration` object is accepted
    by the shared configuration type but currently has no native effect on Vega.
-   `DdRum.addTiming`, `DdRum.addViewLoadingTime`, and
    `DdRum.addFeatureFlagEvaluation` currently resolve without producing data.
-   `DdRum.getCurrentSessionId()` currently resolves to `undefined`.
-   Vega does not currently apply RUM or Log event mappers, custom endpoints, custom
    attribute encoders, native crash reporting, or most native performance options.
-   Automatic JS error tracking is not currently wired. Customers can report handled
    errors with `DdRum.addError`.
-   Explicit timestamps accepted by the compatibility API are not currently forwarded
    to `dd-sdk-cpp`; native event time is used.
-   The optional fingerprint accepted by `DdRum.addError` is not currently forwarded to
    `dd-sdk-cpp`.
-   `DdRum.stopAction` currently requires the action type and name instead of supporting
    the regular React Native shorthand that stops the current action.
-   `clearAllData` is best effort as described above.

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
yarn build:debug
vega run-app build/aarch64-debug/examplevega_aarch64.vpkg
```

Choose the `aarch64`, `armv7`, or `x86_64` package that matches the target device.
The example's **Feature Actions** screen exposes individual controls for every wired
SDK feature. **Feature Scenarios** runs grouped workflows, including SDK context,
views, actions, resources, logs, errors, feature operations, and session handling.
Navigating between the example screens exercises React Navigation view tracking.

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
