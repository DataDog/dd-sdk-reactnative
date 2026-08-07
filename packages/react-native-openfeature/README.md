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

### RUM user context

When RUM integration is enabled (the default), the online provider includes the user set through
`DdSdkReactNative.setUserInfo()` in the OpenFeature evaluation context. The RUM user ID supplies the
targeting key, while `name`, `email`, and flat string, number, or boolean `extraInfo` properties become
evaluation attributes. Fields set explicitly through `OpenFeature.setContext()` take precedence.

Set the RUM user before registering the provider:

```tsx
await DdSdkReactNative.setUserInfo({
    id: 'user-123',
    email: 'user@example.com',
    extraInfo: { company_name: 'Example, Inc.' }
});

await OpenFeature.setProviderAndWait(new DatadogOpenFeatureProvider());
```

If the RUM user changes after provider initialization, reconcile the provider with the latest user
while preserving explicitly configured OpenFeature properties:

```tsx
await OpenFeature.setContext(OpenFeature.getContext());
```

Nested RUM user properties are not included. Setting `rumIntegrationEnabled: false` in
`DdFlags.enable()` disables both RUM feature flag tracking and RUM user context enrichment. The
offline provider does not enrich its context because precomputed configurations are bound to their
embedded context.

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
    configurationFromString
} from '@datadog/mobile-react-native-openfeature';
import { OpenFeature } from '@openfeature/react-sdk';

await DdFlags.enable();

const provider = new DatadogOfflineOpenFeatureProvider();

// `wire` is a ConfigurationWire string you fetched yourself.
provider.setConfiguration(configurationFromString(wire));

// Set the provider after loading the configuration so it is ready with real flag values.
await OpenFeature.setProviderAndWait(provider);

// Evaluate flags — no network request is made.
const client = OpenFeature.getClient();
const isNewFeatureEnabled = client.getBooleanValue('new-feature-enabled', false);
```

The configuration carries the evaluation context it was computed for, and the provider adopts it
automatically. A precomputed configuration is a **single-subject snapshot**: it can only be served
against the context it was computed for. Per-context evaluation is a future (rules-based) capability.

> **Warning:** Do **not** call `OpenFeature.setContext` with a _different_ context for the offline
> precomputed flow. A runtime context that does not match the configuration's embedded context
> (compared after the SDK's context normalization, not raw deep-equality) cannot be served (offline
> never fetches), so the provider enters the OpenFeature **`ERROR`** state and evaluations fall back
> to your **coded default values** (evaluation `errorCode: INVALID_CONTEXT`). The provider recovers to
> `READY` once the effective context is empty or matches the snapshot again. Note that a blank
> `{ targetingKey: '' }` is **not** "empty" — an empty string is a real (anonymous) targeting key, a
> distinct subject that must match the snapshot; use `clearContext()` (or omit context) to fall back
> to the embedded context.

Recommended setup for a hybrid app that also uses other OpenFeature providers, hooks, or domains:

- **Bind the offline provider to a dedicated OpenFeature domain, and give that domain an explicit
  empty context** at registration (`OpenFeature.setContext(domain, {})`) — which this provider reads
  as "no override, use the embedded context". A domain with no context of its own **inherits the
  global context**, so a global `OpenFeature.setContext` (or a mismatching global context) would
  otherwise reach the provider and force it into `ERROR`.
- **Use a unique Datadog `clientName`** (`new DatadogOfflineOpenFeatureProvider({ clientName })`):
  separate OpenFeature domains otherwise share the same underlying `DdFlags.getClient('default')`, and
  an online provider on that shared client would discard the offline configuration.

Because you do not set an OpenFeature context, note the **context split**: OpenFeature hooks observe
the OpenFeature evaluation context (`{}` when unset), while Datadog exposure tracking attributes
evaluations to the configuration's embedded context.

> **Note (recovery caveat):** "clearing context recovers" holds only when the resulting *effective*
> context is empty or matches the snapshot. `OpenFeature.clearContext(domain)` removes the domain
> context and **falls back to the global context** — if that global context is non-empty and does not
> match, the provider stays in `ERROR`.

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
