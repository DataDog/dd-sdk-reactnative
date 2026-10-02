# Datadog OpenFeature Provider for React Native

Use [OpenFeature][1] with [Datadog Feature Flags][2] to evaluate feature flags and send evaluation data to Datadog for analysis and experimentation.

OpenFeature is a vendor-neutral, community-driven specification and SDK for feature flagging. It provides a unified API for feature flag evaluation that works across different providers. This enables you to switch vendors or integrate multiple feature flag systems.

This package provides an online provider backed by Datadog's Feature Flags SDK, a
`DatadogCoreProvider` for manually supplied JavaScript-evaluated configurations, optional
JavaScript tracking hooks for `DatadogCoreProvider`, and an offline compatibility provider that
delegates to `DatadogCoreProvider` while retaining native tracking.
`DatadogCoreProvider`, its tracking hooks, and the rules-based parser are exported from the
`@datadog/mobile-react-native-openfeature/rules-based` entry point, which keeps the protobuf rules
parser out of apps that do not use it.

## Setup

**Note**: This package is an integration for the [OpenFeature React SDK][1]. Install and set up the core [`@datadog/mobile-react-native`][3] SDK to use the native-backed providers. `DatadogCoreProvider` uses the same package dependencies but does not require Datadog SDK initialization or `DdFlags.enable()`.

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
import { CoreConfiguration, DatadogProvider, DdFlags, DdSdkReactNative } from '@datadog/mobile-react-native';
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

Use `enrichWithRumUser()` when you explicitly want to use the current RUM user as part of an
OpenFeature evaluation context. None of the Datadog OpenFeature providers enrich context automatically.
This keeps context changes visible through OpenFeature and avoids changing flag assignments unless
your application opts in.

The helper maps the RUM user ID to `targetingKey`. It maps `name`, `email`, and flat string, number,
or boolean `extraInfo` properties to evaluation attributes. Merge precedence is `extraInfo`,
then the RUM user's own identity fields, then the application context (highest precedence).
`targetingKey`, `name`, and `email` in `extraInfo` follow the same merge rules as other attributes;
these keys are not reserved to a particular source. The helper does not apply targeting-key-specific
validation: numeric or boolean values overwritten later in the merge do not trigger targeting-key
warnings. The final `targetingKey` must be a string (including an empty string). If a non-string value
reaches the Datadog Flags context-processing layer, it logs an SDK warning and uses the anonymous subject
(`''`) for evaluation and tracking, regardless of whether the value came from `extraInfo` or the
application. It does not fall back to a lower-precedence identity or rewrite OpenFeature's context.
Application values can therefore supply a different targeting key (for example, a device or session
ID). When enrichment succeeds, an application field set to `undefined` removes the
corresponding RUM value and is omitted from the returned context. Null-valued and nested RUM user
properties are not included. If no RUM user is set, including after `clearUserInfo()`, the helper
normalizes the application context without adding RUM values or logging a warning. Actual failures
to read the RUM user still produce an SDK warning.

> **Note:** Numeric evaluation attributes currently differ by platform: Android converts them to
> strings (for example, `42` can become `"42.0"` across the React Native bridge), while iOS preserves
> numeric values. For consistent cross-platform targeting, explicitly supply consistently formatted
> strings in the application context, or omit inherited numeric attributes with `undefined`.

If the core SDK's `__ddEnrichEvaluationContextWithRumUser` helper is missing or not callable,
`enrichWithRumUser()` logs a console warning and returns the original application context unchanged,
including any `undefined` fields.
OpenFeature initialization and evaluation can continue using the application's context without RUM
values. Update the core SDK to at least the OpenFeature package's version, check for duplicate
installs with `npm ls @datadog/mobile-react-native`, and ensure test mocks preserve the real module
exports (use `@datadog/mobile-react-native/jest` or spread `jest.requireActual`). The warning is
visible even when SDK verbosity is not configured.

