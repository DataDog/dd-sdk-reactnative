# Native FF&E React Native POC Plan

## Purpose

Build a POC that demonstrates the React Native SDK can support Offline Initialization and Dynamic Context while keeping the durable implementation mostly native. The POC should make React Native a thin consumer of native iOS and Android primitives that can later be extracted into first-class iOS and Android SDK libraries.

This is not a production implementation. It is an execution plan for proving the right seams:

-   Native owns portable configuration parsing, active provider state, context state, evaluation, fetch side effects, persistence, and evaluation side effects.
-   React Native owns API ergonomics and bridge adaptation.
-   The APIs are shaped so the native implementation could move into iOS/Android SDKs without rewriting the React Native contract.
-   The POC must not require first landing, reviewing, releasing, and then consuming new iOS/Android SDK changes. Any new native code needed for the proof should be additive inside this RN repo and structured for later extraction.

## Team Shareable Summary

The proposal is to make Phase 1 a focused React Native push that can unblock the customer quickly, without gating delivery on new iOS and Android SDK releases. We will add the missing native capabilities as local Kotlin and Swift libraries inside the RN repo, with the same architecture we expect to extract into the iOS and Android SDKs later. React Native stays as the API/bridge layer; the new native libraries own configuration parsing, offline initialization, dynamic context, and UFC evaluation, while the existing stable native SDKs remain responsible for the customer-visible Datadog side effects: exposure emission, flag evaluation EVP emission, RUM feature-flag annotation, SDK telemetry, and any reusable persistence hooks. Phase 2 then becomes a lower-pressure extraction effort: move the new Kotlin/Swift libraries downstream into the iOS and Android SDKs, publish them, and delete the RN-local copies once RN can depend on the released native implementations.

## Source RFCs Read

-   `/Users/leo.romanovsky/Downloads/[In Review] Portable Flag Configuration RFC.docx`
-   `/Users/leo.romanovsky/Downloads/[In Review] Dynamic Context for Client SDKs RFC.docx`
-   `/Users/leo.romanovsky/Downloads/[RFC] Offline Initialization for Feature Flagging.docx`

## Research Inputs To Pin

Use the current JavaScript implementation and shared fixture repository as the reference for native evaluator behavior:

-   `https://github.com/DataDog/openfeature-js-client`
    -   Node evaluator: `packages/node-server/src/configuration/evaluation.ts`
    -   Subject evaluation: `packages/node-server/src/configuration/evaluateForSubject.ts`
    -   UFC schema: `packages/node-server/src/configuration/ufc-v1.ts`
    -   Rule operators: `packages/node-server/src/rules/rules.ts`
    -   Sharding: `packages/node-server/src/shards/matchesShard.ts` and `packages/node-server/src/shards/sharders.ts`
    -   Configuration wire precedent: `packages/core/src/configuration/wire.ts`
-   `https://github.com/DataDog/ffe-system-test-data`
    -   Canonical UFC input: `ufc-config.json`
    -   Canonical evaluation cases: `evaluation-cases/*.json`

For this RN-first milestone, copy the canonical JSON files into `packages/core/src/flags/__fixtures__/ffe-system-test-data/` using the same directory layout as the shared repo. This keeps tests off inline JSON and gives Kotlin, Swift, and JS the same fixture names and schemas. Treat these files as a temporary vendored snapshot; before extraction into the iOS/Android SDK repos, decide whether to replace the snapshot with a pinned `ffe-system-test-data` submodule.

Current RN dependencies already bring in shipped native Flags SDKs:

-   iOS `DatadogSDKReactNative.podspec` depends on `DatadogFlags 3.11.0`.
-   Android `packages/core/android/build.gradle` depends on `com.datadoghq:dd-sdk-android-flags:3.10.0`.
-   Existing RN flags bridge calls current native SDKs for precomputed assignment fetch, client state, and exposure/evaluation tracking:
    -   Android: `Flags.enable`, `FlagsClient`, `_FlagsInternalProxy`, `UnparsedFlag`, `FlagsClientState`.
    -   iOS: `Flags.enable`, `FlagsClientProtocol`, `FlagsClientInternal`, `FlagAssignment`, `FlagsEvaluationContext`.

The preflight task is to prove which of these current native SDK pieces can be reused as-is and which missing pieces must be implemented as additive RN-local native libraries.

## Zero Native-Release Dependency Strategy

The biggest architectural constraint is delivery order. We need to avoid this blocked sequence:

```text
change iOS SDK
  -> review/release iOS SDK
  -> change Android SDK
  -> review/release Android SDK
  -> update RN dependencies
  -> start RN feature work
```

Instead, the POC should use this sequence:

```text
inventory currently shipped iOS/Android SDK capabilities
  -> call existing SDK APIs where they are usable today
  -> add missing native libraries inside dd-sdk-reactnative
  -> keep RN bridge thin over those libraries
  -> validate with shared fixtures and example app
  -> later extract the additive native libraries into iOS/Android SDK repos
```

