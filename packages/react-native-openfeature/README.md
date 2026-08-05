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
import { CoreConfiguration, DatadogProvider, DdFlags } from '@datadog/mobile-react-native';
import { DatadogOpenFeatureProvider } from '@datadog/mobile-react-native-openfeature';
import { OpenFeature } from '@openfeature/react-sdk';

(async () => {
    // Follow the core Datadog SDK initialization guide.
    const config = new CoreConfiguration(
        // ...
    );
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
</DatadogProvider>
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

If you fetch a flag configuration yourself (for example a precomputed-assignments payload
cached on disk, delivered via your own service, or bundled with the app), use
`DatadogOfflineOpenFeatureProvider` instead of `DatadogOpenFeatureProvider`. It evaluates flags
and reports exposures exactly like the online provider, but **never fetches configuration from
the network** — you supply it with `setConfiguration`.

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

Recommended setup for a hybrid app that also uses other OpenFeature providers, hooks, or domains:

- **Bind the offline provider to a dedicated OpenFeature domain.** Set the helper context on that
  domain before provider registration. A domain with no context of its own inherits the global
  context.
- **Use a unique Datadog `clientName`** (`new DatadogOfflineOpenFeatureProvider({ clientName })`):
  separate OpenFeature domains otherwise share the same underlying `DdFlags.getClient('default')`, and
  an online provider on that shared client would discard the offline configuration.

`OpenFeature.clearContext(domain)` removes the domain context and uses the global context. If the
global context is empty or does not match a context-specific snapshot, the provider enters `ERROR`.
Call `OpenFeature.setContext(domain, matchingContext)` to recover. A global `clearContext()` supplies
`{}` to the provider; it does not restore the context in the configuration.

> **Note (startup order):** Load the configuration with `setConfiguration` _before_
> `setProviderAndWait`, as shown above. If you register the provider before any successful
> `setConfiguration`, it initializes to the `ERROR` state (there is nothing it can evaluate); loading a
> valid configuration afterwards recovers it to `READY`. **Do not use the non-awaiting
> `OpenFeature.setProvider(provider)` immediately followed by `setConfiguration`** — that ordering
> races (the pending initialization can **settle (reject)** after the recovery and overwrite the
> status back to `ERROR`). Configure first, or `await OpenFeature.setProviderAndWait(...)`.

This provider relies on the OpenFeature static-context lifecycle — the SDK owns the
`PROVIDER_RECONCILING`/`PROVIDER_CONTEXT_CHANGED` events on a context change — and requires
`@openfeature/web-sdk` `^1.8.0` (the version it is developed and verified against).

[1]: https://openfeature.dev/docs/reference/sdks/client/web/react/
[2]: https://docs.datadoghq.com/getting_started/feature_flags/
[3]: https://github.com/DataDog/dd-sdk-reactnative/tree/develop/packages/core
