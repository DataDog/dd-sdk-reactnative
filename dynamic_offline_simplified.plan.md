# FFL-2837 — Dynamic Offline Initialization for React Native

This document uses Simplified Technical English.
Technical names and API names do not change.

**Jira:** FFL-2837
**Base branch:** `develop`
**Work branch:** `blake.thomas/FFL-2837`
**Upstream references:** DataDog/openfeature-js-client PRs #343, #344, and #336; ddoghq/dd-source PRs #34959 and #40304

## Source documents

- The Portable Flag Configuration RFC defines the portable configuration APIs.
- The Offline Initialization RFC defines the offline workflows.
- The ConfigurationWire specification defines the portable JSON envelope and its base64 protobuf field.
- The canonical UFC schema defines the raw protobuf message.
- The Obfuscation RFC defines the proposed client-rules protection.

The RFC documents are drafts.
Upstream PR #344 now defines the expected implementation contract.
Names and versions can still change before publication.

## 1. Objective

The current offline provider supports precomputed assignments.
A precomputed configuration applies to one evaluation context.
A different context puts the provider in the `ERROR` state.

Add a rules-based offline flow.

- The customer supplies a rules configuration with `setConfiguration`.
- The provider does not fetch data from the network.
- `setContext` changes the active context.
- The SDK evaluates the rules locally for each flag request.
- A rules configuration can evaluate more than one context.
- The SDK uses `evaluateRulesBasedConfiguration` from `@datadog/flagging-core`.
- The SDK does not implement a second rules engine.

One provider supports both configuration types.
A wire can contain precomputed data, rules data, or both.

Use this evaluation order:

1. Use precomputed data or its per-flag parse error when its context matches.
2. Otherwise, use rules data when it is usable.
3. Otherwise, return a configuration error.

Do not add a new SDK mode.
Do not add an `offlineInit` method.
Use this existing flow:

```text
configurationFromString -> setConfiguration -> evaluate
```

## 2. Current upstream state

### 2.1 Published version 2.0.2

PR #343 published flagging-core version 2.0.2.
This version removes an unnecessary `@datadog/js-core` dependency.
It does not contain the new rules wire features.

Version 2.0.2 still contains the existing rules engine.
It exports `evaluateRulesBasedConfiguration` from the package root.
It also contains sharding, MD5, UFC v1 types, and `spark-md5`.

The React Native wire module already imports the package root.
Thus, the current application bundle already contains the existing rules engine.

### 2.2 Expected features from upstream PR #344

PR #344 is the required upstream dependency change.
Its code head is `939da97` as of 2026-08-10.
The branch was rebased on 2026-08-09, so all earlier commit SHAs changed.
Commits `771f85b` and `565d9bd` now contain the previous `BigInt` and parse-error changes.
They remove the evaluator dependency on the global `BigInt` function and preserve configuration parse errors.
Commit `ab22ad0` refreshes generated Node-server declarations and lock data after the rebase.
It adds the existing SHA-256 and semantic-version operators to the generated Node-server declaration.
Commit `939da97` removes browser test setup that leaked provider initialization.
Neither commit changes the React Native parser, evaluator, wire, or lifecycle contract.
It adds these features:

- The opaque `FlagsConfigurationWire` type
- A version `1` wire with a `rules` branch
- A `rules` field in `FlagsConfiguration`
- A protobuf and base64 rules response
- The checked-in UFC protobuf schema
- Generated Protobuf-ES message types from the canonical UFC schema
- Protobuf-ES decoding
- An opt-in `@datadog/flagging-core/configuration` entry point
- A protobuf-free `@datadog/flagging-core/precomputed` entry point
- A full-featured `@datadog/openfeature-browser` package root
- A protobuf-free `@datadog/openfeature-browser/precomputed` entry point
- Independent parsing of the precomputed and rules branches
- Evaluation-time validation and feature-level errors
- Evaluation-time `PARSE_ERROR` results for invalid rules flags
- Forward-compatible handling of unknown protobuf fields
- Lossless parsing of protobuf integer values
- Rules configuration serialization
- Complete-envelope and rules-branch parse errors
- Precomputed branch and per-flag parse errors
- Deterministic rules parse errors
- Backward-only condition references
- Lazy regular-expression compilation
- `ONE_OF_SHA256` and `NOT_ONE_OF_SHA256`
- A synchronous JavaScript SHA-256 implementation
- An internal UTF-8 implementation
- Own-property lookup for legacy and protobuf rules flag maps
- A React Native Metro smoke test
- A check that the default flagging-core entry point does not load Protobuf-ES
- A check that the flagging-core and browser precomputed entry points do not load Protobuf-ES

The parser keeps decoded rules data when the protobuf payload is valid binary data.
The evaluator validates the requested flag and the data that its evaluation reaches.
It returns a deterministic `PARSE_ERROR` when that data is invalid.
Other valid rules flags remain usable.
Unknown protobuf fields do not cause an error when the known fields still define a supported value.
Rules serialization preserves unknown protobuf fields.
An unknown enum or oneof value that leaves no supported known value causes a per-flag `PARSE_ERROR`.
The parser preserves a protobuf integer as a `bigint`.
A safe integer evaluates as an OpenFeature `number`.
An integer that is outside the JavaScript safe range stays in the parsed configuration.
The evaluator returns `PARSE_ERROR` and does not convert that integer to an imprecise number.
An unsafe integer in a flag does not invalidate the complete rules branch.
The schema is copied from merged ddoghq/dd-source PR #40304 at commit `071c4ad`.
The schema says that an unsupported feature level must produce an informative flag-scoped error.
The evaluator returns a deterministic `PARSE_ERROR` for that case.
The generated message types are compiled into the package output.

The published package will expose `configuration.rules.response`.
Do not use the old planned name `rulesBased`.

The parser and `FlagsConfigurationWire` type are no longer package-root exports.
Import them from `@datadog/flagging-core/configuration`.
Keep `evaluateRulesBasedConfiguration` and `FlagsConfiguration` imports on the package root.
Browser customers use the package root for the full parser and provider.
Precomputed-only browser customers can use `@datadog/openfeature-browser/precomputed` to exclude Protobuf-ES.
React Native must use the flagging-core subpath directly.

The combined parser uses separate precomputed and rules parsers.
It merges the valid results from both parsers.
It can return `configurationError`, `rulesError`, or `precomputedError` with a valid sibling branch.
The combined evaluator from PR #336 now selects a valid matching capability before it returns a parse error.
Matching precomputed data has priority over rules.
Valid rules have priority over a precomputed mismatch or `precomputedError`.
React Native must use the same valid-sibling fallback behavior.

PR #344 validates the precomputed branch during parsing.
It records a branch error in `precomputedError`.
It removes malformed precomputed flags from the response and records their errors in `precomputed.flagErrors`.
It records an invalid complete envelope in `configurationError`.
It records an invalid rules entry or response in `rulesError`.
The combined evaluator returns `PARSE_ERROR` when no valid capability can take priority over an applicable error.

PR #344 now uses the Protobuf-ES base64 decoder directly.
It removed its stricter custom padding and canonical-encoding checks.
The producer must still add one base64 layer.
Do not depend on the parser to reject every non-canonical base64 spelling.

### 2.3 Expected features from upstream PR #336

