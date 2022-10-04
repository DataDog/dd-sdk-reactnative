# Hybrid applications

## Overview

You can use Datadog on the same application both from the React Native and the native sides.

RUM Events will be reported as coming from the same application and the same source in Datadog RUM.

## Constraints

A few constraints to keep in mind:

1. You cannot initialize more than 1 instance of the native `DatadogSDK` as it uses a singleton pattern on the native side. That means that once you initialize the native SDK on the native side or on the RN side (by calling `DdSdkReactNative.initialize`) it is configured for both.
2. If you try to report Datadog RUM events or logs before the initialization on iOS, future RUM events and logs won't be sent.
3. For **errors, resources and interactions tracking**, SDKs can work in 2 ways: through auto-instrumentation (some React classes and methods are modified to automate this) or through manual instrumentation - for instance if you want to report something you consider an error but that is not going to crash the app. Auto-instrumentation for JS errors, resources and interactions can only be started from javascript code.
4. You cannot change the `source` attribute of a RUM session, so all your RUM events will appear under the same source.

## Solutions

### Recommended: initialize the SDK on the React Native side only

Initialize the React Native Datadog SDK for RUM, by following the [official documentation][1].

This will also initialize the SDK on the native side. You are able to call the native SDKs for logs, traces and RUM.

If you are sure that you don't call the native SDK before the React Native SDK this is the solution we recommend.

#### Potential issues

**You cannot call the native SDK before the React Native SDK has been initialized.**

You can mitigate it by creating a queue on the native side to check if the SDK has been initialized before calling it, saving events with their timestamps to replay them once the SDK has been initialized.

### Initialize the SDK on the native side

Initialize the SDK on the native side, by using the official documentation [for iOS][2] and [for Android][3].

If you have to call the native SDK before the React Native SDK and don't need the auto instrumentation for JavaScript errors, resources nor user interactions you can initialized the SDK on the native side only.

#### Potential issues

**You won't have auto instrumentation for JS errors, resources or interactions.**

You can mitigate this by starting the auto instrumentation yourself. You can do so by copying [what the `enableFeatures` function does][4] at the start of your React Native application.

You will have to use imports to the full path to some of the files (e.g. `import {DdRumErrorTracking} from '@datadog/mobile-react-native/src/rum/instrumentation/DdRumErrorTracking';`), be aware the path to these files might change across SDK versions.

### Initialize the SDK on both sides

Initialize first the native SDK, then the React Native SDK to get auto-instrumentation on React Native user interactions, errors and ressources.

The configuration that will be used will be the one of the native SDK, with the exception of the `firstPartyHosts` and `resourceTracingSamplingRate` that are used for tracing integrations for JavaScript network calls between your app and your backend.
If you want to have this integration both from the native and the React Native sides, make sure you set these to the same values.

[1]: https://docs.datadoghq.com/real_user_monitoring/reactnative/
[2]: https://docs.datadoghq.com/real_user_monitoring/ios/
[3]: https://docs.datadoghq.com/real_user_monitoring/android/
[4]: https://github.com/DataDog/dd-sdk-reactnative/blob/develop/packages/core/src/DdSdkReactNative.tsx#L184
