# Migration Guide

This document outlines breaking changes and migration steps between major versions of the project.

## Migration from 3.12.x to 3.13.0

SDK `3.13.0` changes how the native Datadog SDKs are consumed and built. These changes raise the minimum supported versions of React Native and of the native toolchains. Your JavaScript code and SDK configuration do not change, but your app's native build environment must meet the new minimum requirements.

### New minimum requirements

| Requirement | Before `3.13.0` | From `3.13.0` | Reason |
| :--- | :--- | :--- | :--- |
| React Native | `0.63.4` | **`0.75`** | The native iOS SDK is resolved through Swift Package Manager, using React Native's `spm_dependency` podspec helper (first shipped in `0.75`). |
| iOS / tvOS deployment target | `12.0` | **`15.0`** | Required by `dd-sdk-ios` `3.21.0`. |
| Xcode | `16` | **`26`** | `dd-sdk-ios` `3.21.0` declares `swift-tools-version: 6.2`. |
| Expo | | **Expo SDK `52` or later** | First Expo SDK on React Native 0.75+ (0.76.9) |

The native SDK versions are also updated:

| Native SDK | Before `3.13.0` | From `3.13.0` |
| :--- | :--- | :--- |
| `dd-sdk-ios` | `3.16.1` (CocoaPods) | `3.21.0` (Swift Package Manager) |
| `dd-sdk-android` | `3.15.0` | `3.16.0` |

If your app runs React Native `0.74` or earlier, stay on `3.12.x` until you upgrade React Native.

**Use this prompt to have your AI coding agent attempt the migration for you:**
<details>
  <summary>Expand Prompt</summary>