PR #336 is stacked on PR #344.
It adds the browser `DatadogOfflineProvider` and a combined core `evaluate` function.
It proves that `configurationFromString` returns a rules object that the evaluator can use.
Its head is `6d3d6a4` as of 2026-08-10.
Its merge base is the current PR #344 head, `939da97`.
GitHub reports both PRs as mergeable.
PR #336 was restacked after the PR #344 rebase.
It has no new logical feature commit after the previous review.
Its current commits include valid-sibling fallback, optional configuration at construction, aligned parse errors, and standardized provider error events.
The default flagging-core entry point now exports `getFlagsConfigurationError` for lifecycle checks.
The full browser root and the protobuf-free browser `/precomputed` entry point export that provider.
The shared `DatadogCoreProvider` base is internal.
PR #336 says that this hierarchy follows the React Native integration.
PR #336 uses the current decoder contract and a real rules wire fixture.

Use the browser `DatadogOfflineProvider` as an integration reference.

- A rules configuration is valid for each compatible context.
- Matching precomputed data has priority.
- Rules data is the fallback after a precomputed mismatch.
- `onContextChange` does not fetch.
- The constructor takes no configuration.
- The customer supplies configuration later with `setConfiguration`.
- `setConfiguration` emits `ConfigurationChanged` for valid configuration.
- Recovery emits `Ready` before `ConfigurationChanged`.
- Unusable configuration emits `Error`.
- Error events use `{ message, errorCode? }`.
- No configuration returns `PROVIDER_NOT_READY`.
- A supplied but unusable configuration returns `PARSE_ERROR`.

React Native already follows this lifecycle behavior.
Keep the existing React Native public provider name.

React Native can continue to use its decoded precomputed `Map`.
It can call `evaluateRulesBasedConfiguration` only for the rules path.
This keeps current precomputed validation and native tracking behavior.
Do not adopt the combined `evaluate` function without a parity review.
The parity review must include the upstream capability selector, parse-error precedence, and native tracking.
Use `getFlagsConfigurationError` as the lifecycle parity contract after the dependency is published.

### 2.4 Merged protobuf service support from dd-source PR #34959

ddoghq/dd-source PR #34959 merged on 2026-07-28.
It adds protobuf content negotiation to the existing UFC endpoints:

- `/api/v2/feature-flagging/config/rules-based`
- `/api/v2/feature-flagging/config/rules-based/server`

The service returns raw `ufcpb.FlagsConfiguration` bytes when the `Accept` header contains `application/protobuf`.
It sets `Content-Type` to `application/protobuf`.
It adds `Vary: Accept` so the JSON and protobuf responses do not share one cache entry.
It continues to return the existing JSON response for other requests.

The service now builds one encoding-independent `FlagsConfiguration`.
It converts that configuration to JSON or protobuf.
Its ETag fingerprint is independent of the selected encoding and the build timestamp.
The client endpoint continues to select client-distribution flags.
The server endpoint continues to select server-distribution flags.

The service protobuf response is not a complete `FlagsConfigurationWire`.
It is the raw value that the portable wire stores in `rules.response`.
A configuration producer must:

1. Request `application/protobuf`.
2. Verify the response content type.
3. Base64-encode the raw response bytes one time.
4. Put the base64 string in a version `1` `rules.response` envelope.

The React Native SDK does not call this endpoint.
It does not add this envelope.
The customer or distribution layer supplies the complete portable wire to `configurationFromString`.

PR #34959 proves that the service code can generate the canonical protobuf payload.
It does not publish the flagging-core decoder.
It does not complete the service-to-portable-wire distribution path.

### 2.5 Merged feature-level contract from dd-source PR #40304

ddoghq/dd-source PR #40304 merged on 2026-08-01.
Its schema commit is `071c4ad`.
It says that an SDK must not evaluate a flag that requires an unsupported feature level.
The SDK must return an informative flag-scoped error instead of treating that flag as absent.

This PR changes schema comments only.
It does not change the protobuf wire encoding.
It does not change the service response or the portable envelope.
Use this revision as the canonical schema reference for fixtures.
Continue to use PR #34959 as the service producer reference.

### 2.6 Evaluation and tracking path

Select the path for each resolution.
Do not select the path only during reconciliation.

Use this order:

1. If precomputed data matches the effective context, use its decoded `Map` or its per-flag parse error.
2. Otherwise, if rules data exists, evaluate the rules.
3. Otherwise, if precomputed data exists, return `INVALID_CONTEXT`.
4. Otherwise, return `PROVIDER_NOT_READY`.

The protobuf evaluator preserves a missing targeting key.
It requires the key only when a shard uses the targeting key.
An empty string is a real key.

The evaluator returns `ResolutionDetails`.
The metadata can contain these fields:

- `allocationKey`
- `variationType`
- `doLog`
- `__dd_split_serial_id`
- `__dd_allocation_key`
- `__dd_do_log`
- `__dd_eval_timestamp_ms`

The evaluator reports both protobuf integer and numeric variations as the OpenFeature type `number`.
It does not preserve that distinction in `variationType`.
A safe protobuf integer becomes a JavaScript number during evaluation.
An unsafe protobuf integer returns `PARSE_ERROR`.
Do not track that error result.

The split serial ID and evaluation timestamp are server-side tracing metadata.
The current Android and iOS mobile exposure APIs do not accept these fields.
The native mobile SDK creates the exposure timestamp.

The `extraLogging` field is deprecated upstream.
Do not wait for flagging-core to return it.
Use an empty object only where the current Android bridge requires it.

The rules evaluator is pure.
React Native must call the existing native tracking bridge after each successful assignment.
Native code applies `doLog` to exposure events.
Native code also applies its RUM and evaluation settings.

### 2.7 Wire format and compatibility

Use the PR #344 contract:

- Wire version `1`
- Field `rules`
- A protobuf rules response encoded as base64
- Raw-byte SHA salts
- Raw 32-byte SHA digests
- `sha256(salt || UTF8(String(attributeValue)))`

Keep these transport formats separate:

- The dd-source endpoint returns raw protobuf bytes.
- `FlagsConfigurationWire` is a JSON envelope.
- `rules.response` is one base64 encoding of the raw protobuf bytes.
- The legacy endpoint JSON response is not a rules wire.

Do not pass the raw protobuf response directly to `configurationFromString`.
Do not pass the legacy JSON response as `rules.response`.
Do not base64-encode an existing base64 string again.

Keep all decoding in `@datadog/flagging-core`.
Do not add a rules decoder to React Native.
PR #344 now serializes decoded precomputed and rules configurations.
Use `configurationToString` only through the upstream configuration entry point.
Add a rules round-trip contract test.
Confirm that the round trip preserves unknown protobuf fields.

PR #344 adds Protobuf-ES to the flagging-core configuration entry point and to the full browser package root.
`@bufbuild/protobuf` is a runtime dependency.
The schema generators are development dependencies.
Its browser measurement reports an increase of 6,229 bytes minified and 2,070 bytes gzipped.
These increases are 9.6 percent and 10.4 percent.
The React Native compatibility code accounts for 1,106 minified bytes and 459 gzipped bytes.
The upstream decision accepts this cost for the full browser capability.
The default flagging-core entry point no longer imports the parser or Protobuf-ES.
The new `@datadog/flagging-core/precomputed` entry point parses and serializes only precomputed data.
It ignores rules and does not load Protobuf-ES.
The new `@datadog/openfeature-browser/precomputed` entry point exposes the provider and precomputed parser without Protobuf-ES.
Its React Native smoke test bundles Android and iOS with React Native 0.76.9.
The test uses the packed flagging-core package and the export-condition order from this repository.
The test runs the Android bundle under Node without `TextEncoder`, `TextDecoder`, or `BigInt`.
It parses, serializes, and evaluates one static boolean flag and one safe integer flag.
The shared safe-integer conversion no longer calls the global `BigInt` function.
The smoke test does not evaluate an unsafe integer, shard count, or shard range without `BigInt`.
It also checks that the default flagging-core and precomputed entry points do not load `@bufbuild/protobuf`.
It does not run the bundle in Hermes or JSC.

