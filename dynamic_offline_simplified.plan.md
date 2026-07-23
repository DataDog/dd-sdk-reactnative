# FFL-2837 — Dynamic Offline Initialization for React Native

This document uses Simplified Technical English.
Technical names and API names do not change.

**Jira:** FFL-2837
**Base branch:** `blake.thomas/FFL-2666`
**Work branch:** `blake.thomas/FFL-2837`
**Upstream reference:** DataDog/openfeature-js-client PR #336

## Source documents

- The Portable Flag Configuration RFC defines the portable configuration APIs.
- The Offline Initialization RFC defines the offline workflows.
- The ConfigurationWire specification defines the intended protobuf and base64 format.
- The Obfuscation RFC defines the proposed client-rules protection.

These documents are drafts.
Names, versions, and formats can change.

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

1. Use precomputed data when its context matches.
2. Otherwise, use rules data when it is usable.
3. Otherwise, return a configuration error.

Do not add a new SDK mode.
Do not add an `offlineInit` method.
Use this existing flow:

```text
configurationFromString -> setConfiguration -> evaluate
```

## 2. Current `@datadog/flagging-core` state

### 2.1 Features in version 2.0.1

Version 2.0.1 already contains the rules engine.
It exports the engine from the package root.

It contains these parts:

- `evaluateForSubject`
- `evaluateRulesBasedConfiguration`
- Rule operators and rule matching
- Sharding and hashing
- UFC v1 types
- `TargetingKeyMissingError`
- Evaluation metadata
- MD5 utility functions
- The `spark-md5` dependency

Version 2.0.1 has these configuration limits:

- `FlagsConfiguration` contains only `precomputed`.
- The wire parser reads only precomputed data.
- The package has one root export.
- The package has no subpath exports.

The React Native wire module already imports the package root.
Metro does not remove the unused rules engine.
Thus, the current application bundle already contains the rules engine and `spark-md5`.

### 2.2 Features in upstream PR #336

PR #336 adds these core features:

- A `rulesBased` wire branch
- A `rulesBased` field in `FlagsConfiguration`
- A combined `evaluate` function

React Native does not need the combined `evaluate` function.
React Native selects the evaluation path itself.
React Native calls `evaluateRulesBasedConfiguration` for the rules path.

The required dependency update must provide these two features:

- Rules wire parsing
- The parsed `rulesBased` field

PR #336 is open.
Its merge state is dirty.
It requires review.

### 2.3 Browser provider behavior

Use the browser `CoreProvider` as a reference.

- A rules configuration is valid for any context.
- A precomputed mismatch is an error only when no rules fallback exists.
- `onContextChange` stores the new context.
- `onContextChange` does not fetch.
- `setConfiguration` emits the applicable provider event.

### 2.4 Evaluation path

Select the path for each resolution.
Do not select the path only during reconciliation.

Use this order:

1. If precomputed data matches the effective context, use its decoded `Map`.
2. Otherwise, if valid rules data exists, evaluate the rules.
3. Otherwise, if precomputed data exists, return `INVALID_CONTEXT`.
4. Otherwise, return `PROVIDER_NOT_READY`.

The rules evaluator converts `targetingKey` to the `id` subject attribute.
It does this only when `targetingKey` is not null.

The evaluator returns `ResolutionDetails`.
The metadata contains these applicable fields:

- `allocationKey`
- `variationType`
- `doLog`
- `__dd_split_serial_id`
- `__dd_allocation_key`
- `__dd_do_log`
- `__dd_eval_timestamp_ms`

The metadata does not contain `extraLogging`.
This missing field blocks correct native tracking.

The evaluator treats an empty targeting key as a real subject.
It raises `TARGETING_KEY_MISSING` only for a null or undefined key.

The React Native `EvaluationContext` requires a string key.
Its documentation tells customers to use an empty string.
The React Native `FlagErrorCode` does not contain `TARGETING_KEY_MISSING`.

## 2.5 Wire format

The source documents use different wire formats.

- The ConfigurationWire specification uses version `1`, field `rules`, and protobuf/base64.
- PR #336 uses version `1`, field `rulesBased`, and JSON.
- The Portable Flag Configuration RFC uses version `2`, field `server`, and JSON.

The intended rules response uses protobuf and base64.
The current upstream code uses JSON.
Do not depend on the JSON format.