Decision rule for each native capability:

| Capability                               | Preferred source                                                                                 | Fallback if unavailable today                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Precomputed assignment fetch             | Existing `DatadogFlags` / `dd-sdk-android-flags` client fetch path                               | RN-local fetch adapter that mirrors current request shape through an interface.                |
| Exposure/evaluation logging              | Existing native `trackEvaluation` / internal tracking hooks already used by RN                   | RN-local `FlagsEvaluationSideEffects` fake plus adapter interface for later SDK integration.   |
| RUM session correlation                  | Existing native Flags/RUM integration                                                            | Adapter interface that records required RUM context inputs but does not reimplement RUM in JS. |
| SDK storage path                         | Existing native SDK file/storage primitives if public enough                                     | RN-local native store with the same interface and one last-good config policy.                 |
| HTTP transport and request construction  | Existing native SDK HTTP/request builders if callable from RN package without unreleased changes | RN-local native transport with injectable fake server support; no JS fetch.                    |
| UFC rules evaluation                     | Existing native evaluator only if already shipped and callable                                   | RN-local Kotlin and Swift evaluator implementations, fixture-backed, extracted later.          |
| Portable config parse/serialize          | Existing shipped parser if present                                                               | RN-local parser/serializer matching RFC wire contract.                                         |
| Provider state machine / dynamic context | Existing state manager only if it can support rules config and context-only re-evaluation today  | RN-local `NativeFfeCore` state machine that later moves into native SDKs.                      |

Rules for additive RN-local libraries:

-   No React Native imports inside core evaluator, configuration, fetch, persistence, or side-effect types.
-   Bridge code may only translate JS/RN values into native core inputs and serialize outputs back to JS.
-   Native core code must depend on narrow ports for SDK-owned concerns: transport, storage, telemetry, RUM context, and exposure logging.
-   Any use of Android `internal` packages, iOS SPI, or private-ish bridge helpers must be isolated in adapter classes and documented as a POC-only dependency.
-   No dependency on unreleased Maven artifacts, unpublished Pods, local native SDK checkouts, or source changes in native SDK repos.
-   Extraction should be a mechanical move: the core package/module should compile in unit tests without RN and with fake ports.

## Existing Native SDK Reuse Targets

Keep the hard dependency on existing iOS/Android SDKs focused on customer-visible Datadog side effects and SDK context. The evaluator and configuration state can be additive RN-local code; event emission and correlation should not be reimplemented in JS.

Must call into existing native SDKs:

-   Exposure emission through the existing Flags pipelines.
    -   Android path: `_FlagsInternalProxy.trackFlagSnapshotEvaluation(...)` delegates to `DatadogFlagsClient.trackFlagSnapshotEvaluation`, which enters the same native `trackResolution` path as shipped Android flag resolution.
    -   iOS candidate: `FlagsClientInternal.sendFlagEvaluation(...)`, which calls the native exposure logger, evaluation logger, and RUM reporter.
-   Flag evaluation emission in EVP through the existing native evaluator/event aggregation pipeline.
    -   Android path: `DatadogFlagsClient.trackResolution` calls `writeEvaluationEvent(...)` when `trackEvaluations` is enabled, reusing the shipped evaluation feature and writer pipeline.
    -   iOS path: `FlagsClient.trackEvaluation(...)` calls `evaluationLogger.logEvaluation(...)`, reusing the shipped evaluation aggregation pipeline.
-   RUM feature-flag annotation / correlation.
    -   Android path: `DatadogFlagsClient.trackResolution` calls `RumEvaluationLogger.logEvaluation(...)` when RUM integration is enabled; `DefaultRumEvaluationLogger` sends a native `RumFlagEvaluationMessage`.
    -   iOS path: `rumFlagEvaluationReporter.sendFlagEvaluation(...)` underneath `FlagsClient.trackEvaluation(...)`, consumed by Datadog RUM's flag evaluation receiver.

Validated reuse evidence for the RN-local native side-effect adapter:

-   Android shipped AAR bytecode confirms `trackFlagSnapshotEvaluation -> trackResolution -> writeExposureEvent`, `RumEvaluationLogger.logEvaluation`, and `writeEvaluationEvent`.
-   iOS shipped Pod source confirms `sendFlagEvaluation -> trackEvaluation -> exposureLogger.logExposure`, `evaluationLogger.logEvaluation`, and `rumFlagEvaluationReporter.sendFlagEvaluation`.
-   The RN-local evaluator should therefore call the existing native Flags tracking hook once per successful `doLog`/trackable evaluation and must not add a parallel direct RUM annotation call that could double-count.

Also preserve through native SDKs, either directly or as inputs to side-effect adapters:

-   Tracking consent handling for emitted data.
-   SDK core identity and configuration: site, client token, environment, service, version, source, and SDK instance.
-   Native event timestamps and server time offset.
-   Internal SDK logging/telemetry for parse, evaluation, fetch, and persistence failures.
-   Existing RUM session context when annotation/correlation is enabled.