The React Native SDK currently re-exports configuration parsing from its package root.
Thus, the upstream subpath does not by itself prove that the React Native root bundle excludes Protobuf-ES.
Measure the React Native root import and decide whether to keep the current API or add a React Native configuration subpath.

Pin React Native to the released flagging-core version that contains PR #344.
Verify the final version and package exports after publication.

## 3. Upstream gaps

### G1 — Rules wire parsing and parsed field

**Status:** Implemented in PR #344. Publication is pending.

Use `FlagsConfiguration.rules.response`.
Do not use `rulesBased`.
Import wire parsing from `@datadog/flagging-core/configuration`.
Do not import it from the package root.
Use an `npm pack` package during development.
After publication, bump `@datadog/flagging-core` in `packages/core/package.json`.

### G2 — Protobuf rules response

**Status:** The service encoder code is merged. Decoder publication, distribution packaging, and runtime verification are pending.

PR #344 includes the canonical schema, generated message types, and the Protobuf-ES parser.
React Native must use the opaque parser.
Do not parse protobuf in this repository.

PR #344 uses the Protobuf-ES base64 decoder.
It no longer guarantees strict rejection of non-canonical padding.
Treat one standard base64 encoding as a producer contract.
Do not add a second base64 decoder or stricter validation in React Native without a cross-SDK protocol decision.

PR #344 preserves protobuf integer values as `bigint` during parsing.
It does not reject the complete rules branch only because one flag contains an unsafe integer.
The evaluator returns `PARSE_ERROR` when an integer variation, shard count, or range cannot be represented safely as a JavaScript number.
Do not convert these values in React Native.

PR #344 no longer calls global `BigInt(...)` in its safe-integer check.
Its React Native smoke test evaluates a safe integer without global `BigInt`.
The shared conversion also covers shard counts and ranges.
Keep React Native contract tests for safe and unsafe integer variations, shard counts, and ranges without global `BigInt`.

ddoghq/dd-source PR #34959 serves the canonical raw protobuf response.
It preserves the JSON response when the caller does not request protobuf.
The raw protobuf response is not the portable wire.

Identify the component that creates the version `1` envelope.
That component must request `application/protobuf`, validate the content type, and put one base64 encoding of the response bytes in `rules.response`.
Do not make the React Native SDK own this transport conversion.

The npm package contains compiled CommonJS, ESM, and declaration outputs.
It does not contain the raw `.proto` source.
The runtime does not need the raw source.
Keep the schema and generation instructions in the upstream repository for review and regeneration.
Run the packed package in Hermes and JSC.
Include safe and unsafe 64-bit integer fixtures.

### G3 — Package exports

**Status:** Implemented. Publication is pending.

The package root exports the evaluator and shared configuration types.
The opt-in `@datadog/flagging-core/configuration` subpath exports:

- `FlagsConfigurationWire`
- `configurationFromString`
- `configurationToString`

The package root does not export the parser.
Its default entry point does not load Protobuf-ES.
The `@datadog/flagging-core/precomputed` subpath exports the same wire function names for precomputed data only.
It ignores rules and does not load Protobuf-ES.
The full browser package root exports the complete parser and provider.
The `@datadog/openfeature-browser/precomputed` subpath is the protobuf-free browser capability.
Do not use the removed planned browser `/configuration` subpath.
PR #344 populates `rules`.
PR #336 adds the optional combined `evaluate` function.
PR #336 exports `DatadogOfflineProvider` from the full browser root and browser `/precomputed` subpath.
It does not export the shared `DatadogCoreProvider` base.

### G4 — Native tracking metadata

**Status:** React Native adapter work. It is not an upstream blocker.

The current native bridge accepts a synthesized successful assignment.
It already sends the fields that the current mobile exposure APIs use:

- Flag key
- Allocation key
- Variation key
- Value
- Reason
- `doLog`
- Evaluation context

The evaluator does not log by itself.
Call the existing bridge after each successful rules assignment.
Do not stop the bridge call when `doLog` is false.
Native code applies the exposure policy.

Use an internal `TrackableAssignment` type.
Do not use `FlagCacheEntry` as the rules result type.
Use an empty `extraLogging` object for Android bridge compatibility.

Confirm with the mobile and backend owners that rules exposures use the current mobile event contract.
If they require split serial ID, evaluator timestamp, or error evaluations, add a new native tracking API.

### G5 — Bundle size and JavaScript engine support

**Status:** An upstream opt-in boundary exists. React Native measurement and runtime verification remain.

PR #343 removes an unnecessary dependency.
PR #344 measures the browser protobuf cost.
PR #344 also adds a React Native Metro smoke test.
The upstream PR accepts the measured increase for the full browser entry point.
It verifies that the default flagging-core entry point and both precomputed capability entry points do not load Protobuf-ES.

Measure the packed dependency in this repository.
Measure the React Native package root separately from the upstream configuration and precomputed subpaths.
Run the rules flow in Hermes and JSC.
Test the supported React Native version range.
Verify that protobuf `bigint` values parse in each supported engine.
Verify integer and shard evaluation when global `BigInt` is unavailable.

Do not use a dynamic import.
Metro does not create a smaller release bundle from this import.

The upstream configuration subpath contains both precomputed and rules parsing.
It includes Protobuf-ES.
The upstream precomputed subpath ignores rules and excludes Protobuf-ES.
Decide whether React Native needs its own optional configuration subpath only after measurement.

### G6 — Unsupported obfuscation operators

**Status:** Implemented with evaluation-time semantics in PR #344.

PR #344 supports the SHA-256 operators.
The protobuf schema contains a per-flag minimum feature level.
dd-source PR #40304 says that an unsupported level must produce a flag-scoped error.
The parser preserves decoded flag data.
The evaluator returns `PARSE_ERROR` and a deterministic message when the requested flag uses unsupported or invalid data.
It keeps other valid rules flags.

Do not add a second operator list in React Native.
Do not invalidate the complete rules branch.
Preserve the upstream `PARSE_ERROR` result for an invalid flag.
Matching precomputed data still has priority.

### G7 — Untrusted rules and regular expressions

**Status:** Evaluation-time structural validation is mostly implemented. Regular-expression safety remains.

PR #344 validates the requested flag and the data that evaluation reaches.
The evaluator reports invalid data as `PARSE_ERROR`.
It rejects malformed indexes, values, ranges, and hashes.
It requires composite conditions to reference only preceding conditions.
It returns deterministic error messages that do not include attacker-controlled indexes or feature levels.
It ignores unknown protobuf fields when known fields still define a supported value.
It reports a per-flag error when an unknown enum or oneof leaves no supported value.
It preserves unsafe protobuf integers during parsing and reports the affected flag during evaluation.

Do not duplicate these evaluation checks in React Native after publication.