The Obfuscation RFC requests a binary format.
This request does not select protobuf by itself.
The ConfigurationWire decision selects protobuf.

The protobuf schema must support these new operators:

- `ONE_OF_SHA256`
- `NOT_ONE_OF_SHA256`

The schema must also support the salt fields.

Keep all decoding in `@datadog/flagging-core`.
Do not add a rules decoder to React Native.

A future protobuf runtime will add bundle size.
A future synchronous SHA-256 implementation can also add bundle size.
Test both additions with Hermes and JSC.

Publish the `.proto` schema before the protobuf migration.
Pin React Native to a released flagging-core version.
Verify the final field names and versions after publication.
Do not hard-code the wire field name in React Native.

## 3. Upstream gaps

### G1 — Rules wire parsing and parsed field

**Status:** Blocking.

Merge and publish the upstream rules wire changes.
Bump `@datadog/flagging-core` in `packages/core/package.json`.
Do not add the dependency to `packages/react-native-openfeature`.

Use a linked package or an `npm pack` package during development.

### G2 — Protobuf rules response

**Status:** Upstream release contract.

Publish the `.proto` schema.
Change the rules parser from JSON to protobuf.
Test the protobuf runtime with Hermes and JSC.

React Native must continue to use the opaque parser.

### G3 — Root exports

**Status:** Mostly complete.

Version 2.0.1 exports these required symbols:

- `UniversalFlagConfigurationV1`
- `evaluateRulesBasedConfiguration`

Verify that the new release populates the `rulesBased` field.

### G4 — Native tracking metadata

**Status:** Blocking.

The evaluator already returns the split serial ID and evaluation timestamp.
React Native cannot send those fields through its current bridge.

The evaluator does not return `extraLogging`.
React Native needs this field to build `FlagCacheEntry`.

Define the exact native tracking payload.
Then, select one upstream solution:

- Add `extraLogging` to the rules result.
- Add a rules-tracking API.

Also verify the required variation type.
The evaluator converts `INTEGER` and `NUMERIC` to `number`.
The precomputed path keeps the original distinction.

### G5 — Bundle size and JavaScript engine support

**Status:** Low for current code.

The rules engine and `spark-md5` already ship in the bundle.
The rules wire branch adds little current bundle size.

Two future changes can add significant code:

- The protobuf runtime
- A synchronous SHA-256 implementation

Measure each change.
Test each change with Hermes and JSC.

Do not use a dynamic import.
Metro does not create a smaller release bundle from this import.

Consider a precomputed-only package split only after measurement.
This split requires a flagging-core subpath export.

### G6 — Unsupported obfuscation operators

**Status:** Blocking.

Version 2.0.1 does not support the SHA-256 operators.
An unknown operator makes the current evaluator return `DEFAULT`.
The evaluator does not return an error.
This silent fallback can return the wrong value.

Do not maintain a separate operator list in React Native.
Use one of these preferred upstream solutions:

1. Export `validateRulesConfiguration`.
2. Export evaluator capabilities.
3. Return `GENERAL` for an unsupported operator.
4. Reject the operator in the parser.

If React Native needs a temporary check, use the pinned `OperatorType` enum.
Do not create a second list.

Define capability ownership.

- An official fetch request must advertise evaluator capabilities.
- The service must omit or reject unsupported flags.
- A portable wire must state its required capabilities.
- Alternatively, the parser must preserve and reject unknown operators.

An unsupported operator invalidates the rules branch.
It does not always invalidate a valid precomputed branch.

Use this state matrix:

- Rules only and unsupported operator: return `GENERAL`.
- Matching precomputed data and unsupported rules: serve precomputed data.
- Mismatched precomputed data and unsupported rules: return `GENERAL`.
- Hook context falls through to unsupported rules: return `GENERAL` for that resolution.

Keep the provider `READY` while matching precomputed data is usable.
Invalidate the complete rules branch for one unsupported operator.
Do not isolate an unsupported operator to one flag in this release.

### G7 — Untrusted rules and regular expressions

**Status:** High risk.

The evaluator reads `config.flags[flagKey]` before its `try` block.
A malformed UFC can throw an exception.

The rules engine creates regular expressions from wire values.
A hostile expression can block the JavaScript thread.

Validate the rules snapshot before storage.
Validate the envelope, flags, allocations, splits, variations, and shard ranges.
Validate reserved property names.

