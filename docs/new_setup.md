<!-- Note: this file is temporary and should be integrated in the additional setup docs once that is merged -->

## Initializing asynchronously

If your app includes a lot of animations at its start, running code during these animations might delay them on some devices. We provide a simple way to delay the Datadog React Native SDK for RUM aynchronously.

Modify your configuration to set the `initializationMode` to `InitializationMode.ASYNC`:

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

All interactions with the RUM sdk (view tracking, actions, resources tracing, etc.) will still be recorded and kept in a queue to a limit of 50 events.

Logs won't be recorded and calling a `DdLogs` method before the actual initialization might break logging.

## Delaying the initialization

You may want to wait before initializing the SDK, for instance if you wish to use a different configuration based on the user role, or to fetch the configuration from a server.

We provide a way to auto-instrument your app from the start (automatically collecting user interactions, XHR resources and errors) and record up to 50 RUM events before initializing the SDK.

```js
import {
    DatadogProvider,
    DatadogProviderConfiguration,
    InitializationMode
} from '@datadog/mobile-react-native';

const datadogAutoInstrumentation = {
    trackErrors: true,
    trackInteractions: true,
    trackResources: true,
    firstPartyHosts: [''],
    resourceTracingSamplingRate: 100
};

const initializeApp = async () => {
    const configuration = await fetchDatadogConfiguration();
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

where your configuration has the following keys:

```js
const configuration = {
    clientToken: '<CLIENT_TOKEN>',
    env: '<ENVIRONMENT_NAME>',
    applicationId: '<RUM_APPLICATION_ID>',
    sessionSamplingRate: 80, // Optional: sample RUM sessions (here, 80% of session will be sent to Datadog). Default = 100%
    site: 'US1', // Optional: specify Datadog site. Default = 'US1'
    verbosity: SdkVerbosity.WARN, // Optional: let the SDK print internal logs (above or equal to the provided level). Default = undefined (no logs)
    serviceName: 'com.myapp', // Optional: set the reported service name. Default = package name / bundleIdentifier of your Android / iOS app respectively
    nativeCrashReportEnabled: true, // Optional: enable native crash reports. Default = false
    version, // Optional: overriding the reported version
    versionSuffix: 'codepush.v3' // Optional: adding a suffix to the reported version
};
```
