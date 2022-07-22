## Overview

The RUM React Native SDK supports Expo and Expo Go. To use it, install and import from `expo-datadog` instead of `@datadog/mobile-react-native`.

Datadog recommends using **Expo SDK 45** as a minimum version; previous versions may require manual steps.

## Setup

To install with NPM, run:

```sh
npm install expo-datadog
```

To install with Yarn, run:

```sh
yarn add expo-datadog
```

### Initialize the library with application context

```js
import { DdSdkReactNative, DdSdkReactNativeConfiguration } from 'expo-datadog';

const config = new DdSdkReactNativeConfiguration(
    '<CLIENT_TOKEN>',
    '<ENVIRONMENT_NAME>',
    '<RUM_APPLICATION_ID>',
    true, // track User interactions (e.g.: Tap on buttons. You can use 'accessibilityLabel' element property to give tap action the name, otherwise element type will be reported)
    true, // track XHR Resources
    true // track Errors
);
// Optional: Select your Datadog website (one of "US1", "US3", "US5", EU1", or "US1_FED"). Default is "US1".
config.site = 'US1';
// Optional: enable or disable native crash reports
config.nativeCrashReportEnabled = true;
// Optional: sample RUM sessions (here, 80% of session will be sent to Datadog. Default = 100%)
config.sessionSamplingRate = 80;
// Optional: sample tracing integrations for network calls between your app and your backend (here, 80% of calls to your instrumented backend will be linked from the RUM view to the APM view. Default = 20%)
// You need to specify the hosts of your backends to enable tracing with these backends
config.resourceTracingSamplingRate = 80;
config.firstPartyHosts = ['example.com']; // matches 'example.com' and subdomains like 'api.example.com'
// Optional: let the SDK print internal logs (above or equal to the provided level. Default = undefined (meaning no logs))
config.verbosity = SdkVerbosity.WARN;

await DdSdkReactNative.initialize(config);

// Once SDK is initialized you need to setup view tracking to be able to see data in the RUM Dashboard.
```

### Error Tracking

If you enable error tracking, you will have to upload sourcemaps and other mapping files in order to see meaningful errors.

This can be done automatically thanks to our config plugin.
To add it, add `expo-datadog` to your plugins in your `app.json`:

```json
{
    "expo": {
        "plugins": ["expo-datadog"]
    }
}
```

Run `eas secret:create` to set `DATADOG_API_KEY` and `DD_API_KEY` to your datadog API key, and `DATADOG_SITE` to the host of your Datadog site (e.g. `datadoghq.com`).

#### Config plugin setup (optional)

You can disable the upload of some files by setting the `iosDsyms`, `iosSourcemaps`, `androidProguardMappingFiles` or `androidSourcemaps` parameters to `false`. You can also specify your Datadog site.

```json
{
    "expo": {
        "plugins": [
            [
                "expo-datadog",
                {
                    "iosDsyms": false,
                    "site": "EU1"
                }
            ]
        ]
    }
}
```

| Parameter                     | Default | Description                                                                                                                          |
| ----------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `iosDsyms`                    | `true`  | Enables the upload dSYMS files for the symbolication of native iOS crashes.                                                          |
| `iosSourcemaps`               | `true`  | Enables the upload of JavaScript source maps on iOS builds.                                                                          |
| `androidProguardMappingFiles` | `true`  | Enables the upload of Proguard mapping files to deobfuscate native Android crashes (will only be applied if obfuscation is enabled). |
| `androidSourcemaps`           | `true`  | Enables the upload of JavaScript source maps on Android builds.                                                                      |
| `site`                        | `US1`   | Your Datadog site (one of "US1", "US3", "US5", EU1", or "US1_FED"). Has to match the value used to initialize the Datadog SDK.       |

**N.B.**: Because of difference in the implementation of the different plugings, you need to specify the site both as an environment secret and as a config plugin parameter.

## Expo Go

If you are using Expo Go, switch to development builds (recommended), or keep using Expo Go without Datadog while having it run on your standalone application (not recommended).

### Switch from Expo Go to development builds

Your application's [development builds][3] are debug builds that contain the `expo-dev-client` package.

1. Enable the [custom native code to run][4] with `expo run:android` and `expo run:ios`.
2. To start using your development application, run `expo install expo-dev-client` and `expo start --dev-client`. This installs and starts the [`expo-dev-client` package][5] to execute the added native code in dev mode.

### Develop with Expo Go

When your application runs inside of Expo Go, you are unable to add any custom native code that is not part of the Expo Go application. Because the RUM React Native SDK relies on some custom native code to run, you can develop your application inside Expo Go without Datadog, and use Datadog in your standalone builds.

Your application crashes in Expo Go when some native code (that is not included) is called. To use Datadog with your standalone application and continue using Expo Go in development, add the following TypeScript file to your project:

```typescript
// mockDatadog.ts
// Datadog does not recommend this approach, consider moving to Expo development builds instead.
// This file is not officially maintained and might not be up-to-date with new releases.

import { DdLogs, DdTrace, DdRum, DdSdkReactNative } from 'expo-datadog';

if (__DEV__) {
    const emptyAsyncFunction = () => new Promise<void>(resolve => resolve());

    DdLogs.debug = emptyAsyncFunction;
    DdLogs.info = emptyAsyncFunction;
    DdLogs.warn = emptyAsyncFunction;
    DdLogs.error = emptyAsyncFunction;

    DdTrace.startSpan = () =>
        new Promise<string>(resolve => resolve('fakeSpanId'));
    DdTrace.finishSpan = emptyAsyncFunction;
    DdRum.startView = emptyAsyncFunction;
    DdRum.stopView = emptyAsyncFunction;
    DdRum.startAction = emptyAsyncFunction;
    DdRum.stopAction = emptyAsyncFunction;
    DdRum.addAction = emptyAsyncFunction;
    DdRum.startResource = emptyAsyncFunction;
    DdRum.stopResource = emptyAsyncFunction;
    DdRum.addError = emptyAsyncFunction;
    DdRum.addTiming = emptyAsyncFunction;

    DdSdkReactNative.initialize = emptyAsyncFunction;
    DdSdkReactNative.setUser = emptyAsyncFunction;
    DdSdkReactNative.setAttributes = emptyAsyncFunction;
    DdSdkReactNative.setTrackingConsent = emptyAsyncFunction;
}
```

Then, import it before initializing the SDK:

```typescript
import './mockDatadog';
import { DdSdkReactNative } from 'expo-datadog';

const config = new DdSdkReactNativeConfiguration(/* your config */);
DdSdkReactNative.initialize(config);
```

## Further Reading

{{< partial name="whats-next/whats-next.html" >}}

[1]: https://github.com/DataDog/dd-sdk-reactnative/releases/tag/1.0.0-rc9
[2]: https://docs.datadoghq.com/real_user_monitoring/reactnative/#setup
[3]: https://docs.expo.dev/development/introduction/
[4]: https://docs.expo.dev/workflow/customizing/#releasing-apps-with-custom-native-code-to
[5]: https://docs.expo.dev/development/getting-started/