```md
Migrate this React Native app's iOS build to Datadog React Native SDK 3.13.0, 
following the "Migration from 3.12.x to 3.13.0" section of 
https://github.com/DataDog/dd-sdk-reactnative/blob/3.13.0/MIGRATION.md

1. Check that React Native is 0.75 or later (Expo SDK 52 or later for Expo
apps) and that Xcode 26 or later is installed (`xcodebuild -version`).
If either is missing, stop and tell me. See "New minimum requirements".

2. Expo apps only: don't edit ios/Podfile, because `expo prebuild`
regenerates it, and skip steps 3 and 4. If the iOS deployment target is
below 15.0, raise it through the `ios.deploymentTarget` option of
`expo-build-properties`. If the app is one of the cases listed in
"fmt on Expo when building React Native from source", or ios/Podfile.lock
lists `fmt (11.`, add the `fmt` config plugin from that section now,
before you install the pods. See the "Expo" section.

3. Bare React Native apps only. In ios/Podfile: make sure the iOS
deployment target is 15.0 or later, remove any `pod 'Datadog...'` lines
for the native dd-sdk-ios modules, and remove post_install code that looks
up DatadogCore, DatadogRUM or other Datadog pod targets.
Keep `react_native_post_install`, and don't change anything unrelated to
Datadog. If you raise the deployment target, also raise it on the app
target in the Xcode project. If the Podfile builds the Datadog pods for
both iOS and tvOS targets, stop and tell me. Follow steps 1 to 4 of
"iOS: native SDK resolved through Swift Package Manager" and
"Limitation: one Podfile for iOS and tvOS".

4. Bare React Native apps only. If ios/Podfile.lock lists `fmt (11.`
(React Native 0.76.9 to 0.84, except 0.83.5 and later 0.83 releases),
add the `fmt` C++17 workaround from the guide to post_install, unless the
app uses prebuilt dependencies (`RCT_USE_RN_DEP=1`).
See "Known issues when moving to Xcode 26".

5. Search CI and fastlane files for PROVISIONING_PROFILE_SPECIFIER passed
on the xcodebuild command line, and show me where. Don't change CI files.
See "Code signing in CI".

6. Install the pods. For bare React Native apps, run `pod install` in ios/.
For Expo apps, run `npx expo prebuild --platform ios` and then
`pod install` in ios/: prebuild only runs CocoaPods when it creates ios/
or its template dependencies change. Then check that ios/Podfile.lock no longer lists DatadogCore, DatadogRUM
or the other dd-sdk-ios pods (the DatadogSDKReactNative* pods stay).

7. Build the app for the iOS Simulator and fix only errors
related to this migration. If you get one of the errors listed in
"Errors you can get during `pod install` or the build", apply the fix
given there. In an Expo app, if you get the `fmt` consteval error from
"Known issues when moving to Xcode 26", don't edit ios/Podfile: add the
config plugin from "fmt on Expo when building React Native from source",
then repeat step 6.

8. Tell me to commit the new
<YourApp>.xcworkspace/xcshareddata/swiftpm/Package.resolved file.
See "CI and network access".
```
</details>

### iOS: native SDK resolved through Swift Package Manager

Before `3.13.0`, the `DatadogSDKReactNative*` pods depended on the `dd-sdk-ios` pods (`DatadogCore`, `DatadogRUM`, `DatadogLogs`, `DatadogTrace`, `DatadogCrashReporting`, `DatadogFlags`, `DatadogSessionReplay`, `DatadogWebViewTracking`). From `3.13.0`, these pods are no longer installed. The Datadog pods still install through CocoaPods, but they get `dd-sdk-ios` from its Swift package (`https://github.com/DataDog/dd-sdk-ios.git`) through React Native's `spm_dependency` helper.

You still install the SDK with `pod install`. No new Podfile configuration is necessary in most apps. Do these steps:

1. **Check your deployment target.** React Native `0.76` and later (and Expo SDK `52` and later) already target iOS `15.1` by default through `min_ios_version_supported`, so most apps need no change. If you use React Native `0.75` (default `13.4`), or you lowered your deployment target below `15.0`, raise it to iOS `15.0` (and tvOS `15.0` if you build for tvOS) in your `Podfile`:

    ```ruby
    platform :ios, '15.0'
    ```

    Also set your app target's **iOS Deployment Target** to `15.0` or later in Xcode. Without this, `pod install` fails because the Datadog pods need a higher deployment target than your app.

2. **Use Xcode 26 or later**, locally and in CI.

3. **Remove Podfile code that configures the `dd-sdk-ios` pods.** The pod targets `DatadogCore`, `DatadogRUM`, `DatadogInternal` and so on no longer exist, so `post_install` code that looks them up fails. For example, remove snippets like this:

    ```ruby
    # Remove: these pod targets no longer exist from 3.13.0
    datadog_sdk_target = installer.pods_project.targets.detect { |t| ["DatadogCore", "DatadogRUM", ...].include?(t.name) }
    datadog_sdk_target.build_configurations.each do |config|
      ...
    end
    ```

    Also remove any direct `pod 'DatadogCore'`, `pod 'DatadogRUM'` (or other `dd-sdk-ios` pod) entries from your `Podfile`. The SDK now supplies these modules through Swift Package Manager.

4. **Keep `react_native_post_install` in your `post_install` hook.** It is in the default React Native template. The SDK extends React Native's Swift Package Manager post-install step to embed the `dd-sdk-ios` frameworks in your app. If this step does not run, Release and archived builds can crash at launch with `dyld: Library not loaded`.

5. **Run `pod install` again**, then build. Xcode resolves the Swift package when it first builds the project.

#### Pod linkage

Static linkage (the React Native default) and `use_frameworks!` (static or dynamic) are both supported. You do not need to change the `USE_FRAMEWORKS` or `use_frameworks!` setting.

#### CI and network access

The Swift package is fetched from GitHub when Xcode resolves packages, not from the CocoaPods trunk. Make sure your CI machines can reach `github.com`. If you cache dependencies in CI, also cache the Swift Package Manager checkouts (for example, the `SourcePackages` folder in your DerivedData path). Otherwise, every build downloads the package again.

Xcode writes the resolved package versions to `<YourApp>.xcworkspace/xcshareddata/swiftpm/Package.resolved`. Commit this file so that all builds use the same `dd-sdk-ios` version.

#### Limitation: one Podfile for iOS and tvOS

If one `Podfile` builds the Datadog pods for more than one platform (for example, an iOS app target and a tvOS app target), CocoaPods adds a platform suffix to the pod targets, and React Native's Swift Package Manager integration cannot find them. In this case `pod install` stops with an error:

```
Datadog: the native iOS SDK cannot be resolved through Swift Package Manager when one Podfile builds the Datadog pods for more than one platform.
```

Install the Datadog pods for one platform per `Podfile`.

#### Errors you can get during `pod install` or the build

| Error | Cause | Fix |
| :--- | :--- | :--- |
| `Specs satisfying the DatadogSDKReactNative … dependency were found, but they required a higher minimum deployment target.` | On RN 0.75 without the deployment target change, `pod install` fails. | Raise the deployment target to iOS 15.0 (see step 1 above). |
| `Could not resolve package dependencies` | With Xcode older than 26, `pod install` succeeds but the build fails at "Resolving Package Graph": dd-sdk-ios 3.19+ declares `swift-tools-version: 6.2`. | Build with Xcode 26 (see step 2 above). |
| `Datadog: the native iOS SDK is resolved through Swift Package Manager, which requires React Native >= 0.75` | Your React Native version does not have the `spm_dependency` helper. | Upgrade to React Native `0.75` or later, or stay on `3.12.x`. |
| `Datadog: could not find React Native's Swift Package Manager integration (SPM.apply_on_post_install)` | React Native's Swift Package Manager integration did not load. | Make sure your `Podfile` loads React Native's `react_native_pods.rb` script, as in the default template. |
| `Datadog: could not add the native iOS SDK frameworks to ...` | Your Podfile or a CocoaPods plugin changed the generated `[CP] Embed Pods Frameworks` script. | Remove the customization, or contact Datadog support. |

#### Known issues when moving to Xcode 26

**fmt on RN 0.76.9–0.84 (except 0.83.5 and later 0.83 releases)**

Not caused by the SDK, but you might encounter this issue when moving to Xcode 26:

```sh
call to consteval function 'fmt::basic_format_string<…>' is not a constant expression
```

React Native 0.76.9 - 0.84 build fmt 11.0.2 from source as C++20, and Xcode 26's clang rejects it. RN 0.75 to 0.76.8 (fmt 9.1.0), 0.83.5 and later 0.83 releases, and 0.85+ (fmt 12.1.0) aren't affected, nor are apps on prebuilt dependencies (`RCT_USE_RN_DEP=1`, the default since Expo 54 for new-architecture apps).

The workaround is compiling only the fmt pod as C++17 at the end of `post_install`:

```ruby
installer.pods_project.targets.each do |target|
  next unless target.name == 'fmt'
  target.build_configurations.each { |c| c.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17' }
end
```

If this workaround does not work in your setup, you can use the one in our example apps instead. It patches fmt's `base.h` header in `post_install` to turn off `consteval` on Xcode 26 and later, so it also covers other pods that include fmt headers. See the `post_install` hook in [`example/ios/Podfile`](https://github.com/DataDog/dd-sdk-reactnative/blob/develop/example/ios/Podfile#L75-L95).

#### Code signing in CI

If your CI archives the app by passing a provisioning profile to xcodebuild on the command line (for example `xcodebuild archive … PROVISIONING_PROFILE_SPECIFIER="My Profile"`, as some fastlane setups and custom scripts do), the archive now fails with an error like:

```
<target> does not support provisioning profiles
```

where `<target>` is one of the resource bundles of the Swift package, such as `Datadog_DatadogCore`.

**Why**: settings passed on the `xcodebuild` command line apply to every target in the build. That now includes the resource bundles Xcode creates for the dd-sdk-ios Swift package, and those bundles can't be signed with a provisioning profile.

**Fix**: set the provisioning profile on your app target only, not on the command line. Either set it in Xcode (your app target > Signing & Capabilities), or use a tool that changes only the app target, such as fastlane's `update_code_signing_settings` with targets: `["YourApp"]`.

Leave `PROVISIONING_PROFILE_SPECIFIER` out of the `xcodebuild` command.

### Expo

Apps that use [`expo-datadog`](https://github.com/DataDog/expo-datadog) need Expo SDK `52` or later (React Native `0.76` or later). `expo prebuild` generates a `Podfile` that already calls `react_native_post_install`, so the SDK itself needs no config plugin change. You must still meet the iOS deployment target and Xcode requirements above. To set the iOS deployment target in an Expo app, use the `ios.deploymentTarget` option of [`expo-build-properties`](https://docs.expo.dev/versions/latest/sdk/build-properties/).

#### fmt on Expo when building React Native from source

Expo apps that build fmt 11 from source can hit the fmt issue described in [Known issues when moving to Xcode 26](#known-issues-when-moving-to-xcode-26) with Xcode 26. This applies to:

- Expo SDK `52` and `53`: they always build React Native from source.
- Expo SDK `54`: only with the old architecture (`newArchEnabled: false`) or with `ios.buildReactNativeFromSource: true`.

Other Expo apps are not affected: they use React Native's prebuilt dependencies (`RCT_USE_RN_DEP=1`), or a React Native version that ships fmt 12 (`0.83.5` and later `0.83` releases, used by current Expo SDK `55`, and `0.85` and later, used by Expo SDK `56` and later). If you are not sure, look for `fmt (11.` in `ios/Podfile.lock`.

`expo prebuild` regenerates the `Podfile`, so do not edit it by hand. Apply the workaround with a config plugin instead. For example, this plugin copies a Ruby hook next to the generated `Podfile` and loads it from there. The hook compiles only the fmt 11 pod as C++17, after every other `post_install` hook has run:

```js
// plugins/withFmtXcode26Workaround.js
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

module.exports = config =>
    withDangerousMod(config, [
        'ios',
        async mod => {
            const iosRoot = mod.modRequest.platformProjectRoot;
            fs.copyFileSync(
                path.join(__dirname, 'fmt_xcode26_workaround.rb'),
                path.join(iosRoot, 'fmt_xcode26_workaround.rb')
            );
            const podfilePath = path.join(iosRoot, 'Podfile');
            const podfile = fs.readFileSync(podfilePath, 'utf-8');
            if (!podfile.includes('fmt_xcode26_workaround')) {
                fs.writeFileSync(
                    podfilePath,
                    `${podfile.trimEnd()}\n\nrequire_relative 'fmt_xcode26_workaround'\n`
                );
            }
            return mod;
        }
    ]);
```

```ruby
# plugins/fmt_xcode26_workaround.rb
unless Pod::Installer.method_defined?(:compile_fmt_as_cxx17)
  Pod::Installer.prepend(Module.new do
    def compile_fmt_as_cxx17
      fmt_pod = pod_targets.find { |target| target.pod_name == 'fmt' }
      return if fmt_pod.nil? || !fmt_pod.version.to_s.start_with?('11.')

      fmt_target = pods_project.targets.find { |target| target.name == fmt_pod.label }
      return if fmt_target.nil?

      fmt_target.build_configurations.each do |config|
        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
      end
    end

    def run_podfile_post_install_hooks
      result = super
      compile_fmt_as_cxx17
      result
    end
  end)
end
```

Then add the plugin to your app config:

```js
plugins: ['./plugins/withFmtXcode26Workaround']
```

The plugin only runs during `expo prebuild`, and `expo prebuild` does not always run CocoaPods on an existing `ios/` folder. After you add the plugin, run `npx expo prebuild --platform ios`, then `pod install` in `ios/`.

The hook does nothing when there is no fmt 11 pod, so it is safe to keep when you switch to prebuilt dependencies or upgrade React Native.

## Migration from 2.x to 3.0

This section describes the main changes introduced in SDK `3.0` compared to `2.x`.

### Core SDK Initialization changes

The configuration object used to initialize the SDK has seen some changes in its structure.
Feature configuration is now split into feature-specific properties: rumConfiguration, logsConfiguration, traceConfiguration.

Then, RUM, Logs and Trace can be independently configured via their optional configuration objects that are each represented by a property inside the core configuration object.

**NOTE: clientToken, environment and trackingConsent are mandatory for the Core SDK initialization. 
ApplicationID is mandatory for RUM to work.**

For instance, to configure the SDK and enable RUM, Logs and Trace you'd do the following:

```
const config = new CoreConfiguration(
    CLIENT_TOKEN,
    ENVIRONMENT,
    TrackingConsent.GRANTED,
    {
    rumConfiguration: {
        applicationId: APPLICATION_ID,
        trackInteractions: true,
        trackResources: true,
        trackFrustrations: true,
        sessionSampleRate: 100,
        telemetrySampleRate: 100
    }
    },
    logsConfiguration: {
        logEventMapper: (logEvent) => {
            logEvent.message = `[CUSTOM] ${logEvent.message}`;
            return logEvent;
        }
    },
    traceConfiguration: {}
);

...

await DdSdkReactNative.initialize(config);
```

Or if using the DatadogProvider wrapper:

```
const configuration = new DatadogProviderConfiguration(
    CLIENT_TOKEN,
    ENVIRONMENT,
    TrackingConsent.GRANTED,
    {
        batchSize: BatchSize.SMALL,
        uploadFrequency: UploadFrequency.FREQUENT,
        batchProcessingLevel: BatchProcessingLevel.MEDIUM,
        additionalConfiguration: {
            customProperty: "sdk-example-app"
        },
        rumConfiguration: {
            applicationId: APPLICATION_ID,
            trackInteractions: true,
            trackResources: true,
            trackErrors: true,
            sessionSampleRate: 100,
            nativeCrashReportEnabled: true
        },
        logsConfiguration: {
            logEventMapper: (logEvent) => {
                logEvent.message = `[CUSTOM] ${logEvent.message}`;
                return logEvent;
            }
        },
        traceConfiguration: {}
    }
);

...

<DatadogProvider configuration={configuration} onInitialization={onDatadogInitialization}>
```

**NOTE: Unlike v2.x, which would always enable all feature modules when initializing the SDK, v3 won't initialize nor enable a feature module if there's no configuration for it.**

### Property renames and relocations

| Property | New Location | Changes |
| :--- | :--- | :--- |
| `sampleRate` | *Removed* | Deprecated property removed. |
| `sessionSamplingRate` | `RumConfiguration` | Moved and renamed to `sessionSampleRate` |
| `resourceTracingSamplingRate` | `RumConfiguration` | Moved and renamed to `resourceTraceSampleRate`. |
| `proxyConfig` | `CoreConfiguration` | Renamed to `proxyConfiguration`. |
| `serviceName` | `CoreConfiguration` | Renamed to `service`. |
| `customEndpoints` | *Split* | Split into `customEndpoint` within `RumConfiguration`, `LogsConfiguration`, and `TraceConfiguration` |
| *New Property* | `CoreConfiguration` | `attributeEncoders` added. |
| *New Property* | `RumConfiguration` | `trackMemoryWarnings` added. |
| `nativeCrashReportEnabled` | `RumConfiguration` | Moved. |
| `nativeViewTracking` | `RumConfiguration` | Moved. |
| `nativeInteractionTracking` | `RumConfiguration` | Moved. |
| `firstPartyHosts` | `RumConfiguration` | Moved. Format changed from `(string \| FirstPartyHost)[]` to `FirstPartyHost[]`. |
| `telemetrySampleRate` | `RumConfiguration` | Moved. |
| `nativeLongTaskThresholdMs` | `RumConfiguration` | Moved. |
| `longTaskThresholdMs` | `RumConfiguration` | Moved. |
| `vitalsUpdateFrequency` | `RumConfiguration` | Moved. |
| `trackFrustrations` | `RumConfiguration` | Moved. |
| `trackBackgroundEvents` | `RumConfiguration` | Moved. |
| `bundleLogsWithRum` | `LogsConfiguration` | Moved. |
| `bundleLogsWithTraces` | `LogsConfiguration` | Moved. |
| `trackNonFatalAnrs` | `RumConfiguration` | Moved. |
| `appHangThreshold` | `RumConfiguration` | Moved. |
| `initialResourceThreshold` | `RumConfiguration` | Moved. |
| `trackWatchdogTerminations` | `RumConfiguration` | Moved. |
| `actionNameAttribute` | `RumConfiguration` | Moved. |
| `logEventMapper` | `LogsConfiguration` | Moved. |
| `errorEventMapper` | `RumConfiguration` | Moved. |
| `resourceEventMapper` | `RumConfiguration` | Moved. |
| `actionEventMapper` | `RumConfiguration` | Moved. |`TraceConfiguration`. |
| `useAccessibilityLabel` | `RumConfiguration` | Moved. |
| `trackInteractions` | `RumConfiguration` | Moved. |
| `trackResources` | `RumConfiguration` | Moved. |
| `trackErrors` | `RumConfiguration` | Moved. |

### `firstPartyHosts` format change

In v2, `firstPartyHosts` accepted an array of strings:

```typescript
const config = {
    firstPartyHosts: ['example.com', 'api.myapp.com']
};
```

In v3, `firstPartyHosts` has been moved to `rumConfiguration` and now requires an array of objects specifying the host and propagator types:

```typescript
import { PropagatorType } from '@datadog/mobile-react-native';

const config = new CoreConfiguration(
    CLIENT_TOKEN,
    ENVIRONMENT,
    TrackingConsent.GRANTED,
    {
        rumConfiguration: {
            applicationId: APPLICATION_ID,
            firstPartyHosts: [
                {
                    match: 'example.com',
                    propagatorTypes: [
                        PropagatorType.DATADOG,
                        PropagatorType.TRACECONTEXT
                    ]
                },
                {
                    match: 'api.myapp.com',
                    propagatorTypes: [PropagatorType.DATADOG]
                }
            ]
        }
    }
);
```

### FileBasedConfiguration changes

FileBasedConfiguration now requires a path to a configuration JSON file instead of trying to find a default `datadog-configuration.json` at the app's root level like it did on v2.

### Changes to SessionReplay configuration
defaultPrivacyLevel has been removed in favor of granular options: imagePrivacyLevel, touchPrivacyLevel and textAndInputPrivacyLevel.

### Fatal Errors are no longer reported as logs

Fatal Errors are no longer automatically reported as Logs. Fatal crashes will still be captured, but are no longer duplicated in Logs by default.

### Context / Attribute encoding
Context / attributes encoding is now safe and deterministic
 All attributes passed to Datadog SDK APIs are automatically sanitized and encoded:
Unsupported values (functions, symbols, non-finite numbers, etc.) are dropped with a warning to prevent crashes and undefined behavior
Common types (Date, Error, Map) are properly serialized
Nested objects are flattened using dot notation (a.b.c = value) to match native SDK expectations
Root-level primitives and arrays are wrapped under a context key for schema consistency
Custom encoders can be registered via the attributeEncoders configuration option for domain-specific types

### Android mindSdkVersion bumped to 23
Android's minSdkVersion has been bumped to 23.

### Resource Traces sampling aligned with RUM Sessions
Resource traces are now consistently sampled based on the active RUM session.
You may notice changes in the percentage of reported resources.

### JS Refresh rate normalization changes
JS refresh rate is now normalized to a 0–60 FPS range.

### RUM Session sampling changes
v3 modifies the logic to determine whether a trace should be sampled or not, by using the RUM Session ID first, before using the Trace sampling if no session can be found.

Consistent trace sampling based on RUM Session ID allows RUM clients and the backend to come to a the same decision about sampling without relying on randomness for each trace.

### Removed APIs

| API | Status |
| :--- | :--- |
| setUser | Removed in favor of setUserInfo. To completely remove userInfo please use the newly added clearUserInfo |
| setAttributes| Removed in favor of addAttributes | 

### Attributes API
The attribute API has been expanded allowing for addition and removal of single or batches of attributes in bulk.This can be performed with the new granular APIs:  addAttributes, removeAttributes, addAttribute and removeAttribute.

### New APIs

#### ViewAttributes

RUM View-level attributes are now automatically propagated to all related child events, including resources, user actions, errors, and long tasks. This ensures consistent metadata across events, making it easier to filter and correlate data on Datadog dashboards.

To manage View level attributes more effectively, new APIs were added:

```
addViewAttribute = (key: string, value: unknown)
removeViewAttribute = (key: string)
addViewAttributes = (attributes: Attributes)
removeViewAttributes = (keys: string[])
```

#### AccountInfo
The AccountInfo API from the native Datadog SDKs has been exposed to React Native as well:

```
setAccountInfo = async (accountInfo: {
    id: string;
    name?: string;
    extraInfo?: Record<string, unknown>;
})

clearAccountInfo = async ()

addAccountExtraInfo = async (extraAccountInfo: Record<string, unknown>)
```

#### Feature Operations

```
startFeatureOperation(
    name: string,
    operationKey: string | null,
    attributes: object
): Promise<void> 

succeedFeatureOperation(
    name: string,
    operationKey: string | null,
    attributes: object
): Promise<void> 

failFeatureOperation(
    name: string,
    operationKey: string | null,
    reason: FeatureOperationFailure,
    attributes: object
): Promise<void>
```

### New Navigation Tracking Options

v3 modifies the automatic navigation tracking modules for React Navigation and React Native Navigation and exposes a new NavigationTrackingOptions parameter through the startTracking/startTrackingViews function.

This `options` object allows to customize the view tracking logic via 3 new optional predicate functions:

- ViewNamePredicate - a custom naming predicates that decide the display name of views tracked by RUM.
- ViewTrackingPredicate - a custom predicate that decides if a view needs to be tracked by RUM or not.
- ParamsTrackingPredicate - a custom predicate that decides which navigation parameters (if any) need to be tracked alongside the view on RUM.

All of these are optional, and when not set the default behavior will be used for each one of them. The default behaviours are as follows:

- ViewNamePredicate - directly forwards the view given name to RUM.
- ViewTrackingPredicate - tracks all views on RUM.
- ParamsTrackingPredicate - does not forward any parameters to RUM.
