# React-Native Monitoring

Datadog *Real User Monitoring (RUM)* enables you to visualize and analyze the real-time performance and user journeys of your application’s individual users.

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

**Note**: Versions `1.0.0-rc5` and above require having `compileSdkVersion = 31` in your app setup for Android, and this requirement also implies
 that Build Tools version 31+, Android Gradle Plugin 7+ and Gradle 7+ should be used. You can modify the versions used by changing the values in the `buildscript.ext` block of your app's top-level `build.gradle` file. Having React Native version `0.67+` is also recommended.

### Specify application details in UI

1. In the [Datadog app][1], select **UX Monitoring > RUM Applications > New Application**.
2. Choose `react-native` as your Application Type.
3. Provide a new application name to generate a unique Datadog application ID and client token.

![image][2]

To ensure the safety of your data, you must use a client token. You cannot use only [Datadog API keys][3] to configure the `@datadog/mobile-react-native` library, because they would be exposed client-side. For more information about setting up a client token, see the [Client Token documentation][4].

### Initialize the library with application context

```js
import { DdSdkReactNative, DdSdkReactNativeConfiguration } from '@datadog/mobile-react-native';


const config = new DdSdkReactNativeConfiguration(
    "<CLIENT_TOKEN>",
    "<ENVIRONMENT_NAME>",
    "<RUM_APPLICATION_ID>",
    true, // track User interactions (e.g.: Tap on buttons. You can use 'accessibilityLabel' element property to give tap action the name, otherwise element type will be reported)
    true, // track XHR Resources
    true // track Errors
)
// Optional: Select your Datadog website (one of "US1", "US3", "US5", EU1", or "US1_FED"). Default is "US1".
config.site = "US1"
// Optional: enable or disable native crash reports
config.nativeCrashReportEnabled = true
// Optional: sample RUM sessions (here, 80% of session will be sent to Datadog. Default = 100%)
config.sessionSamplingRate = 80
// Optional: sample tracing integrations between between your app and backend (here, 80% of calls to your instrumented backend will be linked from the RUM view to the APM view. Default = 20%)
config.tracingSamplingRate = 80
// Optional: set the reported service name (by default, it'll use the package name / bundleIdentifier of your Android / iOS app respectively)
config.serviceName = "com.example.reactnative"
// Optional: let the SDK print internal logs (above or equal to the provided level. Default = undefined (meaning no logs))
config.verbosity = SdkVerbosity.WARN

await DdSdkReactNative.initialize(config)

// Once SDK is initialized you need to setup view tracking to be able to see data in the RUM Dashboard.
```

### Track view navigation

Because React Native offers a wide range of libraries to create screen navigation, by default only manual View tracking is supported. You can manually start and stop a View using the following `startView()` and `stopView` methods.


```js
import { DdSdkReactNative, DdSdkReactNativeConfiguration, DdLogs, DdRum } from '@datadog/mobile-react-native';


// Start a view with a unique view identifier, a custom view url, and an object to attach additional attributes to the view
DdRum.startView('<view-key>', '/view/url', Date.now(), { 'custom.foo': "something" });
// Stops a previously started view with the same unique view identifier, and an object to attach additional attributes to the view
DdRum.stopView('<view-key>', Date.now(), { 'custom.bar': 42 });
```

## Data Storage

### Android

Before data is uploaded to Datadog, it is stored in cleartext in your application's cache directory.
This cache folder is protected by [Android's Application Sandbox][3], meaning that on most devices
this data can't be read by other applications. However, if the mobile device is rooted, or someone
tempers with the linux kernel, the stored data might become readable.

### iOS

Before data is uploaded to Datadog, it is stored in cleartext in the cache directory (`Library/Caches`)
of your [application sandbox](4), which can't be read by any other app installed on the device.

[1]: https://app.datadoghq.com/rum/application/create
[2]: https://raw.githubusercontent.com/DataDog/dd-sdk-reactnative/main/docs/image_reactnative.png
[3]: https://source.android.com/security/app-sandbox
[4]: https://support.apple.com/guide/security/security-of-runtime-process-sec15bfe098e/web