# React-Native Monitoring

Datadog Real User Monitoring (RUM) enables you to visualize and analyze the real-time performance and user journeys of your application’s individual users.

## Setup

To install with NPM, run:

```sh
npm install @datadog/mobile-react-native
```

To install with Yarn, run:

```sh
yarn add @datadog/mobile-react-native
```

**Minimum React Native version**: SDK supports React Native version 0.63.4 or higher. Compatibility with older versions is not guaranteed out of the box.

Versions `1.0.0-rc5` and higher require you to have `compileSdkVersion = 31` in the Android application setup, which implies that you should use Build Tools version 31, Android Gradle Plugin version 7, and Gradle version 7 or higher. To modify the versions, change the values in the `buildscript.ext` block of your application's top-level `build.gradle` file. Datadog recommends using React Native version 0.67 or higher.

### Specify application details in UI

1. In the [Datadog app][1], select **UX Monitoring > RUM Applications > New Application**.
2. Choose `react-native` as your Application Type.
3. Provide a new application name to generate a unique Datadog application ID and client token.

![image][2]

To ensure the safety of your data, you must use a client token. You cannot use only [Datadog API keys][3] to configure the `@datadog/mobile-react-native` library, because they would be exposed client-side. For more information about setting up a client token, see the [Client Token documentation][4].

### Initialize the library with application context

```js
import {
    DatadogProvider,
    DatadogProviderConfiguration
} from '@datadog/mobile-react-native';

const datadogConfiguration = new DatadogProviderConfiguration(
    '<CLIENT_TOKEN>',
    '<ENVIRONMENT_NAME>',
    TrackingConsent.GRANTED,
    {
        rumConfiguration: {
            applicationId: '<RUM_APPLICATION_ID>',
            trackInteractions: true, // track User interactions (e.g.: Tap on buttons. You can use 'accessibilityLabel' element property to give tap action the name, otherwise element type will be reported)
            trackResources: true, // track XHR Resources
            trackFetchResources: true, // Optional: also track requests made with the global Expo Fetch implementation
            trackFrustrations: true, // track Frustrations
            trackErrors: true, // track errors
            nativeCrashReportEnabled: true, // Optional: enable or disable native crash reports
            sessionSampleRate: 80, // Optional: sample RUM sessions (here, 80% of session will be sent to Datadog. Default = 100%)
            resourceTraceSampleRate: 80, // Optional: sample tracing integrations for network calls between your app and your backend (here, 80% of calls to your instrumented backend will be linked from the RUM view to the APM view. Default = 20%)
            // You need to specify the hosts of your backends to enable tracing with these backends
            firstPartyHosts: ['example.com'], // matches 'example.com' and subdomains like 'api.example.com'
        },
        logsConfiguration: {
            logEventMapper: logEvent => {
                logEvent.message = `[CUSTOM] ${logEvent.message}`;
                return logEvent;
            }
        },
        traceConfiguration: {}
    }
);
// Optional: Select your Datadog website (one of "US1", "US3", "US5", "EU1", "AP1", "AP2", or "US1_FED"). Default is "US1".
datadogConfiguration.site = 'US1';
// Optional: set the reported service name (by default, it'll use the package name / bundleIdentifier of your Android / iOS app respectively)
datadogConfiguration.service = 'com.example.reactnative';
// Optional: let the SDK print internal logs (above or equal to the provided level. Default = undefined (meaning no logs))
datadogConfiguration.verbosity = SdkVerbosity.WARN;

export default function App() {
    return (
        <DatadogProvider configuration={datadogConfiguration}>
            <Navigation />
        </DatadogProvider>
    );
}
```

`trackFetchResources` tracks calls made through the Expo-installed global
`fetch`. Direct imports retained from `expo/fetch` are not intercepted. XHR
tracking remains enabled for clients such as axios.

GraphQL error extraction (via `DatadogLink({ trackErrors: true })`) for
requests made through `expo/fetch` requires Expo SDK 56 or later, as older
versions of `expo/fetch` do not implement `Response.clone()`. On earlier
versions, GraphQL metadata is still reported, but response errors are not.

### Track view navigation

Because React Native offers a wide range of libraries to create screen navigation, by default only manual View tracking is supported. You can manually start and stop a View using the following `startView()` and `stopView` methods.

