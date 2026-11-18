# Datadog OpenFeature Provider for React Native

Use [OpenFeature][1] with [Datadog Feature Flags][2] to evaluate feature flags and send evaluation data to Datadog for analysis and experimentation.

OpenFeature is a vendor-neutral, community-driven specification and SDK for feature flagging. It provides a unified API for feature flag evaluation that works across different providers. This enables you to switch vendors or integrate multiple feature flag systems.

This package provides an online provider backed by Datadog's Feature Flags SDK, a
`DatadogCoreProvider` for manually supplied JavaScript-evaluated configurations, and an offline
compatibility provider that delegates to `DatadogCoreProvider` while retaining native tracking.
`DatadogCoreProvider` and the rules-based parser are exported from the
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

For native-backed providers, configure custom intake routing with
`customExposureEndpoint` and `customEvaluationEndpoint` on `DdFlags.enable()`.
Both accept base URLs; the bridge appends `/api/v2/exposures` and
`/api/v2/flagevaluation`, respectively. RUM's endpoint is configured separately
when initializing RUM. These overrides do not change configuration fetching.

### Reserved context attribute

`dd_assignment_token` is reserved for assignment authorization, not flag targeting.
The OpenFeature providers exclude it from context matching and native tracking,
without changing the application's context. For the offline compatibility provider,
a context containing only this token is treated as empty and adopts the snapshot's
embedded context.

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
application manages configuration delivery, storage, and updates.

```tsx
import {
    DatadogCoreProvider,
    configurationFromString
} from '@datadog/mobile-react-native-openfeature/rules-based';
import { OpenFeature } from '@openfeature/react-sdk';

const provider = new DatadogCoreProvider();
// `wire` is a ConfigurationWire string delivered by your application.
// This parser supports both precomputed and rules-based configurations.
provider.setConfiguration(configurationFromString(wire));

// For precomputed data, supply the exact context the configuration was computed for.
// For rules, supply the context you want to evaluate locally.
const context = { targetingKey: 'user-123', country: 'US' };
await OpenFeature.setProviderAndWait('datadog-core', provider, context);

const client = OpenFeature.getClient('datadog-core');
const enabled = client.getBooleanValue('new-feature', false);

// Replace configuration whenever your application receives an update.
provider.setConfiguration(configurationFromString(updatedWire));
```

You can also supply a parsed `FlagsConfiguration` directly. Both entry points export this type.
`getConfiguration()` returns the supplied configuration, or `undefined` if no configuration is set.
Use `configurationFromString` from `/rules-based` for rules or mixed configurations.
`coreConfigurationFromString` remains an alias for this full parser.

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

### Portable configuration helpers

Both entry points export `configurationFromString`, `configurationToString`,
`getPrecomputedContext`, and the `FlagsConfigurationWire` type. The root entry parses and
serializes only precomputed data without loading protobuf. The `/rules-based` entry preserves
both precomputed data and rules. Both support plaintext v1 and encoded-key v2 configurations,
including retrieval metadata and evaluation options. Encoded keys affect lookup only; evaluate
and track flags using their original keys.

```tsx
import {
    configurationFromString,
    configurationToString,
    getPrecomputedContext
} from '@datadog/mobile-react-native-openfeature/rules-based';
import type { FlagsConfigurationWire } from '@datadog/mobile-react-native-openfeature/rules-based';

const configuration = configurationFromString(wire);
const savedWire: FlagsConfigurationWire = configurationToString(configuration);
const snapshotContext = getPrecomputedContext(configuration);
```

`getPrecomputedContext` returns a detached copy, or `undefined` when there is no embedded
precomputed context. It does not update OpenFeature. For `DatadogCoreProvider`, supply that
context explicitly when serving a snapshot. The offline provider adopts it when the effective
OpenFeature context is empty. Malformed wires and unsupported encodings produce parse errors;
a valid rules branch remains available when a precomputed branch cannot be parsed.

The root parser now validates response envelopes, embedded contexts, and flag values, matching
the `/rules-based` parser. Hand-built wires accepted by the previous JSON-only root parser may
now fail validation: `createdAt` is required, `targetingKey` must be a string when present, and
object-typed flags must contain object values. Invalid flags are isolated from valid flags.
The native SDK's legacy codec is unchanged. To load a configuration directly into a native
`FlagsClient`, parse it with `configurationFromString` from `@datadog/mobile-react-native`.

### Fetching rules configuration