Keep the original application-owned context and enrich it before passing it to OpenFeature.
Use the exported `EnrichableEvaluationContext` type to explicitly type contexts that contain
`undefined` values; the helper returns an OpenFeature `EvaluationContext`. The following examples
assume the core Datadog SDK has already been initialized, as shown above. Await `setUserInfo()` before
enriching: the new RUM user is available only after that promise resolves.

```tsx
import { DdFlags, DdSdkReactNative } from '@datadog/mobile-react-native';
import {
    DatadogOpenFeatureProvider,
    enrichWithRumUser
} from '@datadog/mobile-react-native-openfeature';
import type { EnrichableEvaluationContext } from '@datadog/mobile-react-native-openfeature';
import { OpenFeature } from '@openfeature/react-sdk';

// Keep the application-owned context; do not replace it with the enriched result.
const applicationContext: EnrichableEvaluationContext = {
    region: 'us-east-1',
    email: undefined // Omit the RUM email from the evaluation context.
};

const setUpFlags = async (): Promise<void> => {
    await DdFlags.enable();
    await DdSdkReactNative.setUserInfo({
        id: 'user-123',
        email: 'user@example.com',
        extraInfo: { company_name: 'Example, Inc.' }
    });

    await OpenFeature.setContext(enrichWithRumUser(applicationContext));
    await OpenFeature.setProviderAndWait(new DatadogOpenFeatureProvider());
};

void setUpFlags();
```

`enrichWithRumUser()` reads the RUM user when it is called; it does not establish a live connection
between RUM and OpenFeature. After a login or account switch, update the RUM user and enrich the
original application-owned context again. On logout, await `clearUserInfo()` before enriching;
`setUserInfo({ id: '' })` is a no-op and does **not** clear the previous user.

```tsx
import { DdSdkReactNative } from '@datadog/mobile-react-native';
import { enrichWithRumUser } from '@datadog/mobile-react-native-openfeature';
import type { EnrichableEvaluationContext } from '@datadog/mobile-react-native-openfeature';
import { OpenFeature } from '@openfeature/react-sdk';

// The same application-owned context as in the setup example.
const applicationContext: EnrichableEvaluationContext = {
    region: 'us-east-1',
    email: undefined
};

export const onLogin = async (): Promise<void> => {
    await DdSdkReactNative.setUserInfo({
        id: 'user-456',
        email: 'next@example.com'
    });
    await OpenFeature.setContext(enrichWithRumUser(applicationContext));
};

export const onLogout = async (): Promise<void> => {
    await DdSdkReactNative.clearUserInfo();
    // No RUM targeting key remains; the provider uses the anonymous subject ('').
    await OpenFeature.setContext(enrichWithRumUser(applicationContext));
};
```

Wire these handlers into your application's authentication flow after flag setup. This logout
example assumes the application context has no targeting key of its own; explicitly supplied
application values remain authoritative even after the RUM user is cleared.

Do not pass `OpenFeature.getContext()` back to `enrichWithRumUser()`. That context already contains
values from the previous RUM user, so those values would be treated as application-owned overrides
and could prevent the new RUM user from replacing them. Retain the original application context
separately, as shown above.

`rumIntegrationEnabled` only controls whether feature flag evaluation events are sent to RUM. It
does not enable or disable `enrichWithRumUser()`. For the offline provider, continue to follow the
precomputed configuration context requirements below.

#### Isolating RUM context with an OpenFeature domain

> **Warning:** The examples above use the global OpenFeature context. A global `setContext()` also
> reaches domain-bound providers that have no explicit domain context, including other vendors'
> providers. Use a dedicated domain if RUM user attributes should only reach the Datadog provider.

As an alternative to the global setup above, register an explicit context and provider on the same
domain. Put this setup in `featureFlags.ts`. This example uses the current RUM user; await any
`setUserInfo()` call first:

```tsx
import { DdFlags } from '@datadog/mobile-react-native';
import {
    DatadogOpenFeatureProvider,
    enrichWithRumUser
} from '@datadog/mobile-react-native-openfeature';
import { OpenFeature } from '@openfeature/react-sdk';

export const DATADOG_DOMAIN = 'datadog';
// Retain and export the application-owned context, not the enriched result.
export const applicationContext = { region: 'us-east-1', email: undefined };

export const setUpDatadogDomain = async (): Promise<void> => {
    await DdFlags.enable();
    await OpenFeature.setContext(
        DATADOG_DOMAIN,
        enrichWithRumUser(applicationContext)
    );
    await OpenFeature.setProviderAndWait(
        DATADOG_DOMAIN,
        new DatadogOpenFeatureProvider()
    );
};

// In your app bootstrap, await setUpDatadogDomain() after core SDK initialization.
```

Consumers must use the same domain: import `DATADOG_DOMAIN` from your setup module and use
`<OpenFeatureProvider domain={DATADOG_DOMAIN}>`, as in the React example below, or use
`OpenFeature.getClient(DATADOG_DOMAIN)` for a direct client. A client without a domain does not use
this domain's provider.

Pass `DATADOG_DOMAIN` to **every** subsequent context update as well:
`OpenFeature.setContext(DATADOG_DOMAIN, enrichWithRumUser(applicationContext))`. This includes both
login and logout handlers above and the `setContext()` call in the React example below. A global
update does not replace an explicit domain context, so omitting the domain would leave Datadog on
the previous user's context. On logout, set the re-enriched application context on the domain rather
than calling `clearContext(DATADOG_DOMAIN)`, which would resume inheriting the global context.

### Using the OpenFeature React SDK

For complete details on using the OpenFeature React SDK, including flag evaluation, evaluation context management, and advanced setup options, see the OpenFeature React SDK [documentation][1].

This example uses the dedicated Datadog domain and retained application context from
`featureFlags.ts` above. Await `setUpDatadogDomain()` after core SDK initialization and before
rendering the app.
Use domain-scoped login and logout handlers to re-enrich the context when the RUM user changes.
If you choose the global setup instead, omit the domain argument from context updates and the
`domain` prop from `OpenFeatureProvider` consistently.

```tsx
import { useEffect } from 'react';
import { enrichWithRumUser } from '@datadog/mobile-react-native-openfeature';
import { OpenFeature, OpenFeatureProvider, useFlag } from '@openfeature/react-sdk';
import { applicationContext, DATADOG_DOMAIN } from './featureFlags';

function AppWithProviders() {
    useEffect(() => {
        // Enrich the retained application context, never OpenFeature.getContext().
        void OpenFeature.setContext(
            DATADOG_DOMAIN,
            enrichWithRumUser(applicationContext)
        );
    }, []);

    // Use the same domain for flag evaluation and context updates.
    return (
        <OpenFeatureProvider domain={DATADOG_DOMAIN}>
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

### JavaScript evaluation with manual configuration

Use `DatadogCoreProvider` to evaluate manually supplied precomputed or rules-based configurations in
JavaScript. The provider does not fetch configuration or send exposure or RUM events. Your
application manages configuration delivery, storage, and updates. To send exposures, flag
evaluations, or RUM feature flag data, add the [tracking hooks](#tracking-with-javascript-hooks).

```tsx
import {
    DatadogCoreProvider,
    coreConfigurationFromString
} from '@datadog/mobile-react-native-openfeature/rules-based';
import { OpenFeature } from '@openfeature/react-sdk';

const provider = new DatadogCoreProvider();
// `wire` is a ConfigurationWire string delivered by your application.
// This parser supports both precomputed and rules-based configurations.
provider.setConfiguration(coreConfigurationFromString(wire));

// For precomputed data, supply the exact context the configuration was computed for.
// For rules, supply the context you want to evaluate locally.
const context = { targetingKey: 'user-123', country: 'US' };
await OpenFeature.setProviderAndWait('datadog-core', provider, context);

const client = OpenFeature.getClient('datadog-core');
const enabled = client.getBooleanValue('new-feature', false);