Do not claim that structural validation stops ReDoS.
PR #344 compiles regular expressions lazily and caches the result by configuration and regex index.
This reduces repeated compilation.
It does not make hostile expressions safe.
Select one regular-expression protection:

- An upstream safe-regex guarantee
- A static safe-regex policy
- A bounded regular-expression engine

Run hostile-expression tests in a separate process.
Set a time limit for that process.

Treat the parsed configuration as immutable.
The regular-expression cache assumes that the parsed regex table does not change after first use.
Add mutation tests for the public configuration object.

### G8 — Missing targeting key

**Status:** Decided in PR #344.

Missing and empty targeting keys are different.
Preserve `undefined` for the rules path.
An empty string is a real key.
Return `TARGETING_KEY_MISSING` only when a shard requires a missing key.
Relax the internal context type and error union.

### G9 — Prototype-unsafe flag lookup

**Status:** Implemented in PR #344. Publication is pending.

PR #344 adds a shared own-property helper.
The legacy rules evaluator and the protobuf evaluator use it.
PR #336 uses it for the combined evaluator precomputed path.

Reserved names such as `toString`, `__proto__`, and `constructor` now return `FLAG_NOT_FOUND` when they are not real flag keys.
The React Native precomputed cache also uses a `Map`.

Pin the released dependency that contains this fix.
Keep reserved-name contract tests in React Native.
Do not add a duplicate local guard after that dependency is available.

### G10 — OpenFeature type dependency

**Status:** Decision required.

The flagging-core declaration files import `@openfeature/core`.
Flagging-core lists that package as a development dependency, not as a runtime or peer dependency.
Local hoisting hides this problem.

Select one solution:

1. Keep OpenFeature types in `react-native-openfeature`.
2. Pass compatible internal context and logger types to core.
3. Or, add an explicit core dependency.
4. If you add the dependency, fix the flagging-core package dependency too.

Do not widen the public `FlagsClient.get*Details` methods.
Prefer a separate internal entry point.

### G11 — Synchronous SHA-256

**Status:** Implemented in PR #344. Runtime verification remains.

PR #344 adds a synchronous JavaScript SHA-256 implementation.
It uses `Uint8Array` and `DataView`.
It does not use Node crypto, Web Crypto, or a browser-only API.

Run it in Hermes and JSC.
Measure evaluation time in release builds.

### G12 — Portable salted-hash protocol

**Status:** Mostly defined in PR #344.

PR #344 defines these items:

- Salt as raw protobuf bytes
- Digest as raw 32-byte values
- Salt before the attribute value
- Direct concatenation without a separator
- UTF-8 encoding
- JavaScript string conversion for primitive values
- False for null or missing attributes
- `NOT_ONE_OF_SHA256` behavior

The latest protobuf evaluator does not validate the digest length.
A malformed digest becomes a non-match.
For `NOT_ONE_OF_SHA256`, that non-match can make the condition match.
Add 32-byte digest validation upstream before publication.
It does not define a salt length or reject an empty salt.
It does not apply configuration-size, condition-count, or value-count limits.
It does not publish canonical cross-SDK protocol vectors.

Confirm the salt policy.
Add size limits.
Publish cross-SDK vectors.

## 4. React Native implementation

### Step 0 — Complete prerequisites

- [x] Merge raw protobuf response support in dd-source.
- [x] Merge the flag-scoped feature-level contract in dd-source PR #40304.
- [ ] Identify the component that packages the raw service response into `FlagsConfigurationWire`.
- [ ] Confirm that the producer requests and receives `application/protobuf`.
- [ ] Confirm that the producer base64-encodes the raw bytes one time in `rules.response`.
- [ ] Publish flagging-core with rules wire parsing.
- [ ] Publish the parsed `rules` field.
- [ ] Publish the SHA operators and synchronous SHA-256 implementation.
- [ ] Restore 32-byte SHA digest validation in the upstream protobuf evaluator.
- [ ] Confirm the remaining salt and size-limit rules.
- [ ] Confirm the current mobile exposure contract.
- [ ] Pin the flagging-core release that contains the own-property lookup fix.
- [ ] Select a regular-expression safety policy.
- [ ] Bump `@datadog/flagging-core` in `packages/core`.
- [ ] Update `yarn.lock`.
- [ ] Change parser imports to `@datadog/flagging-core/configuration`.
- [ ] Keep evaluator and shared configuration imports on the package root.
- [ ] Verify that `@datadog/flagging-core/precomputed` ignores rules and excludes Protobuf-ES.
- [ ] Decide whether the React Native package root continues to export configuration parsing.
- [ ] Verify all final field names, versions, and exports.
- [ ] Record the exact flagging-core version.

### Step 1 — Define the parsed configuration type

Do not export a named rules or UFC type.

`ParsedFlagsConfiguration` is already public.
It is an alias of upstream `FlagsConfiguration`.
The new upstream type exposes `rules.response`.

Select one API policy:

1. Accept structural visibility and remove claims of opacity.
2. Make `ParsedFlagsConfiguration` a branded type.

The second policy is a breaking type change.
Do not claim that the type is opaque unless you enforce opacity.

### Step 2 — Use the upstream wire parser

Do not add React Native parsing code.
Import and re-export the upstream conversion functions from `@datadog/flagging-core/configuration`.
Do not import them from the flagging-core package root.

The parser input is the complete version `1` JSON envelope.
It is not the raw HTTP protobuf response.

Add a parser test for a rules wire.
Build the fixture from canonical raw protobuf bytes.
Base64-encode those bytes one time in `rules.response`.
Use the envelope encoding from the pinned upstream version.
Confirm that `configurationToString` round-trips a configuration that contains rules.
Confirm that the round trip preserves unknown protobuf fields.
Do not add stricter base64 validation in React Native.
The upstream parser now uses the Protobuf-ES base64 decoder.

### Step 3 — Load and validate the configuration

Keep the complete parsed `FlagsConfiguration`.
Decode precomputed flags one time into a `Map`.
Keep `configurationError`, `rulesError`, `precomputedError`, and `precomputed.flagErrors`.
Keep the parsed protobuf rules object.

Use this path order:

1. Matching precomputed data
2. Valid rules data
3. Error

Select the path for each resolution.
Do not freeze the selection during reconciliation.

The upstream parser decodes each wire branch independently.
It can retain a branch error with valid sibling data.
Keep a valid sibling when the other branch is malformed.
Follow the PR #336 capability precedence.
When precomputed data matches, return its per-flag `PARSE_ERROR` before `FLAG_NOT_FOUND`.
Do not fall back to rules for that key.
Return `PROVIDER_NOT_READY` only when no configuration was supplied.
Return `PARSE_ERROR` when a supplied configuration has no usable branch.
Use the upstream error order: `configurationError`, `rulesError`, then `precomputedError`.
Use the upstream `getFlagsConfigurationError` helper for lifecycle checks when it can replace local compatibility code without changing native precomputed behavior.

Do not add a second structural rules validator.
Trust the evaluator to report unsupported or malformed rules data as `PARSE_ERROR` when evaluation reaches it.
Trust the released evaluator to perform own-property lookup.
Keep the reserved-name contract tests from G9.
Apply the size policy from G12 after the policy is defined.

### Step 4 — Reconcile the context

For valid rules, accept every external context.
Set `configurationStatus` to `ready`.
Do not fill `flagsCache` for rules.

Preserve a missing targeting key.
Do not replace it with an empty string.

