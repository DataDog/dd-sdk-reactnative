# Datadog OpenFeature Provider for React Native

Use [OpenFeature][1] with [Datadog Feature Flags][2] to evaluate feature flags and send evaluation data to Datadog for analysis and experimentation.

OpenFeature is a vendor-neutral, community-driven specification and SDK for feature flagging. It provides a unified API for feature flag evaluation that works across different providers. This enables you to switch vendors or integrate multiple feature flag systems.

This package provides an OpenFeature-compatible provider that wraps Datadog's Feature Flags SDK.

## Setup

**Note**: This package is an integration for the [OpenFeature React SDK][1]. Install and set up the core [`@datadog/mobile-react-native`][3] SDK to start using Datadog Feature Flags.

To install with NPM, run:

```sh
npm install @datadog/mobile-react-native @datadog/mobile-react-native-openfeature @openfeature/react-sdk
```

To install with Yarn, run:

```sh
yarn add @datadog/mobile-react-native @datadog/mobile-react-native-openfeature @openfeature/react-sdk
```

## Usage

### Initialize the Datadog SDK and OpenFeature

Use the following example code snippet to initialize the Datadog SDK, enable the Feature Flags feature, and set up the OpenFeature provider.

```tsx
import {
    CoreConfiguration,
    DatadogProvider,
    DdFlags
} from '@datadog/mobile-react-native';
import { DatadogOpenFeatureProvider } from '@datadog/mobile-react-native-openfeature';
import { OpenFeature } from '@openfeature/react-sdk';

(async () => {
    // Follow the core Datadog SDK initialization guide.
    const config = new CoreConfiguration();
    // ...
    await DdSdkReactNative.initialize(config);

    // Enable Datadog Flags feature after the core SDK has been initialized.
    await DdFlags.enable();

    // Set the Datadog provider with OpenFeature.
    const provider = new DatadogOpenFeatureProvider();
    OpenFeature.setProvider(provider);
})();

// Alternatively, if using `<DatadogProvider />` for core SDK initialization.

<DatadogProvider
    configuration={coreConfiguration}
    onInitialized={async () => {
        await DdFlags.enable();

        const provider = new DatadogOpenFeatureProvider();
        OpenFeature.setProvider(provider);
    }}
>
    {/* ... */}
</DatadogProvider>;
```

After completing this setup, your app is ready for flag evaluation with OpenFeature.

> **Note**: Sending flag evaluation data to Datadog is automatically enabled when using the Feature Flags SDK. Provide `rumIntegrationEnabled` and `trackExposures` parameters to the `DdFlags.enable()` call to configure.

### Using the OpenFeature React SDK

For complete details on using the OpenFeature React SDK, including flag evaluation, evaluation context management, and advanced setup options, see the OpenFeature React SDK [documentation][1].

Short-form OpenFeature SDK usage example:

```tsx
import { OpenFeature, OpenFeatureProvider, useFlag } from '@openfeature/react-sdk';

function AppWithProviders() {
    // For advanced feature flag targeting based on current user or device.
    useEffect(() => {
        const user = { ... }; // Obtained from your authentication logic.

        OpenFeature.setContext({
            // User or anonymous ID for consistent feature flag evaluations.
            targetingKey: user.id,
            // Properties for more granular targeting.
            region: user.country
        });
    }, [])

    // Wrap your app with OpenFeatureProvider to allow flag evaluations throughout the app.
    return (
        <OpenFeatureProvider>
            <App />
        </OpenFeatureProvider>
    );
}

function App() {
    const { value: isNewFeatureEnabled } = useFlag('new-feature-enabled', false);

    return (
        <View>
            {isNewFeatureEnabled && <NewFeatureComponent />}

            {/* ... */}
        </View>
    )
}

export default AppWithProviders;
```

### Offline initialization

Use `DatadogOfflineOpenFeatureProvider` when your application supplies the flag configuration.
The provider does not fetch a configuration.
It evaluates flags and reports evaluations through the normal Datadog path.

```tsx
import { DdFlags } from '@datadog/mobile-react-native';
import {
    DatadogOfflineOpenFeatureProvider,
    configurationFromString,
    getPrecomputedContext
} from '@datadog/mobile-react-native-openfeature';
import { OpenFeature } from '@openfeature/react-sdk';

await DdFlags.enable();

const domain = 'offline-flags';
const configuration = configurationFromString(wire);
const context = getPrecomputedContext(configuration);

// A context-specific precomputed configuration must use its matching OpenFeature context.
if (context !== undefined) {
    await OpenFeature.setContext(domain, context);
}

const provider = new DatadogOfflineOpenFeatureProvider();
provider.setConfiguration(configuration);

// Set the provider after loading the configuration so it is ready with real flag values.
await OpenFeature.setProviderAndWait(domain, provider);

// Evaluate flags — no network request is made.
const client = OpenFeature.getClient(domain);
const isNewFeatureEnabled = client.getBooleanValue(
    'new-feature-enabled',
    false
);
```