// Replace configuration whenever your application receives an update.
provider.setConfiguration(coreConfigurationFromString(updatedWire));
```

You can also supply a parsed `FlagsConfiguration` directly. Both entry points export this type.
`getConfiguration()` returns the supplied configuration, or `undefined` if no configuration is set.
Use `coreConfigurationFromString` for this provider, rather than the native offline provider's
precomputed-only `configurationFromString` helper.

- Matching precomputed data takes precedence over rules. If the context does not match, the
  evaluator uses rules when available. Otherwise, evaluation returns your coded default with
  `INVALID_CONTEXT`, or `PARSE_ERROR` if the rules could not be parsed.
- **Unlike `DatadogOfflineOpenFeatureProvider`, an empty OpenFeature context is literal.** It does
  not adopt the precomputed configuration's embedded context. Clearing a context can therefore
  make a precomputed-only provider enter `ERROR`. Use the same domain for registration,
  evaluations, and subsequent `OpenFeature.setContext('datadog-core', context)` calls.
- Load configuration before registering the provider. Missing configuration causes initialization to
  fail with `PROVIDER_NOT_READY`. Unusable configuration produces `PARSE_ERROR`. If initialization
  fails, wait for it to finish before loading a valid configuration.
- Replacing a usable configuration emits `ConfigurationChanged`. An unusable replacement emits
  `Error`. Loading a usable configuration after an error emits `Ready`, followed by
  `ConfigurationChanged`.

#### Tracking with JavaScript hooks

Compose the Datadog tracking hooks you need and register them with the OpenFeature client that uses
`DatadogCoreProvider`. The hooks run in JavaScript and do not use `DdFlags`:

- `createDatadogExposureLoggingHook(options)` sends exposures for logged allocations to Datadog.
  Exposures are deduplicated in memory per subject, flag, and assignment.
- `createDatadogEvaluationLoggingHook(options)` aggregates flag evaluations and sends them to
  Datadog every `flagEvaluationTrackingInterval` milliseconds (default `10000`, between `1000`
  and `60000`).
- `createDatadogRumTrackingHook()` adds evaluated variants to the active RUM view with
  `DdRum.addFeatureFlagEvaluation`. It requires an initialized Datadog SDK with RUM enabled.

```tsx
import {
    DatadogCoreProvider,
    composeDatadogTrackingHooks,
    coreConfigurationFromString,
    createDatadogEvaluationLoggingHook,
    createDatadogExposureLoggingHook,
    createDatadogRumTrackingHook
} from '@datadog/mobile-react-native-openfeature/rules-based';
import { OpenFeature } from '@openfeature/react-sdk';

const trackingOptions = {
    clientToken: '<CLIENT_TOKEN>',
    site: 'datadoghq.com',
    service: 'my-app',
    applicationId: '<RUM_APPLICATION_ID>'
};

const tracking = composeDatadogTrackingHooks(
    createDatadogExposureLoggingHook(trackingOptions),
    createDatadogEvaluationLoggingHook(trackingOptions),
    createDatadogRumTrackingHook()
);
await tracking.initialize();

const provider = new DatadogCoreProvider();
provider.setConfiguration(coreConfigurationFromString(wire));
await OpenFeature.setProviderAndWait('datadog-core', provider, context);

const client = OpenFeature.getClient('datadog-core');
client.addHooks(...tracking.hooks);

