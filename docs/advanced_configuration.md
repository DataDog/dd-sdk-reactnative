## Overview

If you have not set up the SDK yet, follow the [in-app setup instructions][1] or refer to the [React Native RUM setup documentation][2].

## Manual instrumentation

If automatic instrumentation doesn't suit your needs, you can manually create RUM Events and Logs:

```javascript
import {
    DdSdkReactNative,
    DdSdkReactNativeConfiguration,
    DdLogs,
    ErrorSource,
    RumActionType,
    DdRum
} from '@datadog/mobile-react-native';

// Initialize the SDK
const config = new DdSdkReactNativeConfiguration(
    '<CLIENT_TOKEN>',
    '<ENVIRONMENT_NAME>',
    '<RUM_APPLICATION_ID>',
    true, // track user interactions (such as a tap on buttons)
    true, // track XHR resources
    true // track errors
);
DdSdkReactNative.initialize(config);

// Send logs (use the debug, info, warn, or error methods)
DdLogs.debug('Lorem ipsum dolor sit amet…', {});
DdLogs.info('Lorem ipsum dolor sit amet…', {});
DdLogs.warn('Lorem ipsum dolor sit amet…', {});
DdLogs.error('Lorem ipsum dolor sit amet…', {});

// Track RUM Views manually
DdRum.startView('<view-key>', 'View Name', {}, Date.now());
//…
DdRum.stopView('<view-key>', { custom: 42 }, Date.now());

// Track RUM Actions manually
DdRum.addAction(RumActionType.TAP, 'action name', {}, Date.now());
// Or in case of continuous action
DdRum.startAction(RumActionType.TAP, 'action name', {}, Date.now());
// To stop action above
DdRum.stopAction({}, Date.now());

// Add custom timings
DdRum.addTiming('<timing-name>');

// Track RUM Errors manually
DdRum.addError('<message>', ErrorSource.SOURCE, '<stacktrace>', {}, Date.now());

// Track RUM Resource manually
DdRum.startResource(
    '<res-key>',
    'GET',
    'http://www.example.com/api/v1/test',
    {},
    Date.now()
);
//…
DdRum.stopResource('<res-key>', 200, 'xhr', (size = 1337), {}, Date.now());

// Send spans manually
const spanId = await DdTrace.startSpan('foo', { custom: 42 }, Date.now());
//...
DdTrace.finishSpan(spanId, { custom: 21 }, Date.now());
```

## Resource timings

Resource tracking provides the following timings:

-   `First Byte`: The time between the scheduled request and the first byte of the response. This includes time for the request preparation on the native level, network latency, and the time it took the server to prepare the response.
-   `Download`: The time it took to receive a response.

## Initializing asynchronously

If your app includes a lot of animations when it starts, running code during these animations might delay them on some devices. To delay the Datadog React Native SDK for RUM to run after all current animations are started, set the `initializationMode` to `InitializationMode.ASYNC` in your configuration:

```js
import {
    DatadogProvider,
    DatadogProviderConfiguration,
    InitializationMode
} from '@datadog/mobile-react-native';

const datadogConfiguration = new DatadogProviderConfiguration(
    '<CLIENT_TOKEN>',
    '<ENVIRONMENT_NAME>',
    '<RUM_APPLICATION_ID>',
    true,
    true,
    true
);
datadogConfiguration.initializationMode = InitializationMode.ASYNC;

export default function App() {
    return (
        <DatadogProvider configuration={datadogConfiguration}>
            <Navigation />
        </DatadogProvider>
    );
}
```

This uses React Native's [InteractionManager.runAfterInteractions][3] to delay the animations.

All interactions with the RUM SDK (view tracking, actions, resources tracing, and so on) are still recorded and kept in a queue with a limit of 100 events.

Logs are not recorded and calling a `DdLogs` method before the actual initialization might break logging.

## Delaying the initialization

There may be situations where you want to wait before initializing the SDK. For example, when you want to use a different configuration based on the user role or to fetch the configuration from one of your servers.

In that case, you can auto-instrument your app from the start (automatically collect user interactions, XHR resources, and errors) and record up to 100 RUM and span events before initializing the SDK.

```js
import {
    DatadogProvider,
    DatadogProviderConfiguration
} from '@datadog/mobile-react-native';

const datadogAutoInstrumentation = {
    trackErrors: true,
    trackInteractions: true,
    trackResources: true,
    firstPartyHosts: [''],
    resourceTracingSamplingRate: 100
};

const initializeApp = async () => {
    const configuration = await fetchDatadogConfiguration(); // Fetches the configuration from one of your servers
    await DatadogProvider.initialize(configuration);
};

export default function App() {
    useEffect(() => initializeApp(), []);

    return (
        <DatadogProvider configuration={datadogAutoInstrumentation}>
            <Navigation />
        </DatadogProvider>
    );
}
```

Where your configuration has the following keys:

```js
import {
    ProxyConfig,
    SdkVerbosity,
    TrackingConsent
} from '@datadog/mobile-react-native';

const configuration = {
    clientToken: '<CLIENT_TOKEN>',
    env: '<ENVIRONMENT_NAME>',
    applicationId: '<RUM_APPLICATION_ID>',
    sessionSamplingRate: 80, // Optional: sample RUM sessions (here, 80% of session will be sent to Datadog). Default = 100%
    site: 'US1', // Optional: specify Datadog site. Default = 'US1'
    verbosity: SdkVerbosity.WARN, // Optional: let the SDK print internal logs (above or equal to the provided level). Default = undefined (no logs)
    serviceName: 'com.myapp', // Optional: set the reported service name. Default = package name / bundleIdentifier of your Android / iOS app respectively
    nativeCrashReportEnabled: true, // Optional: enable native crash reports. Default = false
    version: '1.0.0', // Optional: see overriding the reported version in the documentation. Default = VersionName / Version of your Android / iOS app respectively
    versionSuffix: 'codepush.v3', // Optional: see overriding the reported version in the documentation. Default = undefined
    trackingConsent: TrackingConsent.GRANTED, // Optional: disable collection if user has not granted consent for tracking. Default = TrackingConsent.GRANTED
    nativeViewTracking: true, // Optional: enables tracking of native views. Default = false
    proxyConfig: new ProxyConfig() // Optional: send requestst through a proxy. Default = undefined
};
```

## Further reading

{{< partial name="whats-next/whats-next.html" >}}

[1]: https://app.datadoghq.com/rum/application/create
[2]: https://docs.datadoghq.com/real_user_monitoring/reactnative
[3]: https://reactnative.dev/docs/interactionmanager#runafterinteractions