Do not claim that structural validation stops ReDoS.
Select one regular-expression protection:

- An upstream safe-regex guarantee
- A static safe-regex policy
- A bounded regular-expression engine

Run hostile-expression tests in a separate process.
Set a time limit for that process.

Clone the rules snapshot before you freeze it.
Do not freeze the caller's object.

### G8 — Missing targeting key

**Status:** Decision required.

Decide if a missing key and an empty key are different.

If they are different:

- Preserve `undefined` for the rules path.
- Relax the internal context type.
- Add `TARGETING_KEY_MISSING` to `FlagErrorCode`.

If they are not different:

- Use the empty string.
- Document that all keyless contexts use one subject bucket.

### G9 — Prototype-unsafe flag lookup

**Status:** Bug.

The evaluator uses `config.flags[flagKey]`.
A missing reserved key can resolve through `Object.prototype`.

Examples include:

- `toString`
- `__proto__`
- `constructor`

The evaluator can return `DISABLED` instead of `FLAG_NOT_FOUND`.

Use an own-property check before evaluation.
Alternatively, fix the lookup in flagging-core.
A null-prototype dictionary is also acceptable.

The precomputed path already uses a `Map`.

### G10 — OpenFeature type dependency

**Status:** Decision required.

`packages/core` has no OpenFeature dependency.
The flagging-core declaration files import `@openfeature/core`.
Flagging-core lists that package only as a development dependency.
Local hoisting hides this problem.

Select one solution:

1. Keep OpenFeature types in `react-native-openfeature`.
2. Pass compatible internal context and logger types to core.
3. Or, add an explicit core dependency.
4. If you add the dependency, fix the flagging-core package dependency too.

Do not widen the public `FlagsClient.get*Details` methods.
Prefer a separate internal entry point.

### G11 — Synchronous SHA-256

**Status:** Blocking upstream work.

Flag evaluation is synchronous.
Web Crypto `SubtleCrypto.digest` is asynchronous.
Do not use it in the synchronous evaluation path.

Use a synchronous SHA-256 implementation.
The implementation must work with Hermes and JSC.
It must work across the supported React Native versions.

Do not depend on Node `crypto`.
Do not depend on a browser-only global.
Do not depend on an unavailable runtime global.

Measure bundle size and evaluation time in release builds.

### G12 — Portable salted-hash protocol

**Status:** Blocking upstream contract.

The Obfuscation RFC does not fully define the hash protocol.
Define these items:

- Salt length
- Salt encoding
- Salt and value order
- Input framing
- UTF-8 encoding
- Unicode normalization
- Digest encoding
- Hexadecimal letter case
- Base64 padding, if applicable
- Number conversion
- Boolean conversion
- Empty-string behavior
- Null and missing-attribute behavior
- `NOT_ONE_OF_SHA256` behavior

Publish canonical cross-SDK test vectors.
The generator and all evaluators must produce the same bytes.

Validate each SHA condition before the provider becomes `READY`.
Reject these conditions:

- Missing salt
- Malformed salt
- Excessively large salt
- Incorrect salt length
- Incorrect salt encoding
- Incorrect digest length
- Incorrect digest encoding
- Non-string digest values
- Malformed condition shape
- Excessive condition count
- Excessive value count

## 4. React Native implementation

### Step 0 — Complete prerequisites

- [ ] Publish flagging-core with rules wire parsing.
- [ ] Publish the parsed `rulesBased` field.
- [ ] Publish the required SHA operators before obfuscation support.
- [ ] Define and publish the salted-hash protocol.
- [ ] Provide a synchronous SHA-256 implementation.
- [ ] Resolve the `extraLogging` tracking requirement.
- [ ] Bump `@datadog/flagging-core` in `packages/core`.
- [ ] Update `yarn.lock`.
- [ ] Verify all final field names, versions, and exports.
- [ ] Record the exact post-SHA flagging-core version.

### Step 1 — Define the parsed configuration type

Do not export a named rules or UFC type.
Use `UniversalFlagConfigurationV1` only inside the flags implementation.

`ParsedFlagsConfiguration` is already public.
It is an alias of upstream `FlagsConfiguration`.
The new upstream type will expose `rulesBased.response`.

Select one API policy:

1. Accept structural visibility and remove claims of opacity.
2. Make `ParsedFlagsConfiguration` a branded type.