// When this client no longer needs tracking:
client.clearHooks();
await tracking.shutdown();
```

The exposure and evaluation hooks take their options directly; they do not read the configuration
given to `DdSdkReactNative`. Pass `proxy` to send events through a proxy, as
`<proxy>?ddforward=<intake path and parameters>`.

- The exposure and evaluation hooks do not track until `initialize()` resolves. `shutdown()` sends
  pending events and stops timers. Both methods are idempotent, failures do not interrupt flag
  evaluation, and initializing again after a shutdown resumes tracking with the same exposure
  deduplication.
- Events are sent in batches, and pending events are sent when the app leaves the foreground.
  Requests that fail are not retried.
- Replacing the provider configuration lets exposures for the new configuration through.
- RUM resource tracking ignores these requests. This requires `@datadog/mobile-react-native` from
  the same release; with an older version, the requests appear as RUM resources.
- Only add these hooks to clients that use `DatadogCoreProvider`. `DatadogOpenFeatureProvider` and
  `DatadogOfflineOpenFeatureProvider` already track through the native SDK, so the hooks would
  track their evaluations twice.

### Offline initialization

Use `DatadogOfflineOpenFeatureProvider` to evaluate manually supplied precomputed or rules-based
configurations with native exposure or RUM tracking. The provider does not fetch configuration;
supply it with `setConfiguration`. For evaluation without tracking, or with JavaScript tracking
hooks, use `DatadogCoreProvider`.

Rules-based evaluation requires `@datadog/mobile-react-native` and
`@datadog/mobile-react-native-openfeature` 3.10.0 or later. Update both packages together to use the
native tracking/evaluator bridge. With an older core SDK that lacks the bridge, precomputed
configurations retain their previous behavior, but rules configurations produce a warning and
`GENERAL` error rather than being silently ignored. A configuration that cannot be parsed reports
`PARSE_ERROR`, as `DatadogCoreProvider` does.

#### Rules-based configuration

Use `coreConfigurationFromString` from the `/rules-based` entry point to parse rules-based
configurations or configurations containing both precomputed data and rules.
`configurationFromString` supports only precomputed configurations. Rules are evaluated locally for
the current context, so you can change users or targeting attributes without fetching another
configuration:

```tsx
import { DdFlags } from '@datadog/mobile-react-native';
import { DatadogOfflineOpenFeatureProvider } from '@datadog/mobile-react-native-openfeature';
import { coreConfigurationFromString } from '@datadog/mobile-react-native-openfeature/rules-based';
import { OpenFeature } from '@openfeature/react-sdk';

await DdFlags.enable();
const domain = 'offline-rules';
const provider = new DatadogOfflineOpenFeatureProvider({ clientName: domain });
provider.setConfiguration(coreConfigurationFromString(rulesWire));
await OpenFeature.setProviderAndWait(domain, provider, {
    targetingKey: 'user-123',
    country: 'CA'
});
const client = OpenFeature.getClient(domain);
const initialValue = client.getBooleanValue('new-feature', false);

await OpenFeature.setContext(domain, { targetingKey: 'user-123', country: 'US' });
const updatedValue = client.getBooleanValue('new-feature', false);
```

Changing context can select a different rule and value. Successful evaluations are sent to the
native tracking path once, with the evaluated value, variant, allocation, and effective context.
The native SDK deduplicates exposures by subject, flag, allocation, and variant (and split serial ID
on Android). Replacing a configuration does not reset this deduplication.
Native `trackExposures` and `rumIntegrationEnabled` settings still apply. The named `FlagsClient`
shares the same evaluator, including when accessed directly with `DdFlags.getClient(domain)`.

For configurations containing both precomputed data and rules, matching precomputed data takes
precedence. The provider uses rules when the precomputed context does not match. If either part is
malformed, the provider can still use the valid part.
An empty effective context adopts the precomputed context when present. Without a context, rules have
no targeting key: an evaluation that reaches a shard on the targeting key returns
`TARGETING_KEY_MISSING`. Pass `targetingKey: ''` for an anonymous subject.

#### Precomputed configuration

The released precomputed-only setup remains supported:

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
against the context it was computed for. Use rules-based configuration, as shown above, for
per-context evaluation.

> **Warning:** Do **not** call `OpenFeature.setContext` with a _different_ context for the offline
> precomputed flow. A runtime context that does not match the configuration's embedded context
> (compared after the SDK's context normalization, not raw deep-equality) cannot be served (offline
> never fetches), so the provider enters the OpenFeature **`ERROR`** state and evaluations fall back
> to your **coded default values** (evaluation `errorCode: INVALID_CONTEXT`). The provider recovers to
> `READY` once the effective context is empty or matches the snapshot again. Note that a blank
> `{ targetingKey: '' }` is **not** "empty" — an empty string is a real (anonymous) targeting key, a
> distinct subject that must match the snapshot; use `clearContext()` (or omit context) to fall back
> to the embedded context.

Recommended precomputed-only setup for a hybrid app that also uses other OpenFeature providers,
hooks, or domains:

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