Use `fetchRulesConfiguration` from the `/rules-based` entry point to fetch client-distributed
rules and decode them into a `FlagsConfiguration`. It accepts `clientToken`, `env`, an optional
`applicationId`, site domain, `flagSelection`, `fetch` implementation, and `AbortSignal`.
The application ID is sent as `dd-application-id` for per-application usage attribution.
An optional `logger` receives selection diagnostics; the default writes `DATADOG:`-prefixed
console warnings. Fetching does not load or initialize the native SDK or require `DdFlags.enable()`.

The built-in fetch requires **React Native 0.72 or later** to read binary response bodies.
On RN 0.63-0.71, pass a fetch implementation whose `Response.arrayBuffer()` works. Earlier RN
versions leave `FileReader.readAsArrayBuffer()` unimplemented; the helper reports this limitation
with an actionable error and retains the original error as `cause`. It does not add a binary-read
polyfill or change the package's React Native peer dependency.

```tsx
import {
    DatadogCoreProvider,
    fetchRulesConfiguration
} from '@datadog/mobile-react-native-openfeature/rules-based';
import { OpenFeature } from '@openfeature/react-sdk';

const fetchOptions = {
    clientToken: '<CLIENT_TOKEN>',
    env: 'production',
    site: 'datadoghq.com',
    flagSelection: { tags: ['team:checkout'], keyPatterns: ['checkout-*'] }
};
const provider = new DatadogCoreProvider();
provider.setConfiguration(await fetchRulesConfiguration(fetchOptions));
await OpenFeature.setProviderAndWait('datadog-core', provider, {
    targetingKey: 'user-123', country: 'US'
});
const client = OpenFeature.getClient('datadog-core');
const enabled = client.getBooleanValue('checkout-new-flow', false);

// Context changes evaluate the loaded rules locally, without another request.
await OpenFeature.setContext('datadog-core', {
    targetingKey: 'user-456', country: 'CA'
});

// Refresh explicitly when the application needs new rules.
try {
    provider.setConfiguration(await fetchRulesConfiguration(fetchOptions));
} catch {
    // Keep evaluating the last successfully loaded rules.
}
```

The helper makes one request per call, with no automatic polling, retries, persistence, or tracking. It rejects on HTTP, network, cancellation, body-read, or decoding failures. The refresh example retains the active configuration when fetching fails. Use a client token; the helper only requests client-distributed configuration, never server-distributed rules.

`flagSelection` requests flags matching any of the listed tags or key patterns (OR). Tags are exact, case-sensitive matches; key patterns are case-sensitive and match the whole key, with `*` matching any run of characters. Values are trimmed using Unicode whitespace, deduplicated, and sorted by UTF-8 bytes. Each list accepts at most 31 distinct nonempty values after normalization, and each value can contain at most 200 UTF-8 bytes. Empty selections are omitted quietly.

Selection is best-effort: a malformed or over-limit selection, or one that makes the encoded request URL exceed 8,192 bytes, is not sent. The helper reports a diagnostic and requests the full configuration instead. A nonempty `DD-Flag-Selection-Ignored` response header also produces a diagnostic when a selection was sent. Supply `logger: { error(message) { /* route diagnostics */ } }` to customize reporting. Diagnostics do not initialize the native SDK or send telemetry, and a throwing logger does not prevent configuration loading.

When the backend applies selection, flags outside it are absent from the returned configuration. Evaluating them returns your default value with `FLAG_NOT_FOUND`, so select every flag the app evaluates. Selection is not an access-control boundary: the helper retains the full returned configuration if the server ignores selection and does not filter it locally.

`site` uses a domain such as `datadoghq.com` or `datadoghq.eu`, not the native SDK's `US1` or `EU1` identifiers. The default is `datadoghq.com`. Fetching and evaluation do not register tracking; use the hooks below when tracking is needed.

### Optional tracking with DatadogCoreProvider

Register exposure and RUM hooks independently with the evaluation-only
`DatadogCoreProvider`. Do not add these hooks to `DatadogOpenFeatureProvider` or
`DatadogOfflineOpenFeatureProvider`, which already track automatically.

Independent tracking hooks support Android and iOS. The native iOS SDK is resolved through
Swift Package Manager by the core RN SDK; no Datadog pod overrides are required.

The hooks require the core Datadog SDK to be initialized and
`DdFlags.enable()` to have completed. The RUM hook also uses a native Flags client to enforce
its evaluation telemetry opt-out policy, and requires RUM to be enabled separately.
The hooks do not initialize, shut down, or change consent for the shared native SDK.

Tracking destinations are configured on the native SDK, not on individual hooks. The core
SDK's site selects the default endpoints. For custom intake routing, pass
`customExposureEndpoint` to `DdFlags.enable()` before creating clients. It accepts a
base URL; the RN bridge appends `/api/v2/exposures`. These hooks do not emit evaluation
events. RUM's endpoint is configured separately when initializing RUM. These overrides
do not change configuration fetching.