The second policy is a breaking type change.
Do not claim that the type is opaque unless you enforce opacity.

### Step 2 — Use the upstream wire parser

Do not add React Native parsing code.
Re-export the upstream conversion functions.

Add a round-trip test for a rules wire.
Use the encoding from the pinned upstream version.

### Step 3 — Load and validate the configuration

Keep the complete parsed `FlagsConfiguration`.
Decode precomputed flags one time into a `Map`.
Keep a validated rules snapshot.

Use this path order:

1. Matching precomputed data
2. Valid rules data
3. Error

Select the path for each resolution.
Do not freeze the selection during reconciliation.

Treat parse failures and validation failures differently.

For a parse failure:

- The current parser returns an empty object.
- React Native cannot recover the valid sibling branch.
- Return `GENERAL`.

For a decoded validation failure:

- Validate each branch separately.
- Keep a valid sibling branch.
- Mark the invalid branch as unusable.
- Do not use the invalid branch as a fallback.

Validate rules before the precomputed-only guard.
Do not store an unvalidated UFC.

Use the G6 state matrix for unsupported operators.
Use upstream validation when it is available.
If necessary, derive temporary validation from pinned `OperatorType`.

Validate all SHA condition fields.
Apply the size limits from G12.

### Step 4 — Reconcile the context

For valid rules, accept every external context.
Set `configurationStatus` to `ready`.
Do not fill `flagsCache` for rules.

Do not create an empty targeting key until D8 is complete.

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
A `before` hook can change this context for one resolution.

Check the precomputed context for every resolution.
This check prevents an assignment leak after a hook changes context.

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

Add an own-property check for the flag key.
Return `FLAG_NOT_FOUND` for an absent reserved-name key.

Track every successful assignment through the native bridge.
Do not use `doLog` to stop the bridge call.
Native code uses `doLog` only for the exposure event.
RUM and evaluation telemetry use separate settings.

Track only a real assigned variant.
Do not track these results:

- `DISABLED`
- Unmatched `DEFAULT`
- No-variant `DEFAULT`
- `TYPE_MISMATCH`
- `FLAG_NOT_FOUND`
- Error results

Do not implement tracking until G4 is complete.

Keep the online cache path unchanged.
Keep the precomputed cache path unchanged.

### Step 6 — Support configurations with two branches

Use matching precomputed data first.
Use rules only when precomputed data is absent or mismatched.
Call the rules evaluator with only the UFC.

Do not pass precomputed data to the rules evaluator.
Do not bypass `decodePrecomputedFlags`.

Create one shared result-mapping helper.
Use it to build `FlagDetails` and `FlagCacheEntry`.

Measure these bundle baselines separately:

1. Current baseline
2. Root SDK import
3. Online flags
4. Precomputed offline flags
5. Dynamic offline flags
6. Post-protobuf dependency
7. Post-SHA dependency

Do not add a dynamic import.
Consider a precomputed-only split only when measurements require it.

### Step 7 — Update the offline provider

Keep `initialize` network-free.
Keep `onContextChange` network-free.

For valid rules, reconciliation returns `ready`.
Do not use the precomputed mismatch error for valid rules.

Resolve D8 before you define empty-context behavior.

Update the class comment.
Remove the precomputed-only instruction that forbids `setContext`.
Explain that `setContext` is required for dynamic rules.

Keep the existing provider event mapping.
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
- `extraLogging`
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

Add this internal type import:

- `UniversalFlagConfigurationV1`

Keep the existing wire and precomputed imports.

Do not import OpenFeature types directly into core unless D11 selects that policy.
Prefer compatible internal context and logger interfaces.
Use an internal `FlagsClient` entry point.

Do not export `ParsedRulesBasedConfiguration`.
Do not export `UniversalFlagConfigurationV1`.

Add one internal context adapter.
Convert between these forms:

```text
React Native: { targetingKey, attributes }
OpenFeature:  { targetingKey, ...attributes }
```

No new native API is required.
The existing tracking bridge accepts a synthesized flag object.
G4 must supply the missing tracking metadata.

## 6. Test plan

### 6.1 Wire and configuration tests