Optional reuse, only if callable from currently released SDKs without source changes:

-   SDK-owned storage directories for persisted last-good configuration.
-   SDK HTTP client/request builders, compression, retry, and endpoint/auth helpers for configuration fetch.
-   Existing precomputed assignment request builders.

If optional reuse is not callable today, implement it as an RN-local native port with the same shape expected from the future extracted SDK library. Do not block the RN POC on making those APIs public in the iOS/Android SDK repos first.

Current storage finding: released iOS and Android Flags SDKs persist precomputed flag state on disk through native SDK data-store abstractions. iOS uses `FeatureScope.flagsDataStore` over Datadog `DataStore`, keyed by flags client name. Android uses `FlagsPersistenceManager` over `DataStoreHandler`, with a `flags-state-{instanceName}` key. The rules-based `ConfigurationWire` has no released save/load API yet, so the RN-local implementation should persist the downloaded rules configuration on native disk with equivalent semantics: versioned payload, per-client/slot keying, native-owned I/O, and explicit `loadConfiguration -> setConfiguration` activation. The current branch now prefers the existing native SDK feature data-store namespace when available: iOS writes through `CoreRegistry.default.scope(for: flags).dataStore`, and Android writes through the Flags `FeatureScope.dataStore` obtained from `FeatureSdkCore`. The app-private file store remains only as an RN-local fallback for uninitialized SDK/test scenarios.

## RFC Requirements To Exercise

| RFC area               | Requirement                                                                                                     | POC coverage target                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Portable configuration | `ConfigurationWire` is an opaque JSON string that can carry precomputed assignments and rules/UFC.              | Native `configurationFromString` / `configurationToString` parse and serialize a versioned wire payload.                      |
| Configuration loading  | `setConfiguration()` loads or replaces one complete active configuration.                                       | Native provider state machine stores active configuration and emits/debugs ready, changed, and error states.                  |
| Offline init           | Startup can load a supplied config before network is available.                                                 | RN passes a bundled/cached wire string to native, native evaluates without network.                                           |
| Startup then refresh   | SDK can start from supplied config and later replace it with fetched config.                                    | Native fetch returns a config, RN or native caller then applies it through the same `setConfiguration` path.                  |
| Fetch helpers          | `fetchRulesConfiguration()` / `fetchPrecomputedConfiguration()` return config and do not mutate provider state. | Native fetch API performs HTTP, ETag, headers, auth inputs, and returns wire/config without touching active state.            |
| Conditional fetch      | Existing `etag` becomes `If-None-Match`; `304` returns previous config.                                         | Native fetch accepts previous wire/config, sends `If-None-Match`, and handles `304`.                                          |
| Dynamic context        | Rules-based config stores new context immediately with no network and no stale blackout.                        | Native `setEvaluationContext()` mutates context only; `evaluate()` re-evaluates against same active rules.                    |
| Precomputed safety     | Precomputed config tied to one context must not serve another context.                                          | Native evaluates precomputed only when stored context matches; mismatch returns default/error/debug state.                    |
| Evaluation output      | Rules path must produce metadata compatible with logging.                                                       | Native result includes value, variant, reason, error code, allocation key, `doLog`, and `extraLogging`.                       |
| Logging side effects   | RN should keep existing native logging consistency.                                                             | Native evaluation triggers the existing native Flags SDK tracking hook and reports attempted/tracked/skipped/failed counters in debug state. |
| Persistence            | Mobile startup from last-known values is a target recipe.                                                       | Native `saveConfiguration()` / `loadConfiguration()` persist last-good wire on disk; caller still explicitly activates via `setConfiguration()`. |
| Failure behavior       | Invalid wire, unsupported kind, refresh failure, stale serving are explicit states.                             | Native debug state reports invalid wire, unsupported kind, stale retained config, and last fetch error.                       |

## Current Native Flag-Provider Coverage

The current native flag-provider slice is designed to replace the earlier add-numbers/counter bridge exercise.

Covered:

-   New RN bridge methods through old and new architecture.
-   Native-owned mutable state across calls.
-   JS-to-native JSON request and native-to-JS JSON response using RFC-shaped configuration, context, and evaluation result objects.
-   `ConfigurationWire` parse/serialize round trips.
-   `setConfiguration()` lifecycle and provider debug state.
-   Dynamic context changes with no network request.
-   Native UFC evaluation with canonical fixture coverage for `STATIC`, `SPLIT`, `TARGETING_MATCH`, and `ERROR` / `TARGETING_KEY_MISSING`.
-   Evaluation metadata required for exposure logging, evaluation aggregation, and RUM: variant, allocation key, `doLog`, split serial id where present, configuration kind/etag, and `extraLogging`.
-   Best-effort native side-effect adapters that convert successful native evaluation results into the shipped Flags SDK assignment shape:
    -   Android: `_FlagsInternalProxy.trackFlagSnapshotEvaluation(...)`.
    -   iOS: `FlagsClientInternal.sendFlagEvaluation(...)`.
