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

We provide a way to auto-instrument your app (automatically collecting user interactions, XHR resources and errors) and record RUM events up to a limit of 50 events before initializing the SDK.

Modify your configuration to set the `initializationMode` to `InitializationMode.SKIP`, and initialize the SDK in your code using `DatadogProvider.initialize`:

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
datadogConfiguration.initializationMode = InitializationMode.SKIP;

const initializeApp = async () => {
    const configuration = await fetchDatadogConfiguration();
    await DatadogProvider.initialize(configuration);
};

export default function App() {
    useEffect(() => initializeApp(), []);

    return (
        <DatadogProvider configuration={datadogConfiguration}>
            <Navigation />
        </DatadogProvider>
    );
}
```