- [ ] Parse a rules wire into `rulesBased.response`.
- [ ] Serialize the parsed rules configuration.
- [ ] Parse a wire with both branches.
- [ ] Return an empty configuration for malformed wire data.
- [ ] Return `GENERAL` when the loaded configuration is empty.
- [ ] Detect a changed upstream field name or version.
- [ ] Test the protobuf format after it becomes available.
- [ ] Verify unknown protobuf enum behavior.

### 6.2 Load and reconciliation tests

- [ ] Load rules only and reach `ready` with an empty context.
- [ ] Change context without a native fetch.
- [ ] Reset context without a native fetch.
- [ ] Return `PROVIDER_NOT_READY` when no configuration exists.
- [ ] Use matching precomputed data before rules.
- [ ] Use rules after a precomputed mismatch.
- [ ] Return `INVALID_CONTEXT` for a precomputed-only mismatch.
- [ ] Apply the unsupported-operator state matrix.
- [ ] Keep valid precomputed data when the rules branch is invalid.

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
- [ ] Test allocations before `startAt`.
- [ ] Test allocations at or after `endAt`.
- [ ] Test the selected missing-targeting-key policy.
- [ ] Treat an empty string as a real targeting key.

### 6.4 Per-resolution context tests

- [ ] Load matching precomputed data and rules data.
- [ ] Change one resolution context with a `before` hook.
- [ ] Confirm that the resolution does not use mismatched precomputed data.
- [ ] Confirm that the resolution uses rules or returns the applicable error.

### 6.5 Tracking tests

- [ ] Call native tracking for every successful assignment.
- [ ] Call native tracking when `doLog` is false.
- [ ] Include the variation key.
- [ ] Include the allocation key.
- [ ] Include the string variation value.
- [ ] Include `extraLogging`.
- [ ] Do not track `DISABLED`.
- [ ] Do not track unmatched `DEFAULT`.
- [ ] Do not track `FLAG_NOT_FOUND`.
- [ ] Do not track `TYPE_MISMATCH`.
- [ ] Do not track error results.

### 6.6 Validation and security tests

- [ ] Reject a missing `flags` map.
- [ ] Reject a malformed flag.
- [ ] Reject a bad shard range.
- [ ] Test inherited property names.
- [ ] Test mutation of the source object after load.
- [ ] Clone the source object before freezing.
- [ ] Run a hostile regex in an isolated process.
- [ ] Stop the hostile-regex process at its time limit.
- [ ] Verify the selected ReDoS protection.
- [ ] Reject an unsupported operator as `GENERAL`.
- [ ] Do not return a silent `DEFAULT` for an unsupported operator.
- [ ] Test a newer cached configuration with an older evaluator.
- [ ] Reject malformed SHA salts and digests.
- [ ] Reject oversized SHA conditions.

### 6.7 Mixed-configuration tests

- [ ] Confirm that one parse failure currently removes both branches.
- [ ] Confirm that React Native cannot recover a sibling after this parse failure.
- [ ] Isolate a decoded structural failure to its branch.
- [ ] Keep a valid sibling branch.
- [ ] Return `GENERAL` when the active path uses an invalid rules branch.

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
- [ ] Emit `PROVIDER_ERROR` for invalid data.
- [ ] Return the same result for the same context and configuration.
- [ ] Keep all precomputed regression tests.

### 6.10 Integration and performance tests

- [ ] Parse a real rules wire.
- [ ] Evaluate several flags and contexts.
- [ ] Verify native tracking calls.
- [ ] Use a service or flagging-core fixture.
- [ ] Measure all bundle baselines from Step 6.
- [ ] Measure the protobuf addition separately.
- [ ] Measure the synchronous SHA addition separately.
- [ ] Run rules evaluation with Hermes.
- [ ] Run rules evaluation with JSC.
- [ ] Test the supported React Native version range.
- [ ] Confirm that no Node or browser-only crypto API is required.
- [ ] Measure repeated rules evaluation in a release build.

## 7. Risks

### R1 — Unpublished upstream configuration support

PR #336 is not merged.
Its API can change.
Keep the React Native integration small.
Use one dependency update as the integration point.

### R2 — Two evaluation paths

Precomputed data uses a `Map`.
Rules data uses the rules evaluator.
Reason codes and type checks can differ.
Use one result-mapping helper.
Test the selection order.

### R3 — Tracking parity

The rules result does not contain `extraLogging`.
Do not ship incomplete tracking.
Resolve G4 first.