-   Provider debug state includes evaluation side-effect counters: attempted, tracked, skipped, failed, last status, and last error.

Not covered:

-   Precomputed context mismatch protection.
-   Native HTTP fetch side effects, auth, ETag, `304`, compression, request builders.
-   Native persistence/offline boot.
-   Production-grade side-effect dedup/reset policy for rules evaluation; the current adapter proves call-in feasibility and leaves dedup/cache semantics to the native SDK extraction.

## Architecture Decision For The POC

Use a native-first `NativeFfeCore` boundary on each platform.

React Native should call into native with serialized inputs and receive serialized/debuggable outputs, but the durable state and side effects live behind a native API:

```text
React Native JS
  -> NativeDdSdk bridge methods
    -> NativeFfeCore facade
      -> configuration parser/serializer
      -> provider state machine
      -> evaluator interface
      -> fetch transport
      -> persistence store
      -> logging side effects
```

Preferred native shape for the POC is closest to Dynamic Context RFC Option D: compose via a shared evaluator interface. That lets existing native `FlagsClient` logging patterns stay conceptually intact while a rules evaluator and precomputed evaluator plug into the same result type.

## RFC-Shaped API Sketch

Use names that are as close as possible to the RFC building blocks. The implementation can remain experimental while it lives in the RN repo, but the API shape should preview the eventual extracted iOS/Android SDK surface.

### React Native Surface

```ts
type NativeFfeConfigurationWire = string;

type NativeFfeFetchOptions = {
    kind: 'rules' | 'precomputed';
    endpoint: string;
    clientToken?: string;
    sdkKey?: string;
    site?: string;
    headers?: Record<string, string>;
    flagQueryParams?: Record<string, unknown>;
    evaluationContext?: Record<string, unknown>;
    previousConfigurationWire?: NativeFfeConfigurationWire;
};

type NativeFfeEvaluationContext = {
    targetingKey?: string;
    attributes?: Record<string, unknown>;
};

type NativeFfeEvaluationResult = {
    flagKey: string;
    value: boolean | string | number | Record<string, unknown> | null;
    variant?: string;
    reason: string;
    errorCode?: string;
    flagMetadata?: {
        allocationKey?: string;
        doLog?: boolean;
        extraLogging?: Record<string, unknown>;
        configurationKind?: 'precomputed' | 'rules';
        configurationEtag?: string;
    };
};

type NativeFfeDebugState = {
    status: 'not_ready' | 'ready' | 'stale' | 'error';
    activeConfigurationKind?: 'precomputed' | 'rules' | 'mixed';
    activeEtag?: string;
    currentContext?: NativeFfeEvaluationContext;
    configurationSetCount: number;
    fetchCount: number;
    evaluationCount: number;
    lastEvent?: 'provider_ready' | 'configuration_changed' | 'provider_error';
    lastFetchRequest?: {
        url: string;
        method: string;
        headers: Record<string, string>;
    };
    lastError?: string;
};
```

Methods:

```ts
DdSdkReactNative.configurationFromString(wire): Promise<FlagsConfiguration>;
DdSdkReactNative.configurationToString(configuration): Promise<NativeFfeConfigurationWire>;
DdSdkReactNative.fetchPrecomputedConfiguration(options): Promise<FlagsConfiguration>;
DdSdkReactNative.fetchRulesConfiguration(options): Promise<FlagsConfiguration>;
DdSdkReactNative.setConfiguration(configuration): Promise<NativeFfeDebugState>;
DdSdkReactNative.setEvaluationContext(context): Promise<NativeFfeDebugState>;
DdSdkReactNative.resolveBooleanEvaluation(flagKey, defaultValue): Promise<NativeFfeEvaluationResult>;
DdSdkReactNative.resolveStringEvaluation(flagKey, defaultValue): Promise<NativeFfeEvaluationResult>;
DdSdkReactNative.resolveNumberEvaluation(flagKey, defaultValue): Promise<NativeFfeEvaluationResult>;
DdSdkReactNative.resolveObjectEvaluation(flagKey, defaultValue): Promise<NativeFfeEvaluationResult>;
DdSdkReactNative.saveConfiguration(wire): Promise<void>;
DdSdkReactNative.loadConfiguration(): Promise<NativeFfeConfigurationWire | undefined>;
DdSdkReactNative.getProviderDebugState(): Promise<NativeFfeDebugState>;
```

### Native Library Boundary

The bridge should delegate to platform-native classes that are not RN-specific beyond adapters:

Android:

-   `NativeFfeCore`
-   `FlagsConfigurationWireParser`
-   `FlagsConfigurationStore`
-   `FlagEvaluator`
-   `PrecomputedFlagEvaluator`
-   `RulesFlagEvaluator`
-   `FlagsConfigurationFetcher`
-   `FlagsConfigurationTransport`
-   `FlagsEvaluationSideEffects`

