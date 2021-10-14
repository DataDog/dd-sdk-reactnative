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
config.sampleRate = 80
// Optional: set the reported service name (by default, it'll use the package name / bundleIdentifier of your Android / iOS app respectively)
config.serviceName = "com.example.reactnative"

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