```js
import {
    DdSdkReactNative,
    DdSdkReactNativeConfiguration,
    DdLogs,
    DdRum
} from '@datadog/mobile-react-native';

// Start a view with a unique view identifier, a custom view url, and an object to attach additional attributes to the view
DdRum.startView('ViewKey', 'ViewName', Date.now(), {
    'custom.foo': 'something'
});
// Stops a previously started view with the same unique view identifier, and an object to attach additional attributes to the view
DdRum.stopView('ViewKey', Date.now(), { 'custom.bar': 42 });
```

## Data Storage

### Android

Before data is uploaded to Datadog, it is stored in cleartext in your application's cache directory.
This cache folder is protected by [Android's Application Sandbox][3], meaning that on most devices
this data can't be read by other applications. However, if the mobile device is rooted, or someone
tempers with the linux kernel, the stored data might become readable.

### iOS

Before data is uploaded to Datadog, it is stored in cleartext in the cache directory (`Library/Caches`)
of your [application sandbox][4], which can't be read by any other app installed on the device.

[1]: https://app.datadoghq.com/rum/application/create
[2]: https://raw.githubusercontent.com/DataDog/dd-sdk-reactnative/main/docs/image_reactnative.png
[3]: https://source.android.com/security/app-sandbox
[4]: https://support.apple.com/guide/security/security-of-runtime-process-sec15bfe098e/web

## Shared precomputed response tests

The Flags module uses the JSON contract from [ffe-system-test-data](https://github.com/DataDog/ffe-system-test-data/tree/main/precomputed-assignments).
This keeps response behavior consistent across mobile SDKs. The snapshot is test data only.
It adds no runtime dependency and requires no Git submodule.

The generated snapshot is at `packages/core/src/flags/__tests__/fixtures/precomputed`. `SOURCE.json` records the source commit and file digests.
The runner discovers all nested JSON cases.
Adding a case requires an upstream fixture change and snapshot refresh. It requires no runner or filename-list change.
Missing or empty fixtures fail the suite. Shared `_include` and `_skip` fields describe API applicability.
Do not add local exclusions to hide failures.

Numeric getters use lossless conversion regardless of the `integer`, `float`, or `number` wire label.
Integer getters accept whole values within their native range. Double getters reject integer values that lose precision.
Fractional Integer reads, range overflow, and inexact conversions return `TYPE_MISMATCH`.
React Native exposes one Number getter. Its tests exclude cases that require a separate Integer getter or native integer precision.
The service keeps sending `number`. This work adds no numeric capability.

Upstream CI requires a generated obfuscated companion for each applicable plain fixture. It rejects missing, stale, or orphaned companions. Edit the plain case upstream and regenerate; do not maintain two sets of expectations. Dedicated malformed-encoding cases and fixed digest vectors remain separate.

Cases cover values, defaults, errors, reasons, variants, emission gates, duplicate evaluations, and numeric boundaries.
Obfuscation cases cover fixed digests, salts, Unicode, whitespace, malformed metadata, and plaintext event identity.
React Native has one Number getter. Cross-type Integer/Double cases are excluded by the shared contract. The suite checks the real decoder, public getters, and native tracking arguments. It does not validate native event serialization or delivery. Encoded responses are rejected because this decoder does not support key obfuscation.

Run from the repository root:

```sh
python3 ci/sync-precomputed-fixtures.py --verify
yarn jest --runInBand --runTestsByPath packages/core/src/flags/__tests__/CanonicalPrecomputed.test.ts
```

Refresh the snapshot from a reviewed upstream commit:

```sh
python3 ci/sync-precomputed-fixtures.py --ref <full-upstream-sha>
python3 ci/sync-precomputed-fixtures.py --check
```

The importer copies committed bytes, regenerates the index, and removes deleted cases.
It preserves Unity asset GUIDs where applicable. Do not edit imported JSON or its checksums.
Use `--source <local-checkout> --ref <commit>` to test an upstream fixture branch before publication.
`--verify` checks local integrity without networking. `--check` also compares the recorded upstream commit.

The weekly `Precomputed flag fixtures` workflow opens a draft update PR when fixture content changes.
It uses a short-lived token restricted to the default branch and this workflow.
It waits when an update PR is already open. Normal SDK CI must pass before merge.
Merge the upstream fixture contract before merging its consumer PRs.
The update workflow never merges or publishes an SDK release.

The JavaScript decoder preserves safe numeric serial IDs as bridge strings, including zero.
The Android bridge can forward them. The pinned iOS SDK (3.16.1) lacks serial-ID support.
End-to-end serial-ID parity on iOS requires a native SDK release and bridge update.
