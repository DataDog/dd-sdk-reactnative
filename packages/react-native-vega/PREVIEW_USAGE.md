# Datadog React Native SDK for Vega OS - Preview Guide

This preview brings Datadog React Native monitoring to applications running on Amazon
Vega OS. Its public API closely follows `@datadog/mobile-react-native`, so most existing
React Native SDK usage can be carried over by importing from the Vega package.

This is a preview release. Some advanced React Native SDK features are not yet available
on Vega, and some supported features may have different internal behavior. See
[Current Limitations](#current-limitations) before integrating the preview.

## Included Packages

The preview is distributed as local `.tgz` packages.

| Package                                     | When it is needed                             |
| ------------------------------------------- | --------------------------------------------- |
| `@datadog/mobile-react-native`              | Required                                      |
| `@datadog/mobile-react-native-vega`         | Required                                      |
| `@datadog/mobile-react-native-babel-plugin` | Required for automatic interaction tracking   |
| `@datadog/mobile-react-navigation`          | Required for automatic React Navigation views |

Keep the supplied archive names or rename them consistently with the paths in your
application's `package.json`:

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

Then install the dependencies:

```sh
yarn install
```

The core and Vega preview packages must be installed together. They contain matching
unreleased APIs and should not be mixed with a public version of
`@datadog/mobile-react-native`.

The Vega archive must include both Debug and Release native libraries and matching
manifest entries for the target architecture. Debug variants are also required to
build the development app used with Metro and Fast Refresh. If an older preview
fails with "Could not find a corresponding manifest configuration", replace it
with an archive containing both variants; changing Babel or Metro settings does
not supply missing native libraries.

When replacing a preview archive, use a new filename or clear the Yarn cache before
installing it. Yarn 1 can otherwise reuse the previous contents of a local archive with
the same filename.

## Initialize The SDK

Import the public API from `@datadog/mobile-react-native-vega` and wrap the application
with `DatadogProvider`:

```tsx
import React from 'react';
import {
    DatadogProvider,
    DatadogProviderConfiguration,
    TrackingConsent
} from '@datadog/mobile-react-native-vega';

const configuration = new DatadogProviderConfiguration(
    '<CLIENT_TOKEN>',
    '<ENVIRONMENT>',
    TrackingConsent.GRANTED,
    {
        rumConfiguration: {
            applicationId: '<RUM_APPLICATION_ID>',
            trackInteractions: true,
            trackResources: true,
            trackErrors: true,
            nativeCrashReportEnabled: true,
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

Only include `logsConfiguration` when the application needs to send logs. Its presence
enables native Logging. `bundleLogsWithRum` defaults to `true`, which adds the active RUM
context to log events.

## Configure Application Version

The SDK automatically reads the running Vega package's application version through
the transitive device-info dependency. No version configuration is required for this
default. Use the same optional overrides as the React Native SDK before initializing
or mounting the provider:

```ts
configuration.version = '1.2.3';
configuration.versionSuffix = 'preview'; // optional: reports 1.2.3-preview
```

`version` identifies your application's release. The Datadog SDK version is reported
separately and is supplied by the matching core preview package. Neither value is
the Amazon Vega SDK or OS version.

When only `versionSuffix` is set, it is appended to the detected package version.
For example, a package version of `0.1.0` with suffix `preview` reports
`0.1.0-preview`. The detected value comes from the installed package, including any
build-time version override, rather than the application's npm `package.json`.
If Vega cannot supply package metadata, initialization continues and logs a warning;
set `version` explicitly in that environment.

## Configure JavaScript Source Maps

Wrap the app's merged Metro configuration so the application bundle and source map
receive the same Debug ID:

```js
const {
    withDatadogMetroConfig
} = require('@datadog/mobile-react-native/metro');

module.exports = withDatadogMetroConfig(mergedConfig);
```

Vega Release builds write the relevant artifacts to
`build/lib/rn-bundles/Release/index.bundle` and
`build/debugging/Release/srcmap/index.bundle.map`.

Do not add `traceConfiguration` for this preview. Standalone tracing is not currently
available on Vega.

## Supported Features

The preview supports the following customer-facing workflows:

-   RUM views, including manual view APIs and React Navigation integration.
-   RUM actions, including automatic interactions, custom actions, and long-running
    actions.
-   Automatic and manual resource tracking.
-   Automatic JavaScript error tracking when `trackErrors` is enabled, plus handled
    errors reported with `DdRum.addError`.
-   RUM feature operations.
-   Global and view-specific attributes.
-   User and account information.
-   Tracking consent updates and session stopping.
-   Debug, info, warning, and error logs with custom context and attached error details.
-   RUM context enrichment for logs.
-   Native crash reporting through the C++ in-process crash handler. Crash reports are
    processed and uploaded as RUM errors on the next application launch.

## Send Logs

Use the public `DdLogs` API after initializing with `logsConfiguration`:

```ts
import { DdLogs } from '@datadog/mobile-react-native-vega';

await DdLogs.debug('Loading content', { contentId: '123' });
await DdLogs.info('Content loaded', { contentId: '123' });
await DdLogs.warn('Slow response', { durationMs: 2500 });

const playbackError = new Error('Unable to start playback');
await DdLogs.error(
    'Playback failed',
    'PlaybackError',
    playbackError.message,
    playbackError.stack,
    { contentId: '123' },
    'playback-start-failure'
);
```

## Set User And Account Information

```ts
import { DdSdkReactNative } from '@datadog/mobile-react-native-vega';

await DdSdkReactNative.setUserInfo({
    id: 'user-123',
    name: 'Example User',
    email: 'user@example.com',
    extraInfo: {
        plan: 'premium'
    }
});

await DdSdkReactNative.setAccountInfo({
    id: 'account-123',
    name: 'Example Account',
    extraInfo: {
        tier: 'enterprise'
    }
});
```

Additional properties can be merged with `addUserExtraInfo` and
`addAccountExtraInfo`. Call `setUserInfo` or `setAccountInfo` before adding extra
information. Use `clearUserInfo` and `clearAccountInfo` when the corresponding context
should no longer be attached to events.

## Track Interactions Automatically

Automatic interaction tracking requires both `trackInteractions: true` and the supplied
Datadog Babel plugin.

Add the plugin to `babel.config.js`:

```js
module.exports = {
    presets: ['module:metro-react-native-babel-preset'],
    plugins: ['@datadog/mobile-react-native-babel-plugin']
};
```

Restart Metro and rebuild the application after changing the Babel configuration.

## Track React Navigation Views

For automatic route tracking, install the supplied
`@datadog/mobile-react-navigation` preview and Amazon's Vega-compatible navigation
packages:

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

Attach the existing Datadog React Navigation tracker when the navigation container is
ready:

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

Route changes are then reported as RUM views. The tracker also supports
`viewNamePredicate`, `viewTrackingPredicate`, and `paramsTrackingPredicate`. Only one
navigation container can be tracked at a time.

## Current Limitations

The following React Native SDK features are not currently available in this preview:

-   Standalone spans through `DdTrace`.
-   Feature flags through `DdFlags`.
-   RUM and Log event mappers, custom intake endpoints, and custom attribute encoders.
-   RUM custom timings and view loading time.
-   Feature flag evaluation events.
-   Access to the current RUM session ID.
-   WebView event forwarding and SDK telemetry APIs.

There are also some compatibility differences to be aware of:

-   `DdRum.stopAction` currently requires the action type and name.
-   Explicit event timestamps and RUM error fingerprints are accepted by the compatibility
    API but are not currently forwarded to the native SDK.
-   `clearAllData` currently performs a best-effort SDK restart and has not been validated
    as a complete purge of persisted, unsent data.
-   Advanced configuration fields accepted by the shared React Native types may not yet
    have an effect on Vega.
-   Native crash reporting is wired and builds for all supported Vega architectures,
    but end-to-end crash capture and next-launch upload still require broader
    physical-device validation.

Features listed as unavailable or not fully validated are not necessarily known to be
incompatible with Vega. They were excluded from this preview because there was not
enough time to implement and validate them properly.

## Use The Sample Application

The supplied sample application demonstrates initialization and provides controls for
the supported features:

-   **Feature Actions** exposes individual SDK operations.
-   Navigating between screens exercises React Navigation view tracking.
-   **Network Requests** exercises automatic RUM resource tracking.

Set the supplied sample's Datadog credentials before building it. Do not commit client
tokens or application IDs to source control.

Build the application for a Vega device:

```sh
yarn install
yarn build:release
```

**Note: If `yarn build:release` fails run `yarn install` again**

Run the generated package whose architecture matches the target device. For example:

```sh
vega run-app build/aarch64-release/examplevega_aarch64.vpkg
```

### Verify Application Version Metadata

1. Rebuild and pack the Vega SDK using the [repository build instructions](README.md#preview-packages).
   Install the updated archive in the sample app using a new filename, then run
   `yarn install`. This fix changes native code, so restarting Metro alone is not
   sufficient.
2. First run the sample without either version field. Newly generated events should
   report the installed Vega package version (`0.1.0` for the sample's default
   manifest). Then, in `example-vega/src/App.tsx`, add the existing fields before the
   provider mounts:

   ```ts
   datadogConfiguration.version = '1.2.3';
   datadogConfiguration.versionSuffix = 'version-check';
   ```

3. Build the sample with `yarn build:release` and run the resulting `.vpkg` on a
   connected device or Vega virtual device. Navigate between screens and use
   **Feature Actions** to send an info log. Filter new RUM events and logs by the
   sample's environment and service in Datadog.
4. Check that the RUM event's `version` is `1.2.3-version-check` and that the log's
   `version` tag has the same value. The `sdk_version` tag and the log's
   `logger.version` should match the installed core package version,
   such as `3.5.4-vega.0`.
5. Remove `versionSuffix`, rebuild, and relaunch. New events should report `1.2.3`.
   Remove `version` and keep the suffix: new events should report the packaged version
   with `-version-check` appended. Remove both fields and repeat: the packaged
   application version and the separate Datadog SDK version should both be present.

For a before/after comparison, repeat these steps with an SDK archive built from
the commit before this fix. Keep the app configuration identical. That build
does not detect or forward the application version and reports the underlying
C++ SDK version instead of the React Native SDK version. Compare only newly
generated events after each full application restart.

## Preview Feedback

When reporting an issue, include the preview package filenames, target device and
architecture, Vega SDK version, reproduction steps, and any relevant application or
device logs. Do not include Datadog client tokens or other credentials.