iOS:

-   `NativeFfeCore`
-   `FlagsConfigurationWireParser`
-   `FlagsConfigurationStore`
-   `FlagEvaluator`
-   `PrecomputedFlagEvaluator`
-   `RulesFlagEvaluator`
-   `FlagsConfigurationFetcher`
-   `FlagsConfigurationTransport`
-   `FlagsEvaluationSideEffects`

The POC can place these inside the RN repo, but the package/module boundary should make later extraction into the iOS and Android SDKs straightforward.

## Minimal RFC Wire Format

Use a deliberately small versioned shape that mirrors the RFC wire fields without embedding ad hoc flag JSON in tests. The bridge and native tests should read `native-ffe/rules-configuration-wire.json`, generated from the vendored `ffe-system-test-data/ufc-config.json` bytes with `ffe-system-test-data` as the etag. RN-local JSON fixtures should only cover SDK-specific envelopes such as `native-ffe/evaluation-context-user-123.json` and `native-ffe/evaluation-side-effects/*.json`.

Rules evaluation must be native and fixture-backed, not a toy predicate engine. The first implementation can be limited to the UFC v1 behavior covered by `ffe-system-test-data`, but Kotlin and Swift should both implement the same evaluator surface:

-   flag lookup by key
-   enabled/disabled flags
-   variation type validation for boolean, string, number, and object values
-   allocation order
-   allocation `startAt` / `endAt` windows
-   rule conditions for `MATCHES`, `NOT_MATCHES`, `GTE`, `GT`, `LTE`, `LT`, `ONE_OF`, `NOT_ONE_OF`, and `IS_NULL`
-   subject attribute construction matching Node behavior: `targetingKey` is exposed as `id`, and explicit context attributes may override `id`
-   MD5 sharding using `${salt}-${targetingKey}`, the first 4 bytes of the MD5 hex output, modulo `totalShards`, and inclusive-start/exclusive-end ranges
-   missing-targeting-key behavior only when sharding requires a subject key
-   variant/value output
-   OpenFeature-compatible reasons and error codes
-   metadata including `variant`, `allocationKey`, `doLog`, split serial id, evaluation timestamp, and `extraLogging` where present

Structure `RulesFlagEvaluator` behind an interface so the POC implementation can later be replaced by a production shared evaluator or an extracted iOS/Android SDK library, but the POC itself should prove the Kotlin and Swift implementations against shared fixtures.

## Execution Phases

### Phase 0: Establish The Native Flag Provider Bridge

Goal: expose RFC-shaped flag configuration semantics while preserving compile proof.

Tasks:

-   Replace counter-specific methods with API names close to the RFC surface: `configurationFromString`, `configurationToString`, `setConfiguration`, `setEvaluationContext`, typed `resolve*Evaluation`, and provider debug state.
-   Keep JSON round trips, but use `ConfigurationWire`, context, and evaluation result objects.
-   Move test payloads into canonical JSON fixtures; do not embed UFC config or evaluation cases inline in Kotlin, Swift, or JS tests.
-   Add JS tests proving RN serializes request objects and parses native JSON responses.

Acceptance:

-   RN call sequence demonstrates `set config -> set context -> evaluate -> set context -> evaluate`.
-   No network is called during `setEvaluationContext()` in rules mode.

### Phase 1: Native Core Boundary

Goal: establish extractable native library structure.

Tasks:

-   Add Android native classes under a package that does not depend on React Native except adapter methods.
-   Add iOS native classes/types with the same separation.
-   Add bridge adapter methods that only translate RN values to native inputs.
-   Add `NativeFfeDebugState` for test visibility.

Acceptance:

-   Most POC logic lives outside bridge method bodies.
-   Unit tests can instantiate `NativeFfeCore` without React Native.

### Phase 2: Portable Configuration Parse/Serialize

Goal: exercise the RFC building blocks.

Tasks:

-   Implement `configurationFromString(wire)` natively.
-   Validate `version`.
-   Parse precomputed and server/rules slots.
-   Preserve `etag`, `fetchedAt`, and embedded context.
-   Implement `configurationToString(configuration)`.
-   Reject invalid JSON, unsupported version, and empty configuration.

Acceptance:

-   Valid precomputed wire round trips.
-   Valid rules wire round trips.
-   Invalid wire produces provider error/debug state.
-   Unsupported kind is explicit and predictable.

### Phase 3: Provider State And Offline Init

Goal: prove one loading path for startup, post-start, and refresh.

Tasks:

-   Implement `setConfiguration(configuration)` in native.
-   Track provider states: `not_ready`, `ready`, `stale`, `error`.
-   Track events: first valid config is ready; replacement is configuration changed; invalid config is error.
-   Allow evaluation immediately after loading a bundled/cached wire.