Keep the precomputed behavior.
Return `INVALID_CONTEXT` only when no usable rules fallback exists.

### Step 5 — Evaluate a flag

Call the rules-only evaluator:

```ts
const details = evaluateRulesBasedConfiguration(
    rulesResponse,
    type,
    key,
    defaultValue,
    ofContext,
    logger
);
```

Convert the React Native context to a flat OpenFeature context.
Pass the effective resolution context.
Pass the resolution logger.

The web SDK uses the static-context model.
It has no invocation context.
The effective context comes from global or domain state.
Web SDK 1.8 freezes the hook context.
A `before` hook cannot replace the resolution context.

Check the precomputed context for every resolution.
This check keeps the path decision correct for the effective context.
If it matches, check `precomputed.flagErrors` before the decoded `Map`.
Preserve the upstream `PARSE_ERROR` and `errorMessage`.

Resolve the OpenFeature dependency boundary before implementation.
Prefer compatible internal types and an internal `FlagsClient` method.

Decide the `id` policy.
The current evaluator lets a custom `id` replace the targeting-key `id`.
Sharding still uses `targetingKey`.
This can use two subject identifiers.

The recommended policy reserves `id` for `targetingKey`.
Drop or reject a customer `id` attribute.
Test that targeting and sharding use the same identifier.

Map all evaluator results to `FlagDetails`.
The evaluator already returns `FLAG_NOT_FOUND`.
Do not create this error again in React Native.
Preserve `PARSE_ERROR` and its `errorMessage`.
Do not coerce a protobuf `bigint` in React Native.
Let the evaluator return `PARSE_ERROR` for an unsafe integer.

Verify that the pinned upstream evaluator returns `FLAG_NOT_FOUND` for an absent reserved-name key.

Convert a successful rules result to an internal `TrackableAssignment`.
Track every successful assignment through the native bridge.
Do not use `doLog` to stop the bridge call.
Native code uses `doLog` only for the exposure event.
RUM and evaluation telemetry use separate settings.
Use an empty `extraLogging` object for Android bridge compatibility.

Track only a real assigned variant.
Do not track these results:

- `DISABLED`
- Unmatched `DEFAULT`
- No-variant `DEFAULT`
- `TYPE_MISMATCH`
- `FLAG_NOT_FOUND`
- `PARSE_ERROR`
- Error results

Keep the online cache path unchanged.
Keep the precomputed cache path unchanged.

### Step 6 — Support configurations with two branches

Use matching precomputed data first.
Use rules only when precomputed data is absent or mismatched.
Call the rules evaluator with only the UFC.

Do not pass precomputed data to the rules evaluator.
Do not bypass `decodePrecomputedFlags`.

Create one shared result-mapping helper.
Use it to build `FlagDetails` and `TrackableAssignment`.
Do not put a rules result in the precomputed cache.

Measure these bundle baselines separately:

1. Current baseline
2. Default flagging-core entry point
3. Flagging-core configuration subpath
4. Flagging-core precomputed subpath
5. React Native root SDK import
6. Online flags
7. Precomputed offline flags
8. Dynamic offline flags
9. Post-protobuf dependency
10. Post-SHA dependency

Do not add a dynamic import.
The upstream configuration subpath is the static opt-in boundary.
Consider a React Native subpath only when measurements require it.

### Step 7 — Update the offline provider

Keep `initialize` network-free.
Keep `onContextChange` network-free.

For valid rules, reconciliation returns `ready`.
Do not use the precomputed mismatch error for valid rules.

Preserve an empty provider context.
Return `TARGETING_KEY_MISSING` only when the selected rule needs a targeting key.

Update the class comment.
Remove the precomputed-only instruction that forbids `setContext`.
Explain that `setContext` is required for dynamic rules.

Keep the existing provider event mapping.
PR #336 now confirms the same mapping in the browser provider.
On recovery, emit `READY` before `CONFIGURATION_CHANGED`.
Emit `CONFIGURATION_CHANGED` for each valid replacement.
Emit `PROVIDER_ERROR` for an invalid replacement.
Keep the existing React Native public provider name.
Test all transitions.

Do not add a separate SDK gate.
Use different opt-in explanations for each configuration source.

For a Datadog-generated configuration:

- The platform distribution control is the opt-in.
- The Obfuscation RFC is still a first draft.
- Scoped client tokens do not exist yet.

For a customer-supplied configuration:

- Platform controls do not apply.
- `setConfiguration(rules)` is the opt-in.
- The customer must supply client-appropriate rules.

Record product and security approval.

### Step 8 — Update exports, examples, and documentation

Do not export a named rules or UFC type.
Complete the D10 opacity decision.

Rewrite the offline README section.
Show the precomputed flow and the rules flow separately.
Apply each warning only to the applicable flow.

Add a rules example to both example applications.
Show two calls to `setContext`.
Show that the values can change.

Update the provider class comment.

Document all data that remains visible:

- Flag names
- Variant names
- Attribute names
- Variant values
- Regex operands
- Numeric operands
- Version operands
- Decodable configuration structure
- Allocation keys
- Split serial IDs
- `doLog`
- Precomputed `extraLogging`, when present
- Environment metadata
- Timestamps
- Salts
- Digests
- Guessable hashed membership values

Do not call this data confidential.
A public salt prevents reusable precomputation.
It does not stop offline guessing of low-entropy values.

## 5. Imports and internal interfaces

Add this value import from `@datadog/flagging-core`:

- `evaluateRulesBasedConfiguration`

Keep the existing wire and precomputed imports.
Derive the rules response type from `FlagsConfiguration['rules']`.

Do not import OpenFeature types directly into core unless D11 selects that policy.
Prefer compatible internal context and logger interfaces.
Use an internal `FlagsClient` entry point.

Do not export a named rules configuration type.

Add one internal context adapter.
Convert between these forms:

```text
React Native: { targetingKey, attributes }
OpenFeature:  { targetingKey, ...attributes }
```

No new native API is required.
The existing tracking bridge accepts `TrackableAssignment`.
Add a native API only if the confirmed mobile contract requires more fields.

## 6. Test plan

### 6.1 Wire and configuration tests

- [ ] Parse a rules wire into `rules.response`.
- [ ] Use raw protobuf bytes produced by the dd-source schema as a fixture.
- [ ] Record dd-source PR #40304 commit `071c4ad` as the fixture schema revision.
- [ ] Record dd-source PR #34959 as the service producer path.
- [ ] Confirm that base64-decoding `rules.response` returns those exact bytes.
- [ ] Confirm that the fixture uses one base64 layer.
- [ ] Confirm that the SDK does not require strict canonical base64 padding.
- [ ] Do not copy the removed upstream base64 validator into React Native.
- [ ] Round-trip a rules configuration through `configurationToString`.
- [ ] Parse a wire with both branches.
- [ ] Preserve `configurationError` for malformed wire data.
- [ ] Preserve `rulesError` for a malformed rules entry or response.
- [ ] Return `PARSE_ERROR` when the loaded configuration has no usable capability.
- [ ] Detect a changed upstream field name or version.
- [ ] Test the published protobuf fixture.
- [ ] Ignore an unknown protobuf field when a supported known value remains.
- [ ] Return `PARSE_ERROR` when an unknown enum or oneof leaves no supported value.
- [ ] Preserve an out-of-range protobuf integer in the parsed rules object.

