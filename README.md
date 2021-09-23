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
    true, // track User interactions (e.g.: Tap on buttons).
    true, // track XHR Resources
    true // track Errors
)
// Optional: Select your Datadog website (one of "US", "EU" or "GOV")
config.site = "US"
// Optional: enable or disable native crash reports
config.nativeCrashReportEnabled = true
// Optional: sample RUM sessions (here, 80% of session will be sent to Datadog. Default = 100%)
config.sampleRate = 80

await DdSdkReactNative.initialize(config)

// Once SDK is initialized you need to setup view tracking to be able to see data in the RUM Dashboard.
```

### User interactions tracking

If user interactions tracking is enabled as in the code example above, the SDK traverses up the hierarchy of components starting from the component that received a tap, looking for `dd-action-name` property. Once found, it is used as a name for the action reported.

Alternatively, you can use the `accessibilityLabel` element property to give the tap action a name; otherwise, the element type is reported. You can check the sample app for usage examples.

### Track view navigation

Because React Native offers a wide range of libraries to create screen navigation, by default only manual view tracking is supported. You can manually start and stop a view using the following `startView()` and `stopView` methods.

```js
import { DdSdkReactNative, DdSdkReactNativeConfiguration, DdLogs, DdRum } from '@datadog/mobile-react-native';


// Start a view with a unique view identifier, a custom view url, and an object to attach additional attributes to the view
DdRum.startView('<view-key>', '/view/url', { 'custom.foo': "something" }, Date.now());
// Stops a previously started view with the same unique view identifier, and an object to attach additional attributes to the view
DdRum.stopView('<view-key>', { 'custom.bar': 42 }, Date.now());
```

Use one of Datadog's integrations to automatically track views if you're using the following libraries:

- If you use the [`react-native-navigation`][5] library, then add the `@datadog/mobile-react-native-navigation` package and follow the [setup instructions][6].
- If you use the [`react-navigation`][7] library, then add the `@datadog/mobile-react-navigation` package and follow the [setup instructions][8].

## Track custom attributes

You can attach user information to all RUM events to get more detailed information from your RUM sessions. 

### User information

For user-specific information, use the following code wherever you want in your app (after the SDK has been initialized). The `id`, `name`, and `email` attributes are built into Datadog, and you can add other attributes that makes sense for your app.

```js
DdSdkReactNative.setUser({
    id: "1337", 
    name: "John Smith", 
    email: "john@example.com", 
    type: "premium"
})
```

### Global attributes

You can also keep global attributes to track information about a specific session, such as A/B testing configuration, ad campaign origin, or cart status.

```js
DdSdkReactNative.setAttributes({
    profile_mode: "wall",
    chat_enabled: true,
    campaign_origin: "example_ad_network"
})
```

## Manual instrumentation

If automatic instrumentation doesn't suit your needs, you can manually create RUM Events and Logs:

```js
import { DdSdkReactNative, DdSdkReactNativeConfiguration, DdLogs, DdRum } from '@datadog/mobile-react-native';

// Initialize the SDK
const config = new DdSdkReactNativeConfiguration(
    "<CLIENT_TOKEN>",
    "<ENVIRONMENT_NAME>",
    "<RUM_APPLICATION_ID>",
    true, // track User interactions (e.g.: Tap on buttons)
    true, // track XHR Resources
    true // track Errors
)
DdSdkReactNative.initialize(config);

// Send logs (use the debug, info, warn or error methods)
DdLogs.debug("Lorem ipsum dolor sit amet…", {});
DdLogs.info("Lorem ipsum dolor sit amet…", {});
DdLogs.warn("Lorem ipsum dolor sit amet…", {});
DdLogs.error("Lorem ipsum dolor sit amet…", {});

// Track RUM Views manually
DdRum.startView('<view-key>', 'View Url', {}, Date.now());
//…
DdRum.stopView('<view-key>', { 'custom': 42 }, Date.now());

// Track RUM Actions manually
DdRum.addAction('TAP', 'button name', {}, Date.now());
// or in case of continuous action
DdRum.startAction('TAP', 'button name', {}, Date.now());
// to stop action above
DdRum.stopAction({}, Date.now());

// Add custom timings
DdRum.addTiming('<timing-name>');

// Track RUM Errors manually
DdRum.addError('<message>', 'source', '<stacktrace>', {}, Date.now());

// Track RUM Resource manually
DdRum.startResource('<res-key>', 'GET', 'http://www.example.com/api/v1/test', {}, Date.now());
//…
DdRum.stopResource('<res-key>', 200, 'xhr', {}, Date.now());

// Send spans manually
const spanId = await DdTrace.startSpan("foo", { 'custom': 42 }, Date.now());
//...
DdTrace.finishSpan(spanId, { 'custom': 21 }, Date.now());
```

## Resource timings

Resource tracking is able to provide the following timings:

* `First Byte` - The time between the scheduled request and the first byte of the response. This includes time for the request preparation on the native level, network latency, and the time it took the server to prepare the response.
* `Download` - The time it took to receive a response.

## Development mode

While in development mode, your application can submit extra events related to the React Native tooling, like code transformation errors, requests to a local development server, etc.

To prevent these events from showing in the dashboard, you can disable errors and resources tracking in dev mode, using the `__DEV__` flag:

```
const config = new DdSdkReactNativeConfiguration(
	CLIENT_TOKEN,
	ENVIRONMENT,
	APPLICATION_ID,
	true,
	!__DEV__  /* trackResources will be false in DEV mode, true otherwise */,
	!__DEV__  /* trackErrors will be false in DEV mode, true otherwise */,
	trackingConsent
)
```

## License

[Apache License, v2.0][9]

## Further Reading

{{< partial name="whats-next/whats-next.html" >}}

[1]: https://app.datadoghq.com/rum/application/create
[2]: https://raw.githubusercontent.com/DataDog/dd-sdk-reactnative/main/docs/image_reactnative.png
[3]: https://docs.datadoghq.com/account_management/api-app-keys/#api-keys
[4]: https://docs.datadoghq.com/account_management/api-app-keys/#client-tokens
[5]: https://github.com/wix/react-native-navigation
[6]: https://www.npmjs.com/package/@datadog/mobile-react-native-navigation
[7]: https://github.com/react-navigation/react-navigation
[8]: https://www.npmjs.com/package/@datadog/mobile-react-navigation
[9]: https://github.com/DataDog/dd-sdk-reactnative/blob/main/LICENSE