Acceptance:

-   `configurationFromString -> setConfiguration -> evaluate` works without network.
-   Replacing config changes `etag` and debug event.
-   Invalid replacement does not silently corrupt previous usable state.

### Phase 4: Kotlin And Swift UFC Evaluators

Goal: prove native iOS and Android can own rules evaluation with cross-platform parity.

Tasks:

-   Implement `RulesFlagEvaluator` in Kotlin.
-   Implement `RulesFlagEvaluator` in Swift.
-   Load UFC v1 JSON into native typed structures.
-   Implement rule matching, allocation windows, type validation, MD5 sharding, variation selection, reasons, and error codes.
-   Include evaluation metadata needed by exposure logging.
-   Add a fixture runner that loads `ffe-system-test-data/ufc-config.json` and every `ffe-system-test-data/evaluation-cases/*.json`.
-   Keep evaluator code outside RN bridge adapters.

Acceptance:

-   Kotlin passes every shared evaluation case.
-   Swift passes every shared evaluation case.
-   Both platforms report the same value, reason, and error behavior for the same fixture input.
-   Native tests include explicit metadata assertions for allocation key, variant, `doLog`, split serial id, timestamp, and `extraLogging` because the shared fixtures intentionally focus on value/reason.
-   The implementation can be instantiated without React Native.

### Phase 5: Dynamic Context

Goal: model "dynamic under static" context behavior.

Tasks:

-   Implement native `setEvaluationContext(context)`.
-   In rules mode, store context and resolve immediately.
-   In precomputed mode, require exact or well-defined context match.
-   Add context mismatch behavior for precomputed config.
-   Prove anonymous-to-authenticated and account-switch flows.

Acceptance:

-   Rules config evaluates different values after context changes with no fetch.
-   Precomputed config does not serve values for mismatched context.
-   Debug state shows no fetch during rules-context changes.

### Phase 6: Native Fetch Side Effects

Goal: show native iOS/Android own networking infrastructure.

Tasks:

-   Add native `fetchFlagsConfiguration(options)` returning wire/config only.
-   Build request URL from endpoint/site, kind, flag query params, and precomputed context.
-   Add auth/header handling inputs.
-   Add `If-None-Match` from previous config etag.
-   Handle `200` body, `304` previous config, and error.
-   Keep fetch side-effect-free relative to active provider state.
-   Use injectable transport in unit tests.
-   Add one integration-style test using a local fake server if feasible.

Acceptance:

-   Fetch increments fetch counter and records last request.
-   Fetch does not change active configuration until `setConfiguration` is called.
-   `304` returns the previous wire.
-   Error leaves active provider untouched.

### Phase 7: Persistence / Last-Known Startup

Goal: prove mobile offline startup from native-owned storage.

Tasks:

-   Add native save/load of wire string to the existing SDK feature data-store path when available.
-   Keep policy minimal: one last-good config only.
-   Load persisted wire before any network call.
-   Refresh in background by explicit caller sequence: `load -> setConfiguration -> fetch -> setConfiguration`.

Acceptance:

-   Cold-start path evaluates from persisted config.
-   Refresh failure keeps prior config and marks stale/debug error.
-   Storage is native-owned, not JS AsyncStorage; adapter tests prove the Datadog feature data-store path and fallback behavior.

### Phase 8: Evaluation Side Effects

Goal: preserve native logging architecture for RN.

Tasks:

-   Add evaluation result metadata required by RFC: `variant`, `allocationKey`, `doLog`, `extraLogging`.
-   Add native `NativeFfeEvaluationSideEffects` adapters beside the RN bridge, outside the pure evaluator core.
-   Android adapter converts the evaluation result into `UnparsedFlag` and calls `_FlagsInternalProxy.trackFlagSnapshotEvaluation(...)`.
-   iOS adapter converts the evaluation result into `FlagAssignment` and calls `FlagsClientInternal.sendFlagEvaluation(...)`.
-   RN evaluation should not implement exposure batching in JS.
-   Expose best-effort tracking counters in provider debug state so the POC can show whether native side effects were attempted, tracked, skipped, or failed.

Acceptance:

-   Evaluating a successful `doLog=true` flag with a targeting key invokes the shipped native Flags side-effect hook.
-   Error/default evaluations skip side effects.
-   Missing native Flags initialization does not fail evaluation; it increments failed counters and logs through native SDK logging.
-   RN only calls evaluate; native owns the side effect.

### Phase 9: Example App Flow

Goal: make the POC demonstrable.

Tasks:

-   Add an example screen or simple script path in `example-new-architecture`.
-   Show:
    -   load bundled rules wire
    -   set anonymous context
    -   evaluate
    -   switch to authenticated context
    -   evaluate without network
    -   fetch updated config natively
    -   set fetched config
    -   evaluate changed result
    -   save/load wire
-   Include debug state output for request headers, etag, context, provider state, and evaluation metadata.