### 6.2 Load and reconciliation tests

- [ ] Load rules only and reach `ready` with an empty context.
- [ ] Change context without a native fetch.
- [ ] Reset context without a native fetch.
- [ ] Return `PROVIDER_NOT_READY` when no configuration exists.
- [ ] Use matching precomputed data before rules.
- [ ] Use rules after a precomputed mismatch.
- [ ] Return `INVALID_CONTEXT` for a precomputed-only mismatch.
- [ ] Return `PARSE_ERROR` for an invalid rules flag.
- [ ] Preserve the deterministic upstream validation message.
- [ ] Keep valid flags when another rules flag has invalid data.
- [ ] Keep valid rules flags when another flag contains an unsafe integer.
- [ ] Keep valid precomputed data when the rules branch is malformed.
- [ ] Keep valid rules data when `precomputedError` is present.
- [ ] Keep valid precomputed data when `rulesError` is present.
- [ ] Return a branch parse error only when no valid capability applies.
- [ ] Preserve `precomputed.flagErrors` for matching precomputed data.
- [ ] Return the precomputed `PARSE_ERROR` before `FLAG_NOT_FOUND`.
- [ ] Do not fall back to rules for a malformed flag in matching precomputed data.

### 6.3 Rules evaluation tests

- [ ] Evaluate boolean, string, number, and object flags.
- [ ] Return different values for contexts in different buckets.
- [ ] Return `FLAG_NOT_FOUND` for an absent flag.
- [ ] Return `TYPE_MISMATCH` for the wrong resolver.
- [ ] Return `FLAG_NOT_FOUND` for absent reserved-name keys.
- [ ] Apply the selected `id` policy.
- [ ] Return `DISABLED` for a disabled flag.
- [ ] Return `DEFAULT` when no allocation matches.
- [ ] Return `DEFAULT` when no variant exists.
- [ ] Test time partitions before and after each range boundary.
- [ ] Return `TARGETING_KEY_MISSING` when a shard requires a missing key.
- [ ] Evaluate without a targeting key when the selected rule does not need it.
- [ ] Treat an empty string as a real targeting key.
- [ ] Evaluate a safe protobuf integer as an OpenFeature number.
- [ ] Return `PARSE_ERROR` for an integer outside the JavaScript safe range.
- [ ] Do not return a rounded or imprecise integer value.

### 6.4 Per-resolution context tests

- [ ] Load matching precomputed data and rules data.
- [ ] Change the global context.
- [ ] Change a domain context.
- [ ] Confirm that a mismatched precomputed branch is not used.
- [ ] Confirm that rules are used after the mismatch.
- [ ] Confirm Web SDK 1.8 hook-context behavior.

### 6.5 Tracking tests

- [ ] Call native tracking for every successful assignment.
- [ ] Call native tracking when `doLog` is false.
- [ ] Include the variation key.
- [ ] Include the allocation key.
- [ ] Include the string variation value.
- [ ] Include an empty `extraLogging` object for Android compatibility.
- [ ] Confirm that native code emits an exposure only when `doLog` is true.
- [ ] Confirm that native RUM and evaluation settings still apply.
- [ ] Do not track `DISABLED`.
- [ ] Do not track unmatched `DEFAULT`.
- [ ] Do not track `FLAG_NOT_FOUND`.
- [ ] Do not track `TYPE_MISMATCH`.
- [ ] Do not track `PARSE_ERROR`.
- [ ] Do not track error results.

### 6.6 Validation and security tests

- [ ] Use upstream fixtures for malformed protobuf data.
- [ ] Confirm that the parser preserves decoded malformed flag data.
- [ ] Confirm that evaluating the malformed flag returns `PARSE_ERROR`.
- [ ] Confirm that a composite condition cannot reference itself or a later condition.
- [ ] Confirm that a valid earlier condition reference evaluates.
- [ ] Confirm that a bad shard range returns `PARSE_ERROR`.
- [ ] Confirm that an unsafe shard count or range returns `PARSE_ERROR` for its flag.
- [ ] Run safe and unsafe integer variation tests without global `BigInt`.
- [ ] Run safe and unsafe shard count and range tests without global `BigInt`.
- [ ] Require `PARSE_ERROR`, not `GENERAL`, for invalid integer data without global `BigInt`.
- [ ] Confirm that supported known data remains usable when the protobuf contains unknown fields.
- [ ] Confirm that rules serialization preserves unknown protobuf fields.
- [ ] Test inherited property names.
- [ ] Test mutation of the source object after load.
- [ ] Run a hostile regex in an isolated process.
- [ ] Stop the hostile-regex process at its time limit.
- [ ] Confirm that repeated evaluation reuses the lazy compiled-regex cache.
- [ ] Confirm the behavior when a parsed regex table is mutated after first evaluation.
- [ ] Verify the selected ReDoS protection.
- [ ] Confirm that an unsupported flag becomes `PARSE_ERROR`.
- [ ] Confirm that an unsupported feature level returns flag-scoped `PARSE_ERROR`.
- [ ] Confirm that an unsupported flag does not cause `FLAG_NOT_FOUND` or a silent `DEFAULT`.
- [ ] Test a newer cached configuration with an older evaluator.
- [ ] Reject malformed SHA digests.
- [ ] Apply the selected empty-salt policy.
- [ ] Reject oversized SHA conditions.

### 6.7 Mixed-configuration tests

- [ ] Keep valid precomputed data when rules protobuf is malformed.
- [ ] Keep valid rules data when precomputed JSON is malformed.
- [ ] Keep valid rules data when the parser returns `precomputedError`.
- [ ] Keep valid precomputed data when the parser returns `rulesError`.
- [ ] Parse both valid branches from one wire.
- [ ] Return `PARSE_ERROR` when a supplied configuration has no usable branch.
- [ ] Return `PROVIDER_NOT_READY` when no configuration was supplied.

### 6.8 Obfuscation tests

- [ ] Preserve string attributes through context processing.
- [ ] Use the canonical SHA test vectors.
- [ ] Test number conversion.
- [ ] Test boolean conversion.
- [ ] Test an empty string.
- [ ] Test null and missing attributes.
- [ ] Test `NOT_ONE_OF_SHA256`.
- [ ] Confirm byte-identical results across SDK implementations.

### 6.9 Provider tests

- [ ] Load rules before provider registration.
- [ ] Reach `READY`.
- [ ] Change from context A to context B.
- [ ] Confirm that no fetch occurs.
- [ ] Confirm that the evaluated value changes.
- [ ] Do not require a `RECONCILING` event.
- [ ] Emit `CONFIGURATION_CHANGED` for valid replacement data.
- [ ] Emit `READY` when valid data recovers an error.
- [ ] Emit `READY` before `CONFIGURATION_CHANGED` during recovery.
- [ ] Emit `PROVIDER_ERROR` for invalid data.
- [ ] Return the same result for the same context and configuration.
- [ ] Keep all precomputed regression tests.

### 6.10 Integration and performance tests