The exposure hook requires `initialize()`. The RUM hook is active as soon as it is
created, matching the browser API; its `initialize()` is optional. For either hook,
`shutdown()` deactivates tracking and `initialize()` reactivates it.

```tsx
import { DdFlags } from '@datadog/mobile-react-native';
import {
    composeDatadogTrackingHooks,
    createDatadogExposureLoggingHook,
    createDatadogRumTrackingHook,
    DatadogCoreProvider,
    configurationFromString
} from '@datadog/mobile-react-native-openfeature/rules-based';
import { OpenFeature } from '@openfeature/react-sdk';

// After initializing the core Datadog SDK:
await DdFlags.enable();
const provider = new DatadogCoreProvider();
provider.setConfiguration(configurationFromString(wire));
await OpenFeature.setProviderAndWait('datadog-core', provider, {
    targetingKey: 'user-123', country: 'US'
});

// Include only the tracking operations your application needs.
const tracking = composeDatadogTrackingHooks(
    createDatadogExposureLoggingHook({ clientName: 'datadog-core' }),
    createDatadogRumTrackingHook({ clientName: 'datadog-core' })
);
await tracking.initialize();
const client = OpenFeature.getClient('datadog-core');
client.addHooks(...tracking.hooks);
const enabled = client.getBooleanValue('new-feature', false);

// When this dedicated client no longer needs tracking:
client.clearHooks();
await tracking.shutdown();
```

`clearHooks()` removes all client-level hooks, so this cleanup assumes a client dedicated to
this tracking setup. It does not remove global or provider hooks. `shutdown()` deactivates
these tracking hooks without flushing or shutting down the shared native SDK.

The composer also accepts hooks with optional synchronous or asynchronous lifecycle methods.
A lifecycle failure in one hook does not prevent the remaining hooks from initializing or
shutting down.

Each hook submits its record immediately through an asynchronous native call. There is no
JavaScript batching, timer, or upload queue, and evaluation does not await native delivery.
Native consent handling, exposure deduplication, storage, and upload batching remain unchanged.
Exposure logging respects `doLog` and the native `trackExposures` setting; setting
`trackExposures: false` also disables the exposure hook's output. RUM records the variant
of successful evaluations through the selected native Flags client, respecting its
opt-out policy and RUM integration setting.
The hooks do not enable or synchronize per-subject opt-out; they preserve the native client's
existing policy. Exposure logging is not suppressed by evaluation telemetry opt-out.

Use matching core and OpenFeature package releases containing the tracking APIs. If the core
package is missing a required tracking helper, the exposure hook warns once when initialized
and the RUM hook warns once when created. The affected hook stays inactive; flag evaluation
continues. Repeated evaluations do not repeat the warning.

### Offline initialization

Use `DatadogOfflineOpenFeatureProvider` to evaluate manually supplied precomputed or rules-based
configurations with native exposure or RUM tracking. The provider does not fetch configuration;
supply it with `setConfiguration`. For evaluation without tracking, use `DatadogCoreProvider`.

Rules-based evaluation requires `@datadog/mobile-react-native` and
`@datadog/mobile-react-native-openfeature` 3.10.0 or later. Update both packages together to use the
native tracking/evaluator bridge. With an older core SDK that lacks the bridge, plaintext
precomputed configurations retain their previous behavior, but rules or encoded precomputed
configurations produce a warning once per provider and a `GENERAL` error rather than being
silently ignored. With the evaluator bridge, a configuration that cannot be parsed reports
`PARSE_ERROR`, as `DatadogCoreProvider` does. An older core SDK may report `GENERAL` instead.

#### Rules-based configuration

Use `configurationFromString` from the `/rules-based` entry point to parse rules-based
configurations or configurations containing both precomputed data and rules.
The root entry's `configurationFromString` supports only precomputed configurations. Rules are
evaluated locally for the current context, so you can change users or targeting attributes
without fetching another configuration:

```tsx
import { DdFlags } from '@datadog/mobile-react-native';
import { DatadogOfflineOpenFeatureProvider } from '@datadog/mobile-react-native-openfeature';
import { configurationFromString } from '@datadog/mobile-react-native-openfeature/rules-based';
import { OpenFeature } from '@openfeature/react-sdk';

await DdFlags.enable();
const domain = 'offline-rules';
const provider = new DatadogOfflineOpenFeatureProvider({ clientName: domain });
provider.setConfiguration(configurationFromString(rulesWire));
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
