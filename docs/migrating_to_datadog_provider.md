## Overview

## Change the configuration class

Change your configuration from a `DdSdkReactNativeConfiguration` to a `DatadogProviderConfiguration` instance:

```git
- const config = new DdSdkReactNativeConfiguration(
+ const config = new DatadogProviderConfiguration(
```

## Add the DatadogProvider

Wrap the content of your `App` component by a `DatadogProvider` component, passing it your configuration:

```javascript
// App.js

const config = new DatadogProviderConfiguration();
//...

export default function App() {
    return (
        <DatadogProvider configuration={config}>
            <Navigation />
        </DatadogProvider>
    );
}
```

## Remove call to DdSdkReactNative.initialize

Remove the call to `DdSdkReactNative.initialize` in your code.

## Special cases

### Adding a callback after the initialization

If you have a callback running after the initialization, you can pass it as a `onInitialization` prop to your `DatadogProvider`:

```javascript
export default function App() {
    return (
        <DatadogProvider
            configuration={config}
            onInitialization={() => callback()}
        >
            <Navigation />
        </DatadogProvider>
    );
}
```

### Delaying the initialization

See the [documentation on asynchronous initialization][1].

[1]: https://github.com/DataDog/dd-sdk-reactnative/blob/develop/docs/advanced_configuration.md#delaying-the-initialization