- [ ] Parse a real rules wire.
- [ ] Evaluate several flags and contexts.
- [ ] Verify native tracking calls.
- [ ] Use a dd-source protobuf fixture in a version `1` portable wire.
- [ ] Verify that the fixture represents the client distribution channel.
- [ ] Link the fixture to the source schema or generator revision.
- [ ] Measure all bundle baselines from Step 6.
- [ ] Measure the protobuf addition separately.
- [ ] Confirm that the default flagging-core entry point does not load Protobuf-ES.
- [ ] Confirm that the flagging-core precomputed subpath ignores rules and does not load Protobuf-ES.
- [ ] Measure whether the React Native package root loads Protobuf-ES.
- [ ] Measure the synchronous SHA addition separately.
- [ ] Run rules evaluation with Hermes.
- [ ] Run rules evaluation with JSC.
- [ ] Test the supported React Native version range.
- [ ] Confirm that no Node or browser-only crypto API is required.
- [ ] Measure repeated rules evaluation in a release build.

## 7. Risks

### R1 — Unpublished upstream configuration support

PR #344 and PR #336 are not published.
Their APIs can change.
PR #336 is based on PR #344 head `939da97`.
Its head is `6d3d6a4`.
GitHub reports both PRs as mergeable.
PR #344 still calls the follow-up `CoreProvider` in its description.
Use the current PR #336 `DatadogOfflineProvider` name.
Keep the React Native integration small.
Use one dependency update as the integration point.
Recheck both heads before the dependency is pinned.

### R2 — Two evaluation paths

Precomputed data uses a `Map`.
Rules data uses the rules evaluator.
Reason codes and type checks can differ.
Use one result-mapping helper.
Test the selection order.

### R3 — Tracking parity

The rules evaluator does not produce a native assignment.
The React Native adapter must call the current native bridge.
Confirm that the current mobile exposure contract is sufficient.

### R4 — Bundle size

The current engine already ships.
PR #344 keeps the evaluator on the default flagging-core entry point and moves protobuf parsing to an opt-in flagging-core subpath.
The full browser package root now includes protobuf parsing.
The browser and flagging-core precomputed subpaths exclude Protobuf-ES.
The React Native package root can still include that subpath through its public re-export.
Measure the packed dependency in this repository.

### R5 — Hermes and JSC support

Test sharding, MD5, protobuf, protobuf `bigint`, and SHA-256.
Test release builds across the supported React Native range.

### R6 — Context and logger transfer

The provider currently discards its context and logger parameters.
Transfer the effective values through a safe internal boundary.
Resolve D9 and D11 first.

### R7 — Opt-in and configuration source

Platform controls apply only to Datadog-generated configurations.
Customer-supplied configurations bypass those controls.
Document both cases.

### R8 — Wire changes

The service response and the portable wire are different formats.
The service returns raw protobuf bytes.
The portable wire stores one base64 encoding of those bytes in a JSON envelope.
The service returns legacy JSON when the producer does not request protobuf.

A producer can accidentally use the JSON fallback, pass raw protobuf directly, or encode base64 twice.
Identify the producer and add a byte-for-byte contract fixture.
Pin the released dependency.
Add a contract test.

### R9 — Obfuscation

PR #344 implements the required operators and SHA-256 function.
The remaining protocol limits and cross-SDK vectors are in G12.
Do not describe salted SHA-256 as confidentiality.
It does not protect guessable values from offline enumeration.

### R10 — Untrusted input and ReDoS

The upstream evaluator validates malformed protobuf flag data when the affected key is evaluated.
It returns a deterministic `PARSE_ERROR`.
It compiles and caches regular expressions lazily.
Hostile regex data can block the JavaScript thread.
Select a regex protection.

### R11 — Missing targeting key

The public React Native type requires a targeting key.
The internal rules context must permit a missing key.
Do not synthesize an empty key.

### R12 — Per-resolution path selection

Global and domain contexts can change.
Select the path with the effective resolution context.
Do not claim that a Web SDK 1.8 hook can replace this context.

### R13 — OpenFeature dependency

Current type resolution depends on workspace hoisting.
Complete D11 before you transfer OpenFeature types into core.

### R14 — Prototype lookup

PR #344 fixes reserved-name lookup.
Pin the release that contains the fix.
Keep React Native contract tests to prevent a dependency regression.

### R15 — Subject identifier

Rule matching and sharding can use different identifiers.
Complete D9 before implementation.

### R16 — Public configuration type

The public alias exposes the upstream structure.
Complete D10 before you claim that the type is opaque.

## 8. Decisions

### D3 — Native tracking

Call native tracking for every successful assignment.
Do not stop the bridge call when `doLog` is false.
Do not track default or error results.
Use `TrackableAssignment`.
Use an empty `extraLogging` object for Android compatibility.
Use the current native API unless the mobile contract review requires more fields.

### D4 — Evaluation paths

Keep two paths.
Use the decoded `Map` for precomputed data.
Use `evaluateRulesBasedConfiguration` for rules data.
Select the path for each resolution.

### D5 — Bundle size

The current rules engine already ships.
Measure the PR #344 dependency change in this repository.
Do not use dynamic import as a size control.
Use the static configuration subpath from PR #344.
Decide the React Native export surface after measurement.

### D6 — Security opt-in

Do not add an additional provider gate.

For Datadog-generated data, use the platform distribution policy.
For customer-supplied data, treat `setConfiguration` as the opt-in.
Document that the customer must supply client-appropriate rules.

### D7 — Obfuscation

The design uses salted SHA-256 membership operators and binary structure.
It does not use a separate obfuscated payload mode.
React Native does not pre-hash customer context.

Do not claim complete support until G12 is complete.
Let the upstream evaluator report unsupported flag data.
Return the upstream `PARSE_ERROR` for an unsupported flag.
Use canonical test vectors.

A public salt stops reusable precomputation.
It does not stop guesses of low-entropy values.
Document all visible UFC data.

### D8 — Targeting key

**Decision:** Missing and empty keys are different.

Preserve `undefined` in the internal rules context.
Treat an empty string as a real key.
Return `TARGETING_KEY_MISSING` only when the selected shard requires a key.

### D9 — `id` and `targetingKey`

**Recommended decision:** Reserve `id` for `targetingKey`.

Drop a customer `id` attribute in the flat adapter.
Make rule matching and sharding use one subject identifier.

### D10 — Configuration opacity

**Status:** Open.

Select one policy:

1. Accept the public structural type.
2. Introduce a branded opaque type.

The branded type can break type compatibility.

### D11 — OpenFeature dependency boundary

**Preferred decision:** Keep OpenFeature types out of core.

Use compatible internal context and logger types.
Use an internal `FlagsClient` entry point.

Alternative:

- Add an explicit core OpenFeature dependency.
- Fix the flagging-core published dependency.

### D12 — Service transport boundary

**Decision:** Keep service transport outside the React Native SDK.

The React Native SDK accepts the complete portable wire through the existing configuration API.
It does not fetch the dd-source endpoint.
It does not convert the raw protobuf HTTP response into `FlagsConfigurationWire`.

The configuration producer owns content negotiation, content-type validation, and the single base64 layer.

## 9. Open questions

### Q1 — Published flagging-core version

- [ ] Identify the version that contains rules wire parsing.
- [x] Confirm the rules field name: `rules`.
- [x] Confirm the wire version: `1`.
- [x] Confirm that PR #344 `configurationFromString` populates the rules branch.
- [x] Confirm the parser export: `@datadog/flagging-core/configuration`.
- [x] Confirm that `evaluateRulesBasedConfiguration` remains a package-root export.

### Q2 — Protobuf implementation

