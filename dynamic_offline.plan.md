# FFL-2837 — Dynamic (rules-based) offline init in dd-sdk-reactnative

**Jira:** [FFL-2837 — Building Blocks API for dynamic offline init in ReactNative SDK](https://datadoghq.atlassian.net/browse/FFL-2837)
**Base branch:** `blake.thomas/FFL-2666` (static/precomputed offline; OfflineProvider + `setConfiguration`)
**Work branch:** `blake.thomas/FFL-2837` (this branch, cut from FFL-2666)
**Upstream reference:** [openfeature-js-client PR #336 — FFL-2753 browser `CoreProvider`](https://github.com/DataDog/openfeature-js-client/pull/336) (`sameerank/FFL-2753-browser-core-provider`)

### Source docs (drafts — both dated Jun 2026, status "In review", so names/versions may still move)
- `./Portable-Flag-Configuration-RFC.md` (repo root, untracked) — defines the building blocks: `ConfigurationWire`, `configurationFromString/ToString`, `CoreProvider`, fetch fns, hooks.
- `./Offline-Initialization-for-Feature-Flagging.md` (repo root, untracked) — offline recipes built from those blocks; the operation is always `configurationFromString(wire) → provider.setConfiguration(config) → evaluate(...)`.
- [ConfigurationWire (Confluence)](https://datadoghq.atlassian.net/wiki/spaces/PANA/pages/5141725646/ConfigurationWire) — the published wire spec. Its **protobuf/base64** rules encoding is the intended target (see §2.5), even though the current code still uses JSON.

---

## 1. Objective

Today (FFL-2666) the `DatadogOfflineOpenFeatureProvider` serves a **precomputed** configuration:
a single-subject snapshot carrying the exact context it was computed for. `setContext` on a
mismatched context puts the provider into `ERROR`.

FFL-2837 adds the **rules-based** (dynamic) offline flow:

- Customer loads a **rules-based** configuration (Universal Flag Configuration) via `setConfiguration`
  — still **no network fetch** (this is the OfflineProvider).
- `setContext` / `onContextChange` **must not fetch**. It re-evaluates the loaded rules against the
  new context locally and updates the served values.
- Rules-based config is **context-agnostic**: any context is valid; no "mismatch → ERROR".
- Evaluation logic is **imported from `@datadog/flagging-core`** (`evaluate()` / the rules engine),
  not reimplemented in RN.

Both flows coexist behind the same `DatadogOfflineOpenFeatureProvider`. A wire may carry
`precomputed`, rules, or both (precomputed preferred when its context matches, else rules).

Per the Offline-Init RFC this is **not** a new SDK mode or a dedicated `offlineInit()` — it is the same
`configurationFromString → setConfiguration` loading path, differing only in the configuration kind.

---

## 2. Current state of `@datadog/flagging-core`

### Published / consumed today
- RN depends on `@datadog/flagging-core@~2.0.1` (`packages/core/package.json:119`, `yarn.lock` → `2.0.1`).
- **2.0.1 has NO rules support.** It exposes only:
  - `FlagsConfiguration = { precomputed?: PrecomputedConfiguration }` (no rules slot),
  - `configurationFromString` / `configurationToString` handling **only** the precomputed branch,
  - `PrecomputedConfiguration`, `PrecomputedConfigurationResponse`, `PrecomputedFlag` types,
  - no `evaluation/` module.

### In flight in PR #336 (`packages/core`) — NOT yet released
- **`configuration/configuration.ts`** adds
  `RulesBasedConfiguration = { response: UniversalFlagConfigurationV1; fetchedAt?; etag? }` and
  `FlagsConfiguration.rulesBased?: RulesBasedConfiguration`.
- **`configuration/wire.ts`** — `configurationFromString/ToString` round-trip a `rulesBased` branch
  (`response` via `JSON.parse` / `JSON.stringify`).
- **`evaluation/`** rules engine, exported from `evaluation/index.ts`:
  - `evaluate(config, type, flagKey, defaultValue, context, logger)` — shared entry point.
  - `evaluateRulesBasedConfiguration(...)`, `evaluateForSubject(...)`
  - `ufc-v1.ts` — `UniversalFlagConfigurationV1`, `Flag`, `Allocation`, `Split`, `Shard`, `VariantType`, `variantTypeToFlagValueType`
  - `rules.ts`, `matchesShard.ts`, `sharders.ts` (targeting + bucketing)
  - `errors.ts` (`TargetingKeyMissingError`), `evaluationMetadata.ts`
- **`browser/src/openfeature/core-provider.ts`** — the browser `CoreProvider`, the closest analog to
  the RN target. Behaviors to mirror (all confirmed by the RFC §CoreProvider):
  - `getConfigurationError()` errors only when there is **no** evaluatable config, or a precomputed
    config with mismatched context **and no rules fallback**. With rules present, any context is valid.
  - `onContextChange` just stores the new context (no fetch); evaluation reads it live.
  - `setConfiguration` emits `Ready` / `ConfigurationChanged` / `Error`.

### `evaluate()` precedence (PR #336 code == RFC §"Evaluation path selection")
1. `precomputed` present **and** context matches → serve precomputed.
2. Else `rulesBased` present → `evaluateRulesBasedConfiguration(...)` (per-call, per-context).
3. Else `precomputed` present (mismatch, no rules) → `ERROR / INVALID_CONTEXT`.
4. Else → `ERROR / PROVIDER_NOT_READY`.

Rules evaluation folds `targetingKey` into `subjectAttributes.id` and returns `ResolutionDetails`
(value, variant, `flagMetadata { allocationKey, variationType, doLog }`, reason, errorCode).

---

## 2.5 Wire format: three sources, and the intended encoding

The rules wire shape is described **inconsistently** across the three references:

| Source | `version` | rules field name | `response` encoding |
|--------|-----------|------------------|---------------------|
| ConfigurationWire (Confluence) — **intended target** | `1` | `rules` | **protobuf, base64** |
| flagging-core PR #336 `wire.ts` (**current code** — what RN calls today) | `1` | `rulesBased` | JSON string (`JSON.parse`) |
| `Portable-Flag-Configuration-RFC.md` | `2` | `server` | JSON-encoded `ServerConfiguration` |

**Decided-but-not-yet-implemented: the rules `response` is intended to be protobuf-encoded, base64.**
The ConfigurationWire spec is the target. The current flagging-core code takes a shortcut and
`JSON.parse`s the rules `response` (as does the RFC prose) — that is the **not-yet-migrated** state,
not the destination. Treat protobuf as the plan of record; do **not** design RN around the JSON
shortcut persisting.

Implications for RN (all deferred until flagging-core lands the protobuf path):
- **Decoding stays in flagging-core, not RN.** RN never parses the wire itself — it delegates to
  flagging-core's `configurationFromString`. When flagging-core switches the rules branch from
  `JSON.parse` to protobuf-decode, RN inherits it via the version bump with **no RN parsing code**.
- **Watch the transitive dep.** A protobuf runtime (e.g. `protobufjs` or generated decoders) will be
  pulled in transitively — folds directly into the bundle-size / Hermes review (G5, R4/R5).
- **The `.proto` schema is a prerequisite** and does not exist in a consumable form yet — track it as
  part of G2 below.

**Residual naming/version churn:** the field name (`rules` vs `rulesBased` vs `server`) and `version`
(1 vs 2) are still in flux across drafts. Pin to the released flagging-core version, re-verify the
exported type/name before wiring RN types (R8), and never hard-code the wire field name in RN.

---

## 3. Gaps in `@datadog/flagging-core` we must bridge

| # | Gap | Blocking? | Action |
|---|-----|-----------|--------|
| G1 | rules support is unmerged (PR #336) and unpublished | **Yes** | Land PR #336's `packages/core` changes, publish a new `@datadog/flagging-core` (>= 2.1 / 3.0). RN bumps the dep. Until then develop against a linked / `npm pack` build. |
| G2 | Rules `response` protobuf encoding not yet implemented | **Yes (upstream)** | Intended encoding is **protobuf/base64** (Confluence); current code `JSON.parse`s it. flagging-core must (a) publish the `.proto` schema and (b) switch its rules branch to protobuf-decode. RN needs **no parser** (delegates to `configurationFromString`) but inherits the transitive protobuf runtime → feeds G5/R4/R5. Until then, dev/tests run against the interim JSON shape. |
| G3 | Rules engine / UFC types exported from package root | **Yes** | Confirm `evaluate`, `UniversalFlagConfigurationV1`, `RulesBasedConfiguration` are re-exported (`core/src/index.ts` re-exports `./evaluation` and `./configuration`). Verify after publish. |
| G4 | Exposure/telemetry parity for the rules path | Partial | `evaluate()` returns only `ResolutionDetails`; it does **not** call RN native exposure tracking. RN synthesizes the fields `trackEvaluation` needs (see §4 step 5). Confirm `doLog` gating (allocation-level) with flagging-core owners. |
| G5 | Bundle size / RN + Hermes compat of the engine | **Medium** | RFC flags the rules evaluator as materially larger than precomputed lookup and proposes split entrypoints (`.../precomputed` vs full `CoreProvider`). See §4 step 6 (bundle decision) and R5. Verify `sharders.ts` hashing runs under Hermes (no Node `crypto`/browser-only APIs). |
| G6 | Obfuscated / hashed rules payloads | Low/Medium | RFC leaves "how obfuscation fits in" **open**. Base64 is not a security control; hashed values must still work for equality / `ONE_OF` checks. Confirm whether client rules can be obfuscated and that the engine handles/reject it. |

---

## 4. Implementation steps in dd-sdk-reactnative

Architecture we inherit:
- `DatadogOfflineOpenFeatureProvider` (react-native-openfeature) — OpenFeature lifecycle → maps to
  `FlagsClient` reconcile results + provider events.
- `FlagsClient` (core) — owns `loadedConfiguration`, `reconcile()`, served cache, evaluation.
- `configuration/` (core) — wire parse + decode + context helpers.

The precomputed path **precomputes a `Map<string, FlagCacheEntry>`** at load and serves from it.
The rules path is **lazy**: it cannot precompute all flags, so it evaluates per `getX` call against
the live context via flagging-core `evaluate()`.

### Step 0 — Prereqs (§3)
- [ ] PR #336 core changes merged; `@datadog/flagging-core` published with rules support.
- [ ] Bump `@datadog/flagging-core` in `packages/core/package.json` **and**
  `packages/react-native-openfeature/package.json`; update `yarn.lock`.
- [ ] Re-verify the published rules field name / version and the exported symbol names (R8).

### Step 1 — Parsed-config type surface (`core/src/flags/configuration/types.ts`)
- [ ] Re-export the rules types from flagging-core alongside the precomputed ones:
  ```ts
  import type {
      FlagsConfiguration,
      PrecomputedConfiguration,
      RulesBasedConfiguration,            // NEW
      UniversalFlagConfigurationV1,       // NEW
      // ...existing precomputed types
  } from '@datadog/flagging-core';

  export type ParsedRulesBasedConfiguration = RulesBasedConfiguration;        // NEW
  export type ParsedUniversalFlagConfiguration = UniversalFlagConfigurationV1; // NEW
  // ParsedFlagsConfiguration = FlagsConfiguration already gains `rulesBased` once bumped.
  ```
- [ ] Re-export from `flags/configuration/index.ts` and package entry `core/src/index.tsx` as needed.

### Step 2 — Wire parsing (`core/src/flags/configuration/wire.ts`)
- [ ] **No RN code change expected**: RN re-exports `configurationFromString`/`configurationToString`
  from flagging-core; the bumped version handles the rules branch automatically — including the future
  switch from the interim JSON shape to **protobuf/base64** decode (§2.5), which RN inherits with no
  parsing code of its own.
- [ ] Add an RN test asserting a rules wire round-trips through the re-export (guards the bump + the
  field-name churn in R8). Use whatever encoding the pinned flagging-core version emits (JSON interim,
  protobuf once landed).

### Step 3 — `LoadedConfigurationState` + `loadConfiguration` (`core/src/flags/FlagsClient.ts`)
`loadConfiguration` already carries a **"FORWARD-COMPAT SEAM"** comment (FlagsClient.ts:247-255) saying
rules must be handled **before** the precomputed guard. Implement it:
- [ ] Add a variant to `LoadedConfigurationState` (no decoded `Map` — rules are lazy):
  ```ts
  | { kind: 'rulesBased'; configuration: ParsedRulesBasedConfiguration }
  ```
- [ ] In `loadConfiguration`, **before** the `!precomputed` guard:
  ```ts
  if (configuration?.rulesBased) {
      // Optionally validate the UFC envelope (flags is an object, etc.).
      return { kind: 'rulesBased', configuration: configuration.rulesBased };
  }
  ```
- [ ] Decide precedence when **both** present (mirror `evaluate()` / RFC): precomputed-if-context-matches
  wins, else rules. Simplest faithful port: keep the whole `FlagsConfiguration` on the state (or a
  `both` kind) and let `evaluate()` arbitrate (§Step 6).

### Step 4 — `reconcile()` for rules (`core/src/flags/FlagsClient.ts`)
- [ ] `kind === 'rulesBased'`: **any** external context is valid (no `INVALID_CONTEXT`). Set
  `evaluationContext` to the external override or an empty `{ targetingKey: '', attributes: {} }` when
  none is set. `configurationStatus = 'ready'`. Do **not** populate `flagsCache` (lazy).
- [ ] Leave the precomputed branch unchanged. If storing both, the mismatch→error branch fires **only**
  when there is no rules fallback (mirror browser `getConfigurationError`).

### Step 5 — Evaluation path (`core/src/flags/FlagsClient.ts` `getDetails`)
Largest change. `getDetails` currently serves from `flagsCache` (precomputed/online).
- [ ] Branch on loaded kind. For rules, call flagging-core `evaluate()`:
  ```ts
  import { evaluate } from '@datadog/flagging-core';
  const details = evaluate(flagsConfig, type, key, defaultValue, toOFContext(this.evaluationContext), logger);
  ```
  Note: `evaluate` takes an **OpenFeature-flat** context (`{ targetingKey, ...attrs }`), while
  `FlagsClient` holds `{ targetingKey, attributes }`. Add an adapter (inverse of `toDdContext` /
  `normalizeWireContext`); flagging-core folds `targetingKey → subjectAttributes.id` internally.
- [ ] Map flagging-core `ResolutionDetails` → RN `FlagDetails<T>` (value, variant, `allocationKey` from
  `flagMetadata`, reason, errorCode/errorMessage). Let `evaluate` produce `TYPE_MISMATCH`/`FLAG_NOT_FOUND`.
- [ ] **Exposure tracking:** rules `evaluate()` has no tracking side effect. Synthesize a
  `FlagCacheEntry` from the resolution (`key`, `value`, `variationKey`=variant, `allocationKey`,
  `variationType` from `flagMetadata`, `variationValue`=stringified value, `reason`, `doLog`,
  `extraLogging`) and call `this.track(entry, this.evaluationContext)` — **gate on `doLog`** (confirm
  policy: the precomputed path currently tracks unconditionally; decide match-vs-fix — G4).
- [ ] Keep precomputed + online paths serving from `flagsCache` untouched.

### Step 6 — Precedence when both present + bundle-size decision
- [ ] Implement the flagging-core order faithfully (precomputed-if-match → rules). Easiest: pass the
  full `FlagsConfiguration` into `evaluate()` and let it arbitrate; or route **everything** through
  `evaluate()` for one code path (bigger refactor — weigh against the native-exposure parity the
  current `Map`+`track` path guarantees).
- [ ] **Bundle-size decision (RFC tree-shaking concern + Offline-Init open Q "max wire size"):** a
  static `import { evaluate } from '@datadog/flagging-core'` pulls the whole rules engine (sharders,
  rules, ufc) into **every** RN app, including precomputed-only users. Options:
  1. Accept the cost (simplest; measure it).
  2. **Dynamic `import()`** of the rules evaluator only when a rules config is loaded (lazy; keeps the
     precomputed-only bundle lean — matches the RFC's split-entrypoint intent).
  3. Ask flagging-core for a subpath export (`@datadog/flagging-core/evaluation`) so RN imports only
     the engine when needed.
  Pick one; record the measured delta. (R5)

### Step 7 — `DatadogOfflineOpenFeatureProvider` (`react-native-openfeature/src/offlineProvider.ts`)
- [ ] `initialize` / `onContextChange` already do not fetch. For rules, `applyContext`'s reconcile
  returns `ready` for any context, so the mismatch-throw path disappears naturally. Verify the
  empty-context re-adopt logic still reads sensibly for rules (an empty context for rules is just an
  anonymous subject; there is no embedded context to re-adopt).
- [ ] **Update the class doc comment** — it currently states precomputed-only semantics ("you should
  **not** call `OpenFeature.setContext`"). For rules, `setContext` **is** the intended dynamic path.
- [ ] `setConfiguration` event mapping (`Ready` / `ConfigurationChanged` / `Error`) is already generic
  and matches the RFC event model; confirm a rules `ready` triggers the right transitions.
- [ ] **Opt-in / security posture (both RFCs):** client-side rules evaluation exposes targeting logic
  and is a security-sensitive, explicitly opt-in path. Decide whether the rules-based offline provider
  is gated behind an explicit opt-in flag/import and documented as such. (R7)

### Step 8 — Exports, examples & docs
- [ ] Export new public types (`ParsedRulesBasedConfiguration`) from
  `react-native-openfeature/src/index.ts` and `core/src/index.tsx` if customers need them.
- [ ] Update package READMEs + example apps (`example/src/flags/flagsProvider.ts`,
  `example-new-architecture/flags/flagsProvider.ts`) with a rules-based offline snippet
  (`configurationFromString(wire) → setConfiguration → setContext(a) / setContext(b)`).

---

## 5. All imports added to dd-sdk-reactnative

From `@datadog/flagging-core` (post-bump):
- `evaluate` — value import in `core/src/flags/FlagsClient.ts` (or behind a dynamic `import()` per §Step 6).
- `type RulesBasedConfiguration`, `type UniversalFlagConfigurationV1`, `type FlagsConfiguration`,
  `type FlagTypeToValue` — in `configuration/types.ts` and `FlagsClient.ts`.
- (already imported) `configurationFromString`, `configurationToString`, precomputed types.
- Possibly `type ResolutionDetails`, `type Logger` if threaded (or keep using `@openfeature/web-sdk`).

Internal (RN) new:
- A context adapter (RN `{targetingKey, attributes}` ↔ OpenFeature-flat `{targetingKey, ...attrs}`),
  likely in `flags/configuration/context.ts` or `flags/internal.ts`.
- `ParsedRulesBasedConfiguration` type export chain (types.ts → configuration/index.ts → index.tsx).

**No new native surface required** — `NativeDdFlags.trackEvaluation(clientName, key, rawFlag,
targetingKey, attributes)` already accepts a synthesized flag object, and rules evaluation is entirely JS.

---

## 6. Test plan

Model on existing suites: `react-native-openfeature/src/__tests__/offlineProvider.test.ts`,
`offlineProvider.integration.test.ts`, `core/src/flags/__tests__/FlagsClient.test.ts`,
`core/src/flags/configuration/__tests__/wire.test.ts`.

### Wire / config (core)
- [ ] `configurationFromString` parses a rules wire into `{ rulesBased: { response: UFC } }`.
- [ ] Round-trip `configurationToString(configurationFromString(wire))`.
- [ ] Malformed / unsupported-version wire → empty config (lenient) → classified `GENERAL` on load.
- [ ] Wire carrying **both** precomputed and rules parses both.
- [ ] Guard test that fails loudly if the published rules field name/version differs from expectations (R8).

### FlagsClient (core) — rules load & reconcile
- [ ] `setConfiguration` rules-only → `ready` for an **empty** context.
- [ ] `setEvaluationContextWithoutFetching(anyContext)` on rules → `ready` (never `INVALID_CONTEXT`); **no** native fetch.
- [ ] `resetEvaluationContextWithoutFetching()` on rules → `ready`.
- [ ] No config loaded → `PROVIDER_NOT_READY` (regression guard).
- [ ] Both precomputed + rules: matching context serves precomputed; mismatch falls back to rules (not
  `ERROR`); precomputed-only mismatch still `INVALID_CONTEXT`.

### FlagsClient (core) — rules evaluation
- [ ] `getBooleanValue/String/Number/Object` return the rules-evaluated value for a targeting key that
  matches an allocation; return the else/fallthrough variant otherwise.
- [ ] **Dynamic behavior:** changing context between two evaluations yields **different** values when
  the two subjects bucket differently (the core point of FFL-2837).
- [ ] Flag-not-found → `FLAG_NOT_FOUND` + default. Type mismatch → `TYPE_MISMATCH` + default.
- [ ] Missing targeting key where a rule requires it → `TARGETING_KEY_MISSING`/`INVALID_CONTEXT` + default.
- [ ] Exposure: `native.trackEvaluation` called with a correctly synthesized flag (`variationKey`,
  `allocationKey`, `variationValue` string) when `doLog` true; not called when false (per agreed policy).

### Provider (react-native-openfeature)
- [ ] Rules config loaded before registration → provider reaches `READY` (no context needed).
- [ ] `setContext(ctxA)` then `setContext(ctxB)` re-evaluates locally, **no fetch**, emits expected
  lifecycle (RECONCILING→READY), values reflect each context.
- [ ] `setConfiguration` valid rules → `CONFIGURATION_CHANGED` (and `READY` if recovering from error).
- [ ] `setConfiguration` empty/invalid → `PROVIDER_ERROR` with a top-level errorCode.
- [ ] Determinism: same (context, config) → same bucketed variant across calls.
- [ ] Regression: all existing precomputed offline tests still pass.

### Integration / non-functional
- [ ] End-to-end: parse a real rules `ConfigurationWire` sample → set provider → evaluate several flags
  across several contexts; assert values + exposure calls. Use a UFC fixture from ffe-service or the
  flagging-core test fixtures.
- [ ] **Bundle-size check** (R5): measure the delta the rules engine adds; confirm the precomputed-only
  path does not regress (validates the §Step 6 decision).
- [ ] **Hermes smoke test**: rules evaluation (incl. `sharders` hashing) runs under Hermes.

---

## 7. Risks & unknowns

1. **flagging-core rules support is unmerged/unpublished (G1, G3).** Everything blocks on PR #336
   landing + a release. Mitigate: develop against a linked / `npm pack` build; keep the RN diff
   isolated so the dependency bump is the only integration point.
2. **Two evaluation paths in `FlagsClient`.** Precomputed serves from a decoded `Map`; rules evaluate
   lazily via `evaluate()`. Risk of divergent behavior (reason codes, exposure, type checks). Consider
   routing precomputed through `evaluate()` too for one path — weigh against the native-exposure parity
   the current `Map`+`track` path guarantees.
3. **Exposure parity (G4).** `evaluate()` has no tracking side effect; RN synthesizes the flag object
   for `trackEvaluation`. `doLog` gating (allocation-level) and RUM correlation must match the online
   path. Confirm with flagging-core / ffe owners.
4. **Bundle size / tree-shaking (G5).** The RFC explicitly calls the rules evaluator larger than the
   precomputed lookup and proposes split entrypoints. A naive static import taxes every RN app. Decide
   accept-cost vs. dynamic `import()` vs. request a subpath export; measure. See §Step 6.
5. **Hermes/RN bundling of the engine.** `sharders.ts` hashing may assume Node/browser APIs. Verify it
   runs under Hermes; add the smoke test above.
6. **Context shape adapters.** flagging-core wants OpenFeature-flat context and folds `targetingKey→id`;
   RN holds `{targetingKey, attributes}`. Normalization mismatches could mis-bucket. Cover with the
   determinism tests.
7. **Security / opt-in (both RFCs).** Client-side rules expose targeting logic and are an explicitly
   opt-in, security-sensitive path. Decide whether to gate the rules offline provider behind an opt-in
   and document it. Public client credentials must not fetch private rules by default (fetch is out of
   scope here, but the posture matters for docs).
8. **Wire naming/version churn (§2.5).** `rulesBased` (code) vs `server` (RFC) vs `rules` (Confluence);
   `version` 1 vs 2. The docs are drafts. Pin to the released flagging-core version, never hard-code the
   field name in RN, and add a guard test.
9. **Obfuscated / hashed UFC (G6).** RFC leaves obfuscation open. Confirm whether client rules can be
   obfuscated and that the engine handles hashed equality / `ONE_OF` — else reject predictably like the
   precomputed path does.

---

## 8. Open questions to resolve before coding
- [ ] Which published `@datadog/flagging-core` version carries rules, and does its package root export
  `evaluate`, `UniversalFlagConfigurationV1`, `RulesBasedConfiguration`? What is the final rules field
  name/version on the wire? (G1/G3/R8)
- [ ] Protobuf rules encoding: when will flagging-core publish the `.proto` schema and switch its rules
  `response` from JSON to protobuf/base64-decode? What protobuf runtime does it pull in, and is it
  Hermes-safe? (G2/§2.5)
- [ ] Exposure/`doLog` policy for rules — match precomputed's unconditional `track`, or gate on `doLog`? (G4)
- [ ] Do we route precomputed through `evaluate()` too, or keep two paths? (R2)
- [ ] Bundle-size approach: accept, dynamic-import, or subpath export? (R4/§Step 6)
- [ ] Is client-side rules an explicit opt-in in RN, and how is it surfaced/documented? (R7)
- [ ] Can rules payloads be obfuscated for mobile, and must the engine handle hashed values? (G6)