Acceptance:

-   Demo visibly distinguishes context change from fetch.
-   Demo shows native fetch side effect and later explicit state mutation.

## Validation Plan

Validation must answer three separate questions: whether the POC exercises the architectural goals, whether evaluator behavior is correct, and whether RN integration remains thin and stable.

### 1. Goal Coverage Validation

Maintain a traceability table in the PR or test output that maps every goal to concrete evidence:

| Goal                                | Required proof                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Offline initialization              | `configurationFromString -> setConfiguration -> evaluate` succeeds from a bundled or persisted wire.   |
| Dynamic context                     | `setEvaluationContext` changes evaluation results under rules config without incrementing fetch count. |
| Native-owned fetch                  | Native fetch records request URL, headers, auth, ETag, query params, and status, but active config is unchanged. |
| Explicit config replacement         | Fetched config changes behavior only after `setConfiguration`.                                         |
| Conditional fetch                   | `If-None-Match` is sent and `304` returns prior wire without state mutation.                           |
| Native-owned persistence            | Cold start loads native-stored last-good wire without JS storage, then explicitly activates it.        |
| Native-owned evaluation side effect | `doLog=true` evaluation invokes the existing native Flags tracking hook, which reuses exposure, EVP, and RUM annotation paths. |
| RN remains adapter-only             | Most logic is unit-tested through native core classes without React Native.                            |
| JSON bridge shape                   | JS serializes requests and parses native JSON responses for config, context, fetch, and evaluation.    |

The example app flow must visibly exercise this sequence:

```text
load bundled rules wire
  -> set anonymous context
  -> evaluate
  -> set authenticated context
  -> evaluate again with no fetch
  -> native fetch updated config
  -> prove active state is unchanged
  -> save fetched config to native disk
  -> load fetched config from native disk
  -> set loaded config
  -> evaluate changed result
  -> load wire on cold start without JS storage
```

Debug state is part of validation, not just demo UI. Tests should assert `configurationSetCount`, `configurationSaveCount`, `configurationLoadCount`, `fetchCount`, `evaluationCount`, active `etag`, current context, last provider event, last fetch request, and last storage operation.

The example app fetch panel should use the staging Fastly route while this is being shared with the team:

```text
GET https://dd.datad0g.com/api/v2/feature-flagging/config/rules-based?dd_env=staging
Fastly-Client: 1
dd-client-token: pub542a31cc0f5b23136420667ca212045a
```

### 2. Correctness Validation

Correctness is fixture-driven first, then integration-driven:

-   Load the vendored `packages/core/src/flags/__fixtures__/ffe-system-test-data` snapshot for this RN milestone; before SDK extraction, replace or validate it against a pinned `ffe-system-test-data` submodule.
-   Load `ufc-config.json` into Kotlin and Swift evaluator tests.
-   Iterate every `evaluation-cases/*.json` file on both platforms.
-   For every case, evaluate `flag`, `variationType`, `defaultValue`, `targetingKey`, and `attributes`.
-   Assert at minimum `result.value` and `result.reason`.
-   Add native-only expectations for error codes where the shared case implies `FLAG_NOT_FOUND`, `TARGETING_KEY_MISSING`, `TYPE_MISMATCH`, `PROVIDER_NOT_READY`, or `GENERAL`.
-   Add metadata tests derived from the UFC input for `variant`, `allocationKey`, `doLog`, split serial id, evaluation timestamp, and `extraLogging`.
-   Add bridge tests proving JS can pass boolean, string, number, object, null/default values, nested attributes, and special-character strings through the native JSON boundary.
-   Add parser tests for invalid JSON, unsupported wire version, malformed flags, unknown fields, missing split shards, invalid shard bounds, microsecond dates, null targeting keys, and empty targeting keys.
-   Add state-machine tests for invalid replacement retaining the previous valid config, precomputed context mismatch, refresh failure, and `304` handling.

If a behavior is missing from `ffe-system-test-data`, add it there first when it is cross-SDK evaluator behavior. Use RN-local tests only for RN bridge behavior, native side effects, persistence, or metadata that is intentionally SDK-specific.

### 3. Reference Implementation Validation

Use `openfeature-js-client` Node as the research and parity reference:

-   Port behavior from `evaluate`, `evaluateForSubject`, `matchesRule`, `matchesShard`, and `MD5Sharder`.
-   Keep an implementation note beside the native evaluator describing any intentional deviation from Node behavior.
-   For risky cases, run the same fixture through Node, Kotlin, and Swift and compare the normalized result tuple: `value`, `reason`, `errorCode`, `variant`, `allocationKey`, `doLog`, `splitSerialId`.
-   Treat parity with shared fixtures as the merge gate for the native evaluator portion of the POC.

Required for each phase:

-   JS unit tests for RN API serialization and bridge forwarding.
-   Android unit tests for native core.
-   Android fixture tests for the Kotlin evaluator.
-   iOS unit tests for native core.
-   iOS fixture tests for the Swift evaluator.
-   iOS side-effect adapter tests for the existing native Flags tracking request shape.
-   Android new-architecture example build.
-   iOS codegen generation and iOS build when local Xcode simulator/device support is available.

Target commands:

```bash
yarn --cwd packages/core test DdSdkReactNative.test.tsx --runInBand
yarn --cwd packages/core prepare
JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home ANDROID_HOME=/opt/homebrew/share/android-commandlinetools ./gradlew testDebugUnitTest --tests "com.datadog.reactnative.NativeFfeCoreTest" --tests "com.datadog.reactnative.NativeFfeConfigurationFetcherTest"
yarn --cwd example-new-architecture tsc --noEmit
cd example-new-architecture/ios && GIT_CONFIG_GLOBAL=/dev/null bundle exec pod install
cd example-new-architecture/ios && xcodebuild -workspace DdSdkReactNativeExample.xcworkspace -scheme DatadogSDKReactNative -configuration Debug -destination 'platform=macOS,variant=Mac Catalyst' -derivedDataPath build/DerivedData CODE_SIGNING_ALLOWED=NO build
cd example-new-architecture/ios && xcodebuild test -workspace DdSdkReactNativeExample.xcworkspace -scheme DatadogSDKReactNative-Unit-Tests -configuration Debug -destination 'platform=macOS,variant=Mac Catalyst' -derivedDataPath build/DerivedData CODE_SIGNING_ALLOWED=NO -only-testing:DatadogSDKReactNative-Unit-Tests/NativeFfeCoreTests -only-testing:DatadogSDKReactNative-Unit-Tests/NativeFfeEvaluationSideEffectsTests
```

Known local caveat: the current workstation reports an Xcode/CoreSimulator mismatch warning for iOS simulator support. The RN package build and selected native FF&E iOS tests have been validated with the Mac Catalyst destinations above.

## What This POC Should Prove

-   RN can surface the feature without owning the core logic.
-   RN can get the important existing native SDK benefits today: exposure emission, flag evaluation EVP emission, and RUM feature-flag annotation/correlation.
-   iOS and Android can own the future extractable core library boundaries.
-   `ConfigurationWire` can be loaded, replaced, persisted, fetched, and evaluated through one native path.
-   Kotlin and Swift can evaluate UFC rules with parity against the shared fixture corpus.
-   Context changes are native state changes, not network side effects, when rules config is active.
-   Fetch helpers are side-effect-free relative to provider state.
-   Native networking, persistence, logging, and telemetry remain native concerns.
-   Existing RN customers can eventually get the feature through a bridge over native SDK capabilities rather than a parallel JS SDK.

## What This POC Should Not Attempt

-   Production-wide UFC evaluator behavior beyond the shared fixture corpus and explicit parity cases added for this POC.
-   Production auth or endpoint finalization.
-   Production polling/cache policy.
-   Source merging or priority rules.
-   Public API naming finalization.
-   Replacing existing `DdFlags` behavior for customers.
-   Moving code into iOS/Android SDK repos yet.

## Open Decisions To Force During Review

-   Should native POC use Option D evaluator composition as the recommended iOS/Android path?
-   What is the exact precomputed context mismatch behavior per platform: default value, provider not ready, or evaluation error?
-   What credential can fetch client-appropriate rules from mobile clients, if any?
-   Is rules-based client configuration a separate distribution channel?
-   Where should RN expose building blocks: `DdSdkReactNative`, `DdFlags`, or a new `DdFlagsConfiguration` namespace?
-   Should fetch and persistence be public RN APIs or internal to a higher-level provider?
-   What minimum metadata is mandatory for native exposure/evaluation/RUM parity?
-   What max wire size should mobile/RN treat as acceptable for startup?

## Recommended Next Step

The current branch has implemented the first native-first slice through configuration parsing, dynamic context, rules/precomputed evaluation, native fetch, native SDK data-store-backed persistence with app-private fallback, shared JSON fixture coverage on Kotlin and Swift, example-app wiring, and existing native Flags SDK side-effect reuse. The next implementation slice should finish the remaining extraction-oriented pieces: a review note that records the confirmed native reuse points above, broader fixture iteration across the full shared corpus instead of the current representative cases, and a later cleanup of RN-local fallbacks when this code moves downstream.

The minimum demo sequence remains:

```text
configurationFromString(wire)
  -> setConfiguration(configuration)
  -> setEvaluationContext(anonymous)
  -> evaluate(flag)
  -> setEvaluationContext(authenticated)
  -> evaluate(flag)
  -> fetchRulesConfiguration({ dd_env: "staging" })
  -> confirm fetch did not mutate active configuration
  -> saveConfiguration(fetchedConfiguration)
  -> loadConfiguration()
  -> confirm load did not mutate active configuration
  -> setConfiguration(loadedConfiguration)
  -> evaluate(flag)
```