- [x] Add the `.proto` schema to the upstream repository.
- [x] Select Protobuf-ES as the runtime.
- [x] Use the Protobuf-ES base64 decoder.
- [ ] Decide whether non-canonical base64 must be rejected across SDKs.
- [ ] Confirm Hermes compatibility.
- [ ] Confirm JSC compatibility.
- [x] Remove the evaluator dependency on global `BigInt`.
- [ ] Confirm safe and unsafe integer and shard evaluation without global `BigInt` in Hermes and JSC.
- [x] Define per-flag feature-level and unknown-field behavior.
- [x] Preserve invalid flags and report `PARSE_ERROR` during evaluation.
- [x] Ignore unknown fields when a supported known value remains.
- [x] Preserve protobuf integers during parsing.
- [x] Return `PARSE_ERROR` instead of an imprecise number for an unsafe integer.
- [x] Add SHA operators and salt fields to the schema.
- [ ] Confirm the salt-length policy.
- [ ] Define configuration-size limits.
- [ ] Publish cross-SDK hash vectors.

### Q3 — Tracking metadata

- [x] Treat `extraLogging` as deprecated upstream.
- [x] Confirm that flagging-core reports integer and numeric variations as `number`.
- [x] Confirm that only safely represented integer variations become `number`.
- [ ] Confirm that the current mobile exposure event is sufficient for rules evaluations.
- [ ] Confirm whether mobile telemetry must distinguish the original integer and numeric types.
- [ ] Confirm whether default and error evaluations need a new native API.

### Q4 — Service-to-wire packaging

- [x] Serve raw UFC protobuf when `Accept` contains `application/protobuf`.
- [x] Set `Content-Type` to `application/protobuf`.
- [x] Vary the service cache by `Accept`.
- [x] Keep the existing JSON response for callers that do not request protobuf.
- [ ] Identify the producer that builds `FlagsConfigurationWire`.
- [ ] Confirm that the producer rejects an unexpected JSON response.
- [ ] Confirm that the producer adds exactly one base64 layer.
- [ ] Publish a production-derived contract fixture.

### Q5 — React Native configuration entry point

- [x] Keep Protobuf-ES out of the default flagging-core entry point.
- [x] Add a protobuf-free flagging-core precomputed entry point upstream.
- [ ] Measure whether the React Native package root includes Protobuf-ES.
- [ ] Decide whether React Native keeps configuration parsing on its root export.
- [ ] If required, add a React Native configuration subpath without breaking the current API.

## 10. Review history

The plan had six review rounds on 2026-07-22 and 2026-07-23.
The plan was updated on 2026-07-27 after review of PR #343, PR #344, and PR #336.
The plan was updated again on 2026-07-28 after PR #344 added generated Protobuf-ES support, package smoke tests, and safe flag lookup.
The plan was updated on 2026-07-28 after ddoghq/dd-source PR #34959 merged.
The plan was updated again on 2026-07-28 after PR #344 added an opt-in parser entry point and adopted the Protobuf-ES base64 decoder.
The plan was updated on 2026-07-29 after PR #344 added per-flag evaluation errors and unknown-field tolerance.
The plan was updated again on 2026-07-29 after PR #344 preserved protobuf integers during parsing.
The plan was updated on 2026-07-30 after PR #344 added evaluation-time validation, rules serialization, deterministic errors, and lazy regular-expression compilation.
The plan was updated on 2026-07-30 after PR #336 was restacked on the latest PR #344 head.
The plan was updated on 2026-07-31 after live verification found no new code heads but found new PR-description details and an uncovered no-`BigInt` evaluator path.
The plan was updated on 2026-08-03 after PR #344 added the canonical feature-level wording and capability-specific entry points.
PR #336 had no new commit and required a new restack.
The plan was updated again on 2026-08-03 after PR #336 was restacked and exposed `DatadogOfflineProvider`.
The plan was updated on 2026-08-07 after PR #344 removed the runtime `BigInt` call and preserved configuration parse errors.
The plan was updated again on 2026-08-07 after PR #336 added valid-sibling fallback, aligned the configuration API, and standardized provider errors.
The plan was updated on 2026-08-10 after both upstream branches were rebased.
The new PR #344 commits update generated Node-server artifacts and browser test isolation only.
PR #336 has no new logical behavior.

The reviews produced these main corrections:

- The rules engine already exists in the published package.
- Version 2.0.2 removes an unnecessary dependency but does not add rules wire parsing.
- PR #344 defines the expected `rules` protobuf contract.
- PR #336 proves browser provider integration with that contract.
- PR #336 is restacked on the latest PR #344 head.
- PR #336 exposes `DatadogOfflineProvider` and keeps `DatadogCoreProvider` internal.
- The browser offline-provider lifecycle matches the React Native lifecycle.
- Configuration parsing moved to `@datadog/flagging-core/configuration`.
- The full browser package root now exports configuration parsing.
- The browser and flagging-core precomputed entry points exclude Protobuf-ES.
- The default flagging-core entry point does not load Protobuf-ES.
- The upstream parser no longer promises strict canonical base64 rejection.
- dd-source PR #34959 serves the canonical raw protobuf response.
- dd-source PR #40304 defines the flag-scoped unsupported feature-level contract.
- The raw service response is not the portable JSON wire.
- A distribution component must add one base64 layer and the version `1` envelope.
- React Native must call the rules-only evaluator.
- Path selection must occur for each resolution.
- Native tracking must cross the bridge for every successful assignment.
- The current native bridge is sufficient unless the mobile exposure contract changes.
- `extraLogging` is deprecated and is not an upstream blocker.
- The engine already adds bundle size today.
- PR #344 adds Protobuf-ES and synchronous SHA-256.
- PR #344 accepts a measured 6,229-byte minified and 2,070-byte gzipped browser bundle increase.
- PR #344 tests a packed package with the React Native Metro export conditions.
- PR #344 performs structural validation during evaluation.
- PR #344 preserves decoded invalid flag data and reports `PARSE_ERROR` when evaluation reaches it.
- PR #344 ignores unknown protobuf fields when supported known data remains.
- PR #344 preserves protobuf integers and rejects unsafe numeric conversion during evaluation.
- Regular-expression safety still requires a decision.
- A missing targeting key differs from an empty string in the evaluator.
- PR #344 fixes prototype-name lookup in both rules evaluators.
- PR #336 uses the same safe lookup for its precomputed evaluator.
- The public parsed configuration type is not fully opaque.
- OpenFeature types currently resolve through hoisting.
- Custom `id` can conflict with `targetingKey`.
- PR #344 reports deterministic unsupported flag errors during evaluation and keeps other valid flags.
- Unsupported flags must return `PARSE_ERROR`, not `FLAG_NOT_FOUND` or a silent `DEFAULT`.
- A malformed branch must not remove a valid sibling branch.
- PR #344 supports rules configuration serialization.
- Rules serialization preserves unknown protobuf fields.
- PR #344 requires composite conditions to reference preceding conditions.
- PR #344 compiles and caches regular expressions lazily, but this does not solve ReDoS.
- PR #336 now selects a valid sibling before it returns a branch parse error.
- PR #344 no longer requires the global `BigInt` function for safe integer conversion.
- The upstream no-`BigInt` smoke test covers a safe integer but not unsafe integers or shard values.
- The salted-hash protocol needs canonical cross-SDK test vectors.
- Salted SHA-256 does not make low-entropy values confidential.
- Platform opt-in does not apply to customer-supplied wires.

Coordinate upstream work with the flagging-core developers.
Do not implement an incompatible local rules engine.