### R4 — Bundle size

The current engine already ships.
Protobuf and synchronous SHA-256 are future additions.
Measure both additions.

### R5 — Hermes and JSC support

Test sharding, MD5, protobuf, and SHA-256.
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

The source documents use different names and versions.
Pin the released dependency.
Add a contract test.

### R9 — Obfuscation

The design is not supportable until G6, G11, and G12 are complete.
Do not describe salted SHA-256 as confidentiality.
It does not protect guessable values from offline enumeration.

### R10 — Untrusted input and ReDoS

Malformed rules can throw.
Hostile regex data can block the JavaScript thread.
Validate the snapshot and select a regex protection.

### R11 — Missing targeting key

The current React Native type cannot represent a missing key.
Complete D8 before you implement the adapter.

### R12 — Per-resolution path selection

A hook can change one resolution context.
Check precomputed compatibility after this change.

### R13 — OpenFeature dependency

Current type resolution depends on workspace hoisting.
Complete D11 before you transfer OpenFeature types into core.

### R14 — Prototype lookup

Reserved-name keys can return the wrong result.
Use an own-property check or an upstream fix.

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
Complete G4 before implementation.

### D4 — Evaluation paths

Keep two paths.
Use the decoded `Map` for precomputed data.
Use `evaluateRulesBasedConfiguration` for rules data.
Select the path for each resolution.

### D5 — Bundle size

The current rules engine already ships.
Measure protobuf and synchronous SHA-256 as separate future additions.
Do not use dynamic import as a size control.

### D6 — Security opt-in

Do not add an additional provider gate.

For Datadog-generated data, use the platform distribution policy.
For customer-supplied data, treat `setConfiguration` as the opt-in.
Document that the customer must supply client-appropriate rules.

### D7 — Obfuscation

The design uses salted SHA-256 membership operators and binary structure.
It does not use a separate obfuscated payload mode.
React Native does not pre-hash customer context.

Do not claim support until G6, G11, and G12 are complete.
Reject unsupported operators as `GENERAL`.
Use canonical test vectors.

A public salt stops reusable precomputation.
It does not stop guesses of low-entropy values.
Document all visible UFC data.

### D8 — Targeting key

**Status:** Open.

Decide whether missing and empty keys are different.
Then, update the types, error codes, adapter, and documentation.

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

## 9. Open questions

### Q1 — Published flagging-core version

- [ ] Identify the version that contains rules wire parsing.
- [ ] Confirm the final rules field name.
- [ ] Confirm the final wire version.
- [ ] Confirm that `configurationFromString` populates the rules branch.

### Q2 — Protobuf implementation

- [ ] Publish the `.proto` schema.
- [ ] Define the protobuf runtime.
- [ ] Confirm Hermes compatibility.
- [ ] Confirm JSC compatibility.
- [ ] Define unknown-enum behavior.
- [ ] Add SHA operators and salt fields to the schema.

### Q3 — Tracking metadata

- [ ] Decide how rules evaluation returns `extraLogging`.
- [ ] Confirm whether native telemetry needs the original UFC numeric type.

## 10. Review history

The plan had six review rounds on 2026-07-22 and 2026-07-23.
The reviews checked local version 2.0.1, PR #336, native tracking, and OpenFeature behavior.

The reviews produced these main corrections:

- The rules engine already exists in version 2.0.1.
- React Native must call the rules-only evaluator.
- Path selection must occur for each resolution.
- Native tracking must cross the bridge for every successful assignment.
- The engine already adds bundle size today.
- Protobuf and synchronous SHA-256 add future bundle size.
- Rules validation must protect against malformed input and ReDoS.
- A missing targeting key differs from an empty string in the evaluator.
- The evaluator flag lookup is not safe for prototype names.
- The public parsed configuration type is not fully opaque.
- OpenFeature types currently resolve through hoisting.
- Custom `id` can conflict with `targetingKey`.
- Unsupported operators currently cause a silent `DEFAULT`.
- Operator validation should belong to flagging-core.
- Unsupported rules must not remove a valid precomputed branch.
- The salted-hash protocol needs canonical cross-SDK test vectors.
- Salted SHA-256 does not make low-entropy values confidential.
- Platform opt-in does not apply to customer-supplied wires.

Coordinate upstream work with the flagging-core developers.
Do not implement an incompatible local rules engine.