`wire` must be the complete version `1` portable JSON envelope.
For rules, `rules.response` contains one base64 encoding of the raw UFC protobuf bytes.
Use standard base64.
The SDK delegates decoding to flagging-core and does not add a second stricter base64 validator.
Do not pass raw protobuf bytes to `configurationFromString`.
Do not put the UFC service JSON response in `rules.response`.
The provider does not fetch the UFC endpoint or build the portable envelope.
The customer or configuration distribution layer must supply that envelope.

Keep the original wire when it contains rules.
Do not use `configurationToString` to recreate a rules wire.
The parsed rules object does not contain the original protobuf payload.

Load the configuration before you set the provider.
The provider starts in `ERROR` when it has no usable configuration.
A later valid configuration can recover the provider.

Do not call the non-waiting `OpenFeature.setProvider` and then call `setConfiguration`.
The pending initialization can finish after the configuration load.
Use the order in the example.

A context-specific precomputed configuration is a **single-subject snapshot**. The effective
OpenFeature context must match the context that was used to compute the snapshot. Use
`getPrecomputedContext(configuration)` to get a detached copy through a supported API. Do not inspect
the parsed configuration or wire format. The helper does not call OpenFeature and does not change
provider state.

If a context-specific snapshot does not match the effective context, the provider enters the
OpenFeature **`ERROR`** state. Evaluations return their coded default values with
`errorCode: INVALID_CONTEXT`. Set the matching context to recover the provider to `READY`.

An empty context (`{}`) is a real OpenFeature context. It does not restore the context in the
configuration. An empty targeting key (`{ targetingKey: '' }`) is also a real context and is
different from a missing targeting key. A context-agnostic precomputed configuration has no
embedded context. `getPrecomputedContext` returns `undefined` for that configuration, and it can be
used with any effective context.

#### Rules-based offline configuration

A rules configuration can evaluate more than one context.
Call `OpenFeature.setContext` when the subject changes.
The provider evaluates the new context locally.
It does not make a native configuration request.

```tsx
const client = OpenFeature.getClient(domain);

await OpenFeature.setContext(domain, {
    targetingKey: 'user-a',
    country: 'US'
});
const valueForUserA = client.getBooleanValue('new-feature', false);

await OpenFeature.setContext(domain, {
    targetingKey: 'user-b',
    country: 'CA'
});
const valueForUserB = client.getBooleanValue('new-feature', false);
```

#### Precomputed offline configuration

A precomputed configuration is one snapshot for one context.
The effective OpenFeature context must match the embedded context.
Use `getPrecomputedContext` to obtain a supported copy and set it explicitly.

Do not set a different context for a precomputed-only configuration.
The provider cannot fetch a new snapshot.
It enters `ERROR` and returns coded defaults with `INVALID_CONTEXT`.

An empty string is a real targeting key.
It is not the same as an absent context.
Use `clearContext` to remove a domain context.
Remember that a cleared domain can inherit a non-empty global context.

#### Configuration with both branches

A configuration can contain precomputed data and rules data.
The provider uses this order for each resolution:

1. Use precomputed data when its context matches.
2. Otherwise, use valid rules data.
3. Otherwise, return the applicable configuration error.

#### Domains and client names

Use a dedicated OpenFeature domain for an offline provider.
Set the helper context on that domain before provider registration.
An OpenFeature domain with no context of its own inherits the global context.

Use a unique Datadog `clientName` for each online or offline provider.
Providers with the same client name share one `FlagsClient`.
An online request on that client removes the offline configuration.

Set an explicit domain context when the domain must not inherit global context changes.
`OpenFeature.clearContext(domain)` removes the domain context and restores global inheritance.
If the inherited global context cannot use the configuration, the provider enters `ERROR`.
A global `clearContext()` supplies `{}`; it does not restore the embedded context.

#### Rules configuration security

Treat a client rules configuration as public data.
Do not put secrets in flag names, variant values, attributes, regular expressions, salts, or metadata.
Salted hashes do not make low-entropy values confidential.
An attacker can test likely values offline.
Only load a rules configuration from a trusted source.
The rules evaluator uses JavaScript regular expressions without an execution limit.
A hostile expression can block the JavaScript thread.

This provider requires `@openfeature/web-sdk` `^1.8.0`.

[1]: https://openfeature.dev/docs/reference/sdks/client/web/react/
[2]: https://docs.datadoghq.com/getting_started/feature_flags/
[3]: https://github.com/DataDog/dd-sdk-reactnative/tree/develop/packages/core
