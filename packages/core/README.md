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
// Optional: Select your Datadog website (one of "US", "EU" or "GOV")
config.site = "US"
// Optional: enable or disable native crash reports
config.nativeCrashReportEnabled = true
// Optional: sample RUM sessions (here, 80% of session will be sent to Datadog. Default = 100%)
config.sampleRate = 80

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

## Track custom attributes

You can attach user information to all RUM events to get more detailed information from your RUM sessions. 

### User information

For user-specific information, use the following code wherever you want in your app (after the SDK has been initialized). The `id`, `name`, and `email` attributes are built into Datadog, and you can add other attributes that makes sense for your app.

```js
import { DdSdkReactNative } from '@datadog/mobile-react-native';

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
import { DdSdkReactNative } from '@datadog/mobile-react-native';

DdSdkReactNative.setAttributes({
    profile_mode: "wall",
    chat_enabled: true,
    campaign_origin: "example_ad_network"
})
```

## Manual instrumentation

If automatic instrumentation doesn't suit your needs, you can manually create any type of events:

### RUM Events

In addition to manually creating Views (as mentioned above), you can also create custom Actions, Resources and Errors

```js
import { DdRum } from '@datadog/mobile-react-native';

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
```

### Logs

You can send custom log messages from anywhere in your application using the following commands:

```js
import { DdLogs } from '@datadog/mobile-react-native';

// Send logs (use the debug, info, warn or error methods) with object to attach additional attributes to the log
DdLogs.debug("Lorem ipsum dolor sit amet…", { 'custom': 42 });
DdLogs.info("Lorem ipsum dolor sit amet…", { 'custom': 42 });
DdLogs.warn("Lorem ipsum dolor sit amet…", { 'custom': 42 });
DdLogs.error("Lorem ipsum dolor sit amet…", { 'custom': 42 });
```

### Spans

You can use spans to trace local computation performance, using the following commands: 

```js
import { DdTrace } from '@datadog/mobile-react-native';

// Start a span with an object to attach additional attributes to the span
const spanId = await DdTrace.startSpan("<operation-name>", { 'custom.x': 42 }, Date.now());

// perform some computation...

// Stop the previously started span
DdTrace.finishSpan(spanId, { 'custom.y': 23 }, Date.now());
```

## Resource timings

Resource tracking is able to provide the following timings:

* `First Byte` - The time between the scheduled request and the first byte of the response. This includes time for the request preparation on the native level, network latency, and the time it took the server to prepare the response.
* `Download` - The time it took to receive a response.

## License

[Apache License, v2.0](LICENSE)

## Further Reading

{{< partial name="whats-next/whats-next.html" >}}

[1]: https://app.datadoghq.com/rum/application/create
[2]: https://raw.githubusercontent.com/DataDog/dd-sdk-reactnative/main/docs/image_reactnative.png
[3]: https://docs.datadoghq.com/account_management/api-app-keys/#api-keys
[4]: https://docs.datadoghq.com/account_management/api-app-keys/#client-tokens
