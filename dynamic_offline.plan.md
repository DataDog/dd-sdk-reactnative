# FFL-2837 — Dynamic (rules-based) offline init in dd-sdk-reactnative

**Jira:** [FFL-2837 — Building Blocks API for dynamic offline init in ReactNative SDK](https://datadoghq.atlassian.net/browse/FFL-2837)
**Base branch:** `blake.thomas/FFL-2666` (static/precomputed offline; OfflineProvider + `setConfiguration`)
**Work branch:** `blake.thomas/FFL-2837` (this branch, cut from FFL-2666)
**Upstream reference:** [openfeature-js-client PR #336 — FFL-2753 browser `CoreProvider`](https://github.com/DataDog/openfeature-js-client/pull/336) (`sameerank/FFL-2753-browser-core-provider`)

### Source docs (drafts — both dated Jun 2026, status "In review", so names/versions may still move)
- [Portable Flag Configuration RFC](https://docs.google.com/document/d/1OWNBtXtSk535VXqf-9fqsAmU9W8kpFLAwxYi2y1qyQQ/edit?pli=1&tab=t.0#heading=h.n52036mkzewg) (local snapshot: `./Portable-Flag-Configuration-RFC.md`, repo root, untracked) — defines the building blocks: `ConfigurationWire`, `configurationFromString/ToString`, `CoreProvider`, fetch fns, hooks.
- [Offline Initialization for Feature Flagging RFC](https://docs.google.com/document/d/1q1GlEbAgCGuO1OWfGbmKQkk5Oo-rE7YQwq29kMJJ4II/edit?pli=1&tab=t.0#heading=h.rnd972k0hiyer) (local snapshot: `./Offline-Initialization-for-Feature-Flagging.md`, repo root, untracked) — offline recipes built from those blocks; the operation is always `configurationFromString(wire) → provider.setConfiguration(config) → evaluate(...)`.
- [ConfigurationWire (Confluence)](https://datadoghq.atlassian.net/wiki/spaces/PANA/pages/5141725646/ConfigurationWire) — the published wire spec. Its **protobuf/base64** rules encoding is the intended target (see §2.5), even though the current code still uses JSON.
- **RFC: Obfuscation for rules-based client configs** (local: `./RFC_Obfuscation_for_rules-based_client configs.md`, 2026-07-10, first draft, one approval) — defines the obfuscation design for client rules: per-flag opt-in switch, salted `ONE_OF_SHA256`/`NOT_ONE_OF_SHA256` operators (server-compatible, engine-evaluated), binary structure format, and "document what's exposed". Answers most of our obfuscation open question — see G6/D7.

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
- Evaluation logic is **imported from `@datadog/flagging-core`** (the already-published
  `evaluateRulesBasedConfiguration()` rules engine — not the combined `evaluate()`; see D4/A),
  not reimplemented in RN.

Both flows coexist behind the same `DatadogOfflineOpenFeatureProvider`. A wire may carry
`precomputed`, rules, or both (precomputed preferred when its context matches, else rules).

Per the Offline-Init RFC this is **not** a new SDK mode or a dedicated `offlineInit()` — it is the same
`configurationFromString → setConfiguration` loading path, differing only in the configuration kind.

---

## 2. Current state of `@datadog/flagging-core`

> ⚠️ **Corrected 2026-07-22 after code review** (verified against the installed
> `node_modules/@datadog/flagging-core@2.0.1` and PR #336, not a stale local branch). An earlier
> draft wrongly claimed 2.0.1 had "no evaluation module" — it does. See the corrected split below.

### Published / consumed today (2.0.1) — what already ships
Verified in the installed package's `esm/` tree. **2.0.1 already contains the full rules engine and
root-exports it** (`esm/index.js`: `export * from './evaluation'` etc.):
- `evaluation/` — `evaluateForSubject`, `evaluateRulesBasedConfiguration`, `rules` (incl. `ONE_OF`,
  `MATCHES` → `new RegExp(...)`), `matchesShard`, `sharders`, `ufc-v1` (`UniversalFlagConfigurationV1`,
  `Flag`, `Allocation`, `Split`, `Shard`, `VariantType`, `variantTypeToFlagValueType`), `errors`
  (`TargetingKeyMissingError`), `evaluationMetadata`.
- `obfuscation` — **generic MD5 helpers only** (`getMD5Hash`, `buildStorageKeySuffix`); no
  obfuscated-rules decoder or context-transform pipeline (bears on G6/D7).
- `spark-md5` is a runtime dependency of 2.0.1.
- `configurationFromString` / `configurationToString` handling **only** the precomputed branch.
- `FlagsConfiguration = { precomputed?: PrecomputedConfiguration }` — **no `rulesBased` slot**.
- **Single `.` package export** — no subpaths (bears on the bundle discussion, D5).

**Consequence for bundling:** RN's `packages/core/src/flags/configuration/wire.ts` already imports the
flagging-core **root barrel** (`configurationFromString`), and `core/src/index.tsx` re-exports it — so
under Metro (no tree-shaking) the entire engine + `spark-md5` **already ships in every
`@datadog/mobile-react-native` consumer today**, precomputed or not. (See D5 — this guts the old
"rules engine taxes every app" premise.)

### What 2.0.1 is MISSING — added by PR #336 (unmerged, CONFLICTING/REVIEW_REQUIRED as of 2026-07-15)
Three things, all in `packages/core`:
- **`configuration/wire.ts`** adds the `rulesBased` wire branch — **the one RN actually needs.**
- **`configuration/configuration.ts`** adds `RulesBasedConfiguration` and `FlagsConfiguration.rulesBased?`
  (the parsed-config slot RN reads; RN keeps the type internal — E).
- **`evaluation/evaluation.ts`** adds the combined **`evaluate(config, …)`** (precomputed-first → rules).
  **RN does NOT use `evaluate()`** — D4 does path selection in RN and calls the rules-only
  `evaluateRulesBasedConfiguration` (already in 2.0.1). So `evaluate()` is not an RN prerequisite (A).

So the bump RN needs is for the **rules wire parsing + the `rulesBased` parsed slot** — not the engine
and not `evaluate()`.

### Browser analog
- **`browser/src/openfeature/core-provider.ts`** — the browser `CoreProvider`, the closest analog to
  the RN target. Behaviors to mirror (all confirmed by the RFC §CoreProvider):
  - `getConfigurationError()` errors only when there is **no** evaluatable config, or a precomputed
    config with mismatched context **and no rules fallback**. With rules present, any context is valid.
  - `onContextChange` just stores the new context (no fetch); evaluation reads it live.
  - `setConfiguration` emits `Ready` / `ConfigurationChanged` / `Error`.

### Path-selection precedence (RFC §"Evaluation path selection") — RN implements this itself
The combined `evaluate()` encodes this order, but **RN does not call `evaluate()`** (D4/A) — it reproduces
the order in `FlagsClient` and calls the rules-only `evaluateRulesBasedConfiguration()` for step 2:
1. `precomputed` present **and** context matches → serve precomputed (from RN's decoded `Map`).
2. Else rules present → `evaluateRulesBasedConfiguration(rulesResponse, …)` (per-call, per-context).
3. Else `precomputed` present (mismatch, no rules) → `ERROR / INVALID_CONTEXT`.
4. Else → `ERROR / PROVIDER_NOT_READY`.
The match in step 1 must be evaluated **per resolution** (R12/B), not frozen at reconcile.

Rules evaluation folds `targetingKey` into `subjectAttributes.id` **only when `subjectKey != null`**
and returns `ResolutionDetails` (value, variant, reason, errorCode, and `flagMetadata` with
`allocationKey`, `variationType`, `doLog`, `__dd_split_serial_id`, `__dd_allocation_key`, `__dd_do_log`,
and an eval timestamp). **`flagMetadata` does NOT include `extraLogging`** (PR #336 deliberately omits it)
— see G4/D3, this blocks faithfully rebuilding a `FlagCacheEntry` for native tracking.

**Targeting-key semantics (verified in `evaluateForSubject.js`):** `TargetingKeyMissingError` is thrown
only when `subjectKey == null` (null/undefined) **and** a matching allocation has shards. An empty
string `''` is **not** null — it is bucketed as a real (anonymous) subject. See G8/D8: RN's
`EvaluationContext.targetingKey` is typed `string` (required) and its own docs tell callers to pass
`''`, so RN currently cannot express "missing" as `undefined`; and RN's `FlagErrorCode`
(`types.ts:168`) has no `TARGETING_KEY_MISSING` member.

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

> **Note:** the Obfuscation RFC's "binary format" (structure obfuscation) is *aligned with* but does
> **not by itself establish** protobuf. Protobuf is a separate ConfigurationWire decision, and its schema
> must be extended to carry the new **`ONE_OF_SHA256`/`NOT_ONE_OF_SHA256` operators and their salt
> fields** (G12). Don't conflate "binary" with "protobuf is decided".

Implications for RN (all deferred until flagging-core lands the protobuf path):
- **Not an RN implementation blocker** — it is a **flagging-core release-contract** item. RN only
  consumes the opaque parser (`configurationFromString`), so as long as the released API stays opaque,
  RN neither knows nor cares whether the payload is JSON or protobuf. RN can build and test against
  whatever the pinned version emits.
- **Decoding stays in flagging-core, not RN.** When flagging-core switches the rules branch from
  `JSON.parse` to protobuf-decode, RN inherits it via the version bump with **no RN parsing code**.
- **Watch the transitive dep.** A protobuf runtime (e.g. `protobufjs` or generated decoders) would be
  pulled in transitively — folds into the Hermes+JSC review (R5). It is **one of two** genuinely new bundle
  masses (the other is the synchronous SHA-256 for obfuscation, G11); the evaluation engine already ships
  (§2, D5).
- **The `.proto` schema is a prerequisite** and does not exist in a consumable form yet — track it as
  part of G2 below.

**Residual naming/version churn:** the field name (`rules` vs `rulesBased` vs `server`) and `version`
(1 vs 2) are still in flux across drafts. Pin to the released flagging-core version, re-verify the
exported type/name before wiring RN types (R8), and never hard-code the wire field name in RN.

---

## 3. Gaps in `@datadog/flagging-core` we must bridge

| # | Gap | Blocking? | Action |
|---|-----|-----------|--------|
| G1 | `rulesBased` wire parsing + parsed-config slot are unmerged (PR #336) and unpublished | **Yes** | The engine **and the rules evaluator (`evaluateRulesBasedConfiguration`) already ship in 2.0.1** (§2, A). Only the wire parsing + the `rulesBased` parsed-config slot are missing — **not `evaluate()`** (RN doesn't use it). Land PR #336's `packages/core` changes, publish. Bump the dep **in `packages/core` only** (not react-native-openfeature — G-dep note). Develop against a linked / `npm pack` build meanwhile. PR #336 is CONFLICTING/REVIEW_REQUIRED, so its shape may still shift. |
| G2 | Rules `response` protobuf encoding not yet implemented | **Upstream only (not an RN blocker)** | Intended encoding is **protobuf/base64** (Confluence); current code `JSON.parse`s it. This is a flagging-core release-contract item: it must (a) publish the `.proto` and (b) switch its rules branch to protobuf-decode. RN consumes the opaque parser and inherits the switch on bump; only the transitive protobuf runtime touches RN (Hermes review, R5). Dev/tests run against whatever the pinned version emits. |
| G3 | Root exports for the symbols RN imports | **Mostly satisfied** | 2.0.1 already root-exports `UniversalFlagConfigurationV1` **and `evaluateRulesBasedConfiguration`** — the two symbols RN actually needs. RN does **not** need `evaluate` or a public `RulesBasedConfiguration` type (kept internal — E). Only remaining check: `configurationFromString` populates the rules branch after the bump (R8). |
| G4 | **Exposure/telemetry parity — one missing field** | **Yes (blocking)** | Narrowed (H): the rules `flagMetadata` **already carries** `__dd_split_serial_id` (serialId) and `__dd_eval_timestamp_ms` (timestamp) — **only `extraLogging` is missing**. Conversely RN's `FlagCacheEntry`/native bridge have **no slot** for serialId/timestamp, so exposing those upstream would not help RN transmit them anyway. **Action:** define the *exact* native `trackEvaluation` payload the offline rules path must send, then have upstream expose **`extraLogging`** on the rules result (or provide a rules-tracking API). Also confirm whether native telemetry needs the **original UFC variation type** — the engine collapses `INTEGER`/`NUMERIC` → `'number'` (`ufc-v1.js:8`), losing the distinction the precomputed path preserves. |
| G5 | Bundle size / Hermes+JSC compat | **Low today, two future adds** | The engine + `spark-md5` **and the rules evaluator already ship** via RN's existing root-barrel import (§2), so enabling rules adds only the rules wire branch — negligible now. **Two future upstream additions are genuinely new mass:** the protobuf runtime (G2) and a **synchronous SHA-256** (G11). A precomputed-only split would help **only** if flagging-core adds subpath exports (2.0.1 has none) *and* RN reworks its `wire.ts` barrel import. Verify `sharders.ts`/`spark-md5` (and later protobuf + sync SHA) run under **Hermes and JSC**. Measure before doing anything. |
| G6 | Obfuscation operators absent → **silent fallback today** | **Yes (hard prereq)** | Obfuscation = salted `ONE_OF_SHA256`/`NOT_ONE_OF_SHA256` operators (from `ONE_OF`, server-compatible, engine-evaluated) — but they're **absent from 2.0.1**, and an unknown operator makes `isValidRule` fail → `evaluateForSubject` returns **`DEFAULT` with no error** (verified). So an obfuscated rule silently serves the coded default — could wrongly enable/disable a feature. Require: (a) SHA operators shipped upstream **before** declaring dynamic client rules supported; (b) **load-time rejection of unsupported operators as `GENERAL`**, not a normal `DEFAULT`; (c) a capability/version mechanism so the service won't send SHA operators to older SDKs; (d) tests for unknown-future operators and **cached configs used after an SDK downgrade**. |
| G11 | SHA-256 must be **synchronous** and Hermes/JSC-safe | **Yes (upstream)** | The whole eval path is synchronous (`FlagsClient.get*Details`, the OF resolvers), but Web Crypto `SubtleCrypto.digest()` is **async** — unusable here. Upstream needs a **synchronous** SHA-256 (pure-JS or WASM, no Node `crypto`, no browser-only Web Crypto, no unavailable globals), Hermes **and** JSC compatible across our supported RN range. **This is new bundle mass** — invalidates the "protobuf is the only new mass" claim (D5). Add SHA-specific release-build perf + bundle measurements. |
| G12 | The portable salted-hash **protocol is unspecified**, and malformed SHA conditions need load-time rejection | **Yes (upstream contract)** | The RFC names the operators + "random salt" but defines neither the condition schema nor the hash input encoding. Before implementation the shared contract must pin: salt length/encoding; ordering (`salt‖value` vs `value‖salt` vs framed); UTF-8 + Unicode normalization; digest encoding (hex/base64, casing, padding); how numbers/booleans stringify (`ONE_OF` uses JS `value.toString()` — **not** automatically portable); empty-string / null-or-missing attribute / `NOT_ONE_OF_SHA256` behavior; and **canonical cross-SDK test vectors**. The generator, JS evaluator, and every server/mobile evaluator must produce **identical bytes** — "RN strings pass through unmodified" is necessary but far from sufficient. **Once the schema exists, load-time validation must also reject** (before READY): missing/malformed salt; salt of wrong length/encoding or unreasonably large; digests of wrong length/encoding; non-string digest-array entries; malformed `ONE_OF_SHA256`/`NOT_ONE_OF_SHA256` condition shapes; and excessive condition/value counts that could block the JS thread. |
| G7 | Untrusted rules wire is not validated, and regex safety is not solvable in RN alone | **Yes (high)** | `evaluateRulesBasedConfiguration` derefs `config.flags[flagKey]` **before** its try/catch (throws on a malformed UFC), and `rules.ts` builds `new RegExp(...)` from wire patterns. Structural validation on load (envelope, flags map, allocations/splits/variations, shard ranges, inherited keys `__proto__`/`toString`) is doable in RN. **Catastrophic-regex (ReDoS) is NOT reliably detectable by "deep validation" alone** (F) and executing a hostile pattern in a test can hang Jest/Hermes. Require one concrete mitigation — **preferably upstream/shared**: an upstream safe-regex validation guarantee (trusted config), a static safe-regex policy/library, or a bounded regex engine. Run adversarial perf tests in an **isolated, time-bounded** process. **Clone the snapshot before freezing** (do not freeze the caller's object). |
| G8 | Missing vs anonymous targeting key is not representable in RN | **Yes** | Rules bucket `''` as a real subject and only raise `TARGETING_KEY_MISSING` for `null`/`undefined`, but RN's `EvaluationContext.targetingKey` is required `string` (docs say pass `''`) and `FlagErrorCode` lacks `TARGETING_KEY_MISSING`. Decide whether missing and anonymous-empty are distinct; if so, preserve `undefined` through the rules path and add `TARGETING_KEY_MISSING` to `FlagErrorCode`. |
| G9 | Prototype-unsafe flag lookup returns `DISABLED` for absent reserved-name flags | **Yes (bug)** | `config.flags[flagKey]` on the plain UFC object resolves `toString`/`__proto__`/`constructor` through `Object.prototype`, so an **absent** flag with such a key yields `DISABLED` instead of `FLAG_NOT_FOUND`. RN own-property-guards before delegating (`Object.hasOwn`), **or** upstream switches to an own-property check / null-prototype dict. (Note the *precomputed* path already dodges this by using a `Map`.) |
| G10 | OpenFeature type/dependency boundary is unsound | **Yes** | `packages/core` declares **no** `@openfeature/*` dependency, yet flagging-core's published `.d.ts` import `@openfeature/core` while listing it only as a **devDependency** (`flagging-core/package.json:43`). Types resolve only via hoisting. RN must not add a bare `@openfeature/*` import to core — pass structurally-compatible internal types from react-native-openfeature, or add an explicit core dep **and** have flagging-core fix its published dep (§Step 5, D11, R13). |

---

## 4. Implementation steps in dd-sdk-reactnative

Architecture we inherit:
- `DatadogOfflineOpenFeatureProvider` (react-native-openfeature) — OpenFeature lifecycle → maps to
  `FlagsClient` reconcile results + provider events.
- `FlagsClient` (core) — owns `loadedConfiguration`, `reconcile()`, served cache, evaluation.
- `configuration/` (core) — wire parse + decode + context helpers.

The precomputed path **precomputes a `Map<string, FlagCacheEntry>`** at load and serves from it.
The rules path is **lazy**: it cannot precompute all flags, so it evaluates per `getX` call against
the live context via flagging-core's **`evaluateRulesBasedConfiguration()`** (see the design note below).

> **Design note — call `evaluateRulesBasedConfiguration()`, not `evaluate()` (A).** D4 does the
> precomputed-vs-rules selection **in RN**, so the combined `evaluate()` (whose whole job is that
> arbitration) is unnecessary and would risk routing precomputed data through upstream arbitration.
> `evaluateRulesBasedConfiguration(ufc, type, key, default, ofContext, logger)` is **already public in
> 2.0.1** (`node_modules/@datadog/flagging-core/esm/evaluation/evaluation.d.ts:4`) and takes the UFC
> (`config.rulesBased.response`) directly — no fake `FlagsConfiguration` to construct. This also removes
> `evaluate()` from RN's prerequisites: the bump is needed **only** for the `rulesBased` wire-parsing +
> the parsed config slot, not for the evaluator.

### Step 0 — Prereqs (§3)
- [ ] PR #336 core changes merged; `@datadog/flagging-core` published with the **`rulesBased` wire
  parsing + parsed-config slot**. (The evaluator — `evaluateRulesBasedConfiguration` — and
  `UniversalFlagConfigurationV1` already ship in 2.0.1, so `evaluate()` is **not** a prerequisite.)
- [ ] Bump `@datadog/flagging-core` **in `packages/core/package.json` only** (`:119`); update `yarn.lock`.
  `packages/react-native-openfeature` has **no** direct flagging-core dependency — it consumes it
  transitively through its `@datadog/mobile-react-native` peer dep (`react-native-openfeature/package.json:40,49`).
- [ ] Re-verify the published rules field name / version and that `configurationFromString` populates the
  rules branch (R8). `evaluateRulesBasedConfiguration` + `UniversalFlagConfigurationV1` are already exported.
- [ ] Resolve the G4 blocker with upstream (expose `extraLogging` for rules eval) **before** building the tracking path.
- [ ] **Pin the actual post-SHA flagging-core version** for the obfuscation milestone — the one that ships
  the SHA operators (G6) **and** the bundled **synchronous SHA-256** (G11) **and** the specified hash
  protocol (G12). This is a *separate, later* bump from the wire-parsing bump above; obfuscated offline
  rules are not supportable until it lands. Confirm no `evaluate()`/protobuf assumptions leak in.

### Step 1 — Parsed-config type surface (`core/src/flags/configuration/types.ts`)
- [ ] Don't export a **named** rules/UFC type: use `UniversalFlagConfigurationV1` (already in 2.0.1) as the
  internal rules-response type and keep any `ParsedRulesBasedConfiguration` alias internal (not re-exported).
- [ ] **But note the opacity claim is only partial (item 2 / R16 / D10).** `ParsedFlagsConfiguration`
  (= upstream `FlagsConfiguration`) is **already public** (`types.ts:47` → `index.tsx:128`) and is the
  type customers receive from `configurationFromString` and pass to `setConfiguration`. Once upstream adds
  `FlagsConfiguration.rulesBased`, that public alias **structurally exposes** `rulesBased.response` (the
  UFC) — exactly as it already exposes `precomputed.response` today — so *not* exporting the sub-type does
  **not** make the schema opaque. Resolve **D10**: either (a) **accept structural visibility** and soften
  the "opaque" language (pragmatic — precomputed is already visible), or (b) redesign
  `ParsedFlagsConfiguration` as a **branded/opaque** type (a breaking type-compat change) so customers can
  pass it through but not inspect/construct it. Do not claim opacity while shipping (a).

### Step 2 — Wire parsing (`core/src/flags/configuration/wire.ts`)
- [ ] **No RN code change expected**: RN re-exports `configurationFromString`/`configurationToString`
  from flagging-core; the bumped version handles the rules branch automatically — including the future
  switch from the interim JSON shape to **protobuf/base64** decode (§2.5), which RN inherits with no
  parsing code of its own.
- [ ] Add an RN test asserting a rules wire round-trips through the re-export (guards the bump + the
  field-name churn in R8). Use whatever encoding the pinned flagging-core version emits (JSON interim,
  protobuf once landed).

### Step 3 — ONE precise state model + `loadConfiguration` (`core/src/flags/FlagsClient.ts`)
`loadConfiguration` already carries a **"FORWARD-COMPAT SEAM"** comment (FlagsClient.ts:247-255) saying
rules must be handled **before** the precomputed guard. **Define one unambiguous state model** — the
earlier draft was self-contradictory (a `kind: 'rulesBased'` state vs. "let `evaluate()` arbitrate over
the full config"; these disagree on which path serves a matching precomputed config).
- [ ] Model: **retain the whole parsed `FlagsConfiguration`** plus an **optional validated precomputed
  `Map`** (decoded once via `decodePrecomputedFlags`) plus a **validated rules snapshot** (`UniversalFlagConfigurationV1`, G7).
  Selection order mirrors the combined `evaluate()`: matching precomputed → rules → error — but RN
  implements it itself and calls only the **rules-only** `evaluateRulesBasedConfiguration()` (A). Serve
  precomputed from the `Map`; enter rules only when precomputed is absent/mismatched. **Decide the match
  per resolution, not once at reconcile** (B) — see Step 5. `reconcile()` still sets overall
  readiness/`configurationStatus`, but must not freeze the precomputed-vs-rules choice against a context
  a later hook-mutated resolution won't share.
- [ ] **Mixed-validity — split by failure stage (D).** `configurationFromString` in PR #336 parses
  **both** branches inside **one** `try/catch` (`JSON.parse(precomputed.response)` **and**
  `JSON.parse(rulesBased.response)`), and the `catch` returns `{}`. So:
  - **Parse-time corruption** (either `response` is not valid JSON/protobuf) → the **whole wire collapses
    to `{}`**; RN never receives the valid sibling. This is **atomic** unless flagging-core switches to
    per-branch parsing — RN cannot isolate it. Classify the empty result as `GENERAL` (as today).
  - **Structurally-invalid-but-decoded branch** (JSON parsed, but the UFC/precomputed shape is bad) → RN
    **can** isolate this during its own per-branch validation (Step 3 model / G7): keep the valid branch
    servable, mark the bad branch unusable, and never silently fall back to it.
  Enumerate both stages in tests; do not promise recovery of a parse-corrupted sibling.
- [ ] Validate the rules snapshot on load (G7) — do not store an unvalidated UFC that a later
  evaluation will throw on. Rules are handled **before** the `!precomputed` guard so they are never
  misclassified as `GENERAL`.
- [ ] **Handle unsupported operators — but push validation to the right layer (G6 — critical).** The
  engine treats an unknown operator (e.g. `ONE_OF_SHA256` on an SDK without it) as an invalid rule and
  **silently falls back to `DEFAULT` with no error** (only literally *fail-open* if that coded default is
  permissive; otherwise it's a silent wrong value). This must not reach a silent default — but **RN should
  not hand-maintain a "known operators" set**: it would duplicate flagging-core's schema and drift (reject
  an operator the upgraded evaluator supports; accept one whose impl is absent/incompatible; and the future
  protobuf decoder may map unknown enums to a number / `UNSPECIFIED` / drop them before RN ever sees a
  string). Preferred fixes, in order:
  1. **Upstream** exposes `validateRulesConfiguration()` / a capabilities API, **or** the evaluator/parser
     surfaces an unsupported operator as `GENERAL` instead of a silent `DEFAULT`.
  2. If RN needs a temporary guard, **derive it from the pinned `OperatorType` enum** (exported by
     flagging-core, `rules.d.ts:3`) — never a separately maintained list — and reject unknowns as `GENERAL`.
- [ ] **Capability negotiation needs a concrete owner:**
  - **Official fetch path:** the request advertises the evaluator's capabilities; the service omits or
    rejects flags the SDK can't evaluate.
  - **Portable/offline wire (this provider):** embed required capabilities / a minimum evaluator version in
    the wire, **or** guarantee the parser preserves-and-rejects unknown operators. (Owner TBD with Core.)
- [ ] **Unsupported operators must fit the branch-level validity model (reconciles the tension with the
  mixed-validity rule above).** An unsupported operator invalidates the **rules branch**, not necessarily
  the whole config. Define the matrix:
  - **Rules-only + unsupported operator** → `GENERAL`.
  - **Valid precomputed + unsupported rules:** the rules branch is unusable but the precomputed branch is
    **retained and served when its context matches** (consistent with the mixed-validity decision) — do
    **not** reject everything.
  - **Same, context mismatched** (so precomputed can't serve and rules are unusable) → `GENERAL` (the
    config is genuinely unusable here), **not** `INVALID_CONTEXT`.
  - **Per-resolution (B):** provider stays `READY` while precomputed matches; a resolution whose (possibly
    hook-mutated) context falls through to the invalid rules branch returns `GENERAL`.
  - **Granularity:** invalidate the **whole rules branch** (simplest, safest) rather than per-flag — a
    single unsupported operator means RN can't trust that branch's evaluation. (Revisit only if per-flag
    isolation is later justified.)
- [ ] **Validate SHA condition shape at load once the protocol exists (G12).** Beyond "is this operator
  known", a `ONE_OF_SHA256`/`NOT_ONE_OF_SHA256` condition carries a salt + digest array that is untrusted
  wire data. Reject before READY: missing/malformed/oversized salt, wrong salt or digest length/encoding,
  non-string digest entries, malformed condition shapes, and excessive condition/value counts (thread-block
  guard). Same predictable-failure discipline as the precomputed decoder.

### Step 4 — `reconcile()` for rules (`core/src/flags/FlagsClient.ts`)
- [ ] When the active path is rules: **any** external context is valid (no `INVALID_CONTEXT`).
  `configurationStatus = 'ready'`. Do **not** populate `flagsCache` (lazy).
- [ ] **Targeting-key decision (G8) — do NOT blindly manufacture `{ targetingKey: '' }`.** `''` buckets
  as a real anonymous subject, so every keyless context would bucket **identically** and a "missing key"
  could never surface `TARGETING_KEY_MISSING`. Decide the semantics:
  - If missing ≡ anonymous-empty is acceptable, keep `''` and document that keyless == one shared bucket.
  - If they must differ, thread `undefined` (not `''`) into the rules path when no key is set — which
    requires relaxing the internal context typing and adding `TARGETING_KEY_MISSING` to `FlagErrorCode`.
- [ ] Leave the precomputed branch unchanged. The precomputed mismatch→`INVALID_CONTEXT` fires **only**
  when there is no rules fallback (mirror browser `getConfigurationError`).

### Step 5 — Evaluation path (`core/src/flags/FlagsClient.ts` `getDetails`)
Largest change. `getDetails` currently serves from `flagsCache` (precomputed/online).
- [ ] For rules, call **`evaluateRulesBasedConfiguration()`** (rules-only; A) with the UFC directly:
  ```ts
  import { evaluateRulesBasedConfiguration } from '@datadog/flagging-core';
  const details = evaluateRulesBasedConfiguration(rulesResponse, type, key, defaultValue, ofContext, logger);
  ```
  `rulesResponse` is `configuration.rulesBased.response` (a `UniversalFlagConfigurationV1`). It takes an
  **OpenFeature-flat** context (`{ targetingKey, ...attrs }`) while `FlagsClient` holds
  `{ targetingKey, attributes }` — add an adapter (inverse of `toDdContext`/`normalizeWireContext`); the
  engine folds `targetingKey → subjectAttributes.id` only when non-null (G8).
- [ ] **Select the path against the RESOLUTION context, not the stored one (B).** `resolveX` currently
  discards its `context` arg (`coreProvider.ts:61`) and `FlagsClient` uses the stored context. But a
  **`before` hook can mutate the evaluation context for a single resolution** (see OpenFeature context
  spec), so the context actually being evaluated can differ from the one `reconcile()` last saw. If the
  precomputed context-match check was decided at reconcile-time against the stored context, a hook-mutated
  resolution could be served a **precomputed value for a context it does not match** — an assignment leak.
  So the **precomputed-vs-rules selection (esp. the precomputed context match) must run per-resolution
  against the effective resolution context**, or the provider must explicitly ignore/forbid `before`-hook
  context changes. Per-resolution selection still keeps the O(1) precomputed `Map` lookup.
- [ ] **Thread the resolution context + logger — but resolve the dependency boundary first (item 5 + N).**
  The web SDK is **static-context**: clients/invocations must **not** supply context (OpenFeature forbids
  it), so the fix is *not* "don't drop invocation context" — there is none. Context comes from
  global/domain state **plus `before`-hook mutations**, and the resolver receives that effective context.
  Thread the resolver-provided context + logger into the rules evaluation (as the browser `CoreProvider`
  does) and test against the client-side model (global/domain + hooks). **Boundary problem (G10/R13):**
  `packages/core` has **no** `@openfeature/*` dependency (`package.json` — zero refs), and flagging-core
  publishes `.d.ts` that `import @openfeature/core` while listing it only as a **devDependency**
  (`flagging-core/package.json:43`) — so the `Logger`/`ResolutionDetails`/`EvaluationContext` types work
  today only by **hoisting accident**. Do **not** add a bare `@openfeature/*` import to core. Pick one:
  (a) keep OpenFeature types in `react-native-openfeature` and pass **structurally-compatible internal
  context/logger types** into `FlagsClient` (no core dep); or (b) add an explicit `@openfeature/*`
  dependency to `packages/core` **and** require flagging-core to declare `@openfeature/core` as a real
  dependency. Also decide whether threading widens the **public** `FlagsClient.get*Details` API or goes
  through a **separate internal entry point** — prefer the latter to avoid a public API change.
- [ ] **`id` vs `targetingKey` precedence — decide, don't just "watch" (D9/item 4).** The engine builds
  `subjectAttributes = { id: subjectKey, ...remainingContext }` (`evaluation.js:15`), so a customer
  **`id` attribute overrides** the synthetic targeting-key `id` used for **rule matching**, while
  **sharding still uses `subjectKey`** (`selectSplitUsingSharding`) — targeting and bucketing would then
  key off different identifiers. Choose and enforce a contract: **reserve `id` for the targeting key**
  (drop/reject a customer `id` in the flat adapter — recommended), or deliberately document the upstream
  override. Assert the chosen result in tests; do not leave it to "watch".
- [ ] Map `ResolutionDetails` → RN `FlagDetails<T>` (value, variant, `allocationKey`/`doLog` from
  `flagMetadata`, reason, errorCode/errorMessage). **`evaluateRulesBasedConfiguration` already returns
  `FLAG_NOT_FOUND`** for an absent flag (`evaluation.js:21`), plus `TYPE_MISMATCH`/`DISABLED`/`DEFAULT`/
  `TARGETING_KEY_MISSING`/`GENERAL` — **map them through; RN does not synthesize `FLAG_NOT_FOUND`**
  (round-2 said otherwise — corrected).
- [ ] **Prototype-safe flag lookup (G9 — bug).** The evaluator does `config.flags[flagKey]` on a plain
  object, so a **missing** flag named `toString`/`__proto__`/`constructor` resolves through
  `Object.prototype` (truthy) and returns **`DISABLED`, not `FLAG_NOT_FOUND`**. Before delegating, guard
  with `Object.prototype.hasOwnProperty.call(rulesResponse.flags, key)` (or `Object.hasOwn`) and return
  `FLAG_NOT_FOUND` yourself when it is not an own property — **or** require an upstream own-property/
  null-prototype-dict fix. Test **absent reserved-name flags** (not just malformed configs that contain
  those names).
- [ ] **Exposure/telemetry tracking (CORRECTED — D3):** the native side (Android `trackResolution`, iOS
  `trackEvaluation`) expects **every successful assignment** to cross the bridge and applies `doLog`
  itself — `doLog` gates **only the exposure event**, while RUM (gated by `rumIntegrationEnabled`) and
  evaluation telemetry (gated by `trackEvaluations`) fire independently. So call
  `this.track(entry, ctx)` for **every successful assignment, NOT gated on `doLog`** — matching the
  existing precomputed path (`FlagsClient.ts:441`, which is therefore correct, not a bug). Track **only
  when a variant was actually assigned** — do **not** track for `DISABLED`, unmatched/no-variant
  `DEFAULT`, `TYPE_MISMATCH`, `FLAG_NOT_FOUND`, or error results (matches precomputed's early returns).
  **Blocked by G4:** the synthesized `FlagCacheEntry` needs `extraLogging`, which the rules
  `flagMetadata` does not carry. Resolve G4 before implementing this bullet.
- [ ] Keep precomputed + online paths serving from `flagsCache` untouched.

### Step 6 — Path selection when both present + bundle-size decision
- [ ] **Two paths (DECIDED — D4), one precise per-resolution selection (see Step 3 + Step 5/B).** Serve
  matching precomputed from the decoded `Map` (O(1)); take the rules branch
  (`evaluateRulesBasedConfiguration(rulesResponse, …)`) **only** when precomputed is absent or its context
  does not match **the effective resolution context**. Because RN calls the **rules-only** evaluator with
  just the UFC, precomputed data is excluded from the upstream call **by construction** — there is no
  full-config `evaluate()` arbitration to accidentally route precomputed through, and RN's
  `decodePrecomputedFlags` validation is never bypassed. Do the precomputed context-match per resolution
  (B), not once at reconcile. Factor the shared `ResolutionDetails → FlagDetails` +
  synthesize-`FlagCacheEntry` mapping into one helper.
- [ ] **Bundle size (CORRECTED — D5): the engine already ships; measure, then likely do nothing.** The
  earlier premise was wrong: RN's `wire.ts` already imports the flagging-core **root barrel**, so under
  Metro the whole engine + `spark-md5` is **already in every `@datadog/mobile-react-native` bundle**
  today (§2, G5). The rules evaluator (`evaluateRulesBasedConfiguration`) also already ships, so enabling
  rules adds only the rules wire branch — negligible. Actions:
  1. **Measure separate baselines** (item 6): current baseline, root-SDK import, online flags,
     precomputed offline, dynamic offline. Attribute the delta correctly.
  2. Dynamic `import()` is **rejected** — Metro does not code-split release bundles, so it wouldn't
     shrink anything (Metro module API confirms).
  3. A precomputed-only split (`DatadogPrecomputedOfflineProvider` + a flagging-core
     `@datadog/flagging-core/precomputed` subpath) is the *only* real size lever — but it helps **only
     if** flagging-core adds subpath exports (2.0.1 has just `.`) **and** RN moves its `wire.ts` import
     off the root barrel onto that subpath. Pursue only if the measured delta actually justifies it.
     The genuinely new mass to watch is **two future upstream additions**: the protobuf runtime (G2) **and
     a synchronous SHA-256 implementation** for obfuscation operators (G11) — *not* the existing engine. (This
     split is a bundle lever only — not a security gate; see D6.)

### Step 7 — `DatadogOfflineOpenFeatureProvider` (`react-native-openfeature/src/offlineProvider.ts`)
- [ ] `initialize` / `onContextChange` already do not fetch. For rules, `applyContext`'s reconcile
  returns `ready` for any context, so the mismatch-throw path disappears naturally. Verify the
  empty-context handling for rules — **but this depends on the unresolved D8** (missing vs anonymous):
  there is no embedded context to re-adopt, so an empty context is *either* an anonymous subject (`''`)
  *or* a "no key" signal, per whatever D8 decides. Do not hard-code the anonymous interpretation here
  until D8 is settled.
- [ ] **Update the class doc comment** — it currently states precomputed-only semantics ("you should
  **not** call `OpenFeature.setContext`"). For rules, `setContext` **is** the intended dynamic path.
- [ ] `setConfiguration` event mapping (`Ready` / `ConfigurationChanged` / `Error`) is already generic
  and matches the RFC event model; confirm a rules `ready` triggers the right transitions.
- [ ] **Opt-in posture (D6 — justification splits by config source).** For **Datadog-generated** configs
  the platform per-flag switch is the opt-in the Offline-Init RFC asks for
  (`Offline-Initialization-for-Feature-Flagging.md:95`, `:158`), enforced server-side — but the RFC is a
  first draft (per-flag vs per-org unsettled) and **scoped client tokens don't exist yet** (RFC:109). For
  **customer-supplied/bundled** wires (which this provider accepts) platform controls are **bypassed**, so
  `setConfiguration(rules)` is the opt-in and the customer owns supplying client-appropriate rules. Either
  way the **RN offline provider needs no additional gate**. Keep product/security sign-off on record; ship
  the docs caveat + "what stays visible" list regardless.

### Step 8 — Exports, examples & docs
- [ ] **Do NOT export a named rules/UFC type — but that alone does not make the config opaque (E + D10).**
  Keep `ParsedRulesBasedConfiguration`/`UniversalFlagConfigurationV1` unexported. **However**, the already-public
  `ParsedFlagsConfiguration` structurally carries `rulesBased` after the bump (item 2 / R16), so decide
  **D10** here: soften the opacity claim (accept it, as with precomputed today) or brand
  `ParsedFlagsConfiguration`. Don't ship docs/marketing that call the config opaque under option (a).
- [ ] **Full two-flow README rewrite (not just a new snippet).** `react-native-openfeature/README.md`
  (≈`:146`–`:169`) currently documents **precomputed-only** semantics: single-subject snapshot, the
  "do **not** call `OpenFeature.setContext` with a different context" warning, the empty-context/`''`
  re-adopt caveat, and the dedicated-domain/`clientName` guidance. The rules flow **inverts** much of
  this (`setContext` *is* the dynamic path; there is no embedded context to re-adopt). Rewrite the
  offline section to present both flows side-by-side and clearly scope each caveat to precomputed.
- [ ] Update example apps (`example/src/flags/flagsProvider.ts`,
  `example-new-architecture/flags/flagsProvider.ts`) with a rules-based offline flow
  (`configurationFromString(wire) → setConfiguration → setContext(a) / setContext(b)`).
- [ ] Update the class doc comment on `DatadogOfflineOpenFeatureProvider` for the two-flow behavior.
- [ ] **Document precisely what stays visible in a rules config (D7 threat model) — cover ALL shipped UFC
  data, not just names.** Don't call it "confidential". Per `ufc-v1.d.ts`, the config ships: flag/variant/
  attribute **names**; variant **values**; regex/numeric/version **operands**; the decodable config
  **structure**; **guessable hashed membership values** (salted `ONE_OF_SHA256` resists precomputation but
  not offline enumeration of low-entropy values); **and** allocation **keys**, split **serialIds**,
  **`extraLogging`**, **`doLog`**, allocation `startAt`/`endAt`, shard **salts**, the **environment name**,
  and **`createdAt`**. Flag `extraLogging` especially — the plan is explicitly blocking on exposing it for
  tracking (G4). Consider the RFC's UI lock-icon idea.

---

## 5. All imports added to dd-sdk-reactnative

From `@datadog/flagging-core`:
- `evaluateRulesBasedConfiguration` — **static** value import in `core/src/flags/FlagsClient.ts`
  (already public in 2.0.1; A). No dynamic import (D5: it doesn't reduce Metro bundle size). **Not
  `evaluate`.**
- `type UniversalFlagConfigurationV1` (already exported by 2.0.1) — the internal rules-response type in
  `configuration/types.ts` / `FlagsClient.ts`. `type FlagsConfiguration` / `FlagTypeToValue` as today.
- (already imported) `configurationFromString`, `configurationToString`, precomputed types.
- **`Logger`/`ResolutionDetails` — NOT imported bare into core (D11).** `packages/core` has no
  `@openfeature/*` dep and flagging-core mis-declares `@openfeature/core` as a devDep (G10). Per D11:
  either pass **structurally-compatible internal** context/logger types from react-native-openfeature into
  an **internal** `FlagsClient` entry point, or add an explicit core `@openfeature/*` dep + fix flagging-core's
  published dep. Do not widen `FlagsClient.get*Details` for this.
- **Kept internal, not re-exported:** any `RulesBasedConfiguration`/`ParsedRulesBasedConfiguration` alias (E).

Internal (RN) new:
- A context adapter (RN `{targetingKey, attributes}` ↔ OpenFeature-flat `{targetingKey, ...attrs}`),
  likely in `flags/configuration/context.ts` or `flags/internal.ts`.
- An internal `ParsedRulesBasedConfiguration` alias used only within `flags/` (no public export chain — E).

**No new native surface required** — `NativeDdFlags.trackEvaluation(clientName, key, rawFlag,
targetingKey, attributes)` already accepts a synthesized flag object, and rules evaluation is entirely JS.
**Caveat (G4):** `rawFlag` must carry `extraLogging`, which the rules result does not expose today —
resolve upstream first, and confirm whether the collapsed `INTEGER`/`NUMERIC` → `number` variation type
is acceptable for native telemetry.

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
- [ ] Flag-not-found → `FLAG_NOT_FOUND` + default (the evaluator returns this directly — map it through).
  Type mismatch → `TYPE_MISMATCH` + default.
- [ ] **Prototype-named absent flag (item 1 bug):** evaluating a flag key `toString` / `__proto__` /
  `constructor` that is **absent** from `flags` returns **`FLAG_NOT_FOUND`** (proves the own-property
  guard works) — without the guard the evaluator returns `DISABLED`. Distinct from a malformed config
  that merely *contains* such a key.
- [ ] **`id`/`targetingKey` precedence (D9):** a customer `id` attribute is handled per the chosen
  contract (recommended: dropped so the targeting key is the sole subject id) — assert rule matching and
  sharding key off the **same** identifier.
- [ ] **Disabled flag** (`enabled: false`) → default with `DISABLED` reason.
- [ ] **No matching allocation** / after `endAt` / before `startAt` → default allocation (`DEFAULT`).
- [ ] **Missing variant** (split references a variationKey absent from `variations`) → default.
- [ ] **Targeting-key semantics (G8):** `undefined`/null key with a sharded matching allocation →
  `TARGETING_KEY_MISSING` **only if** RN decides missing≠anonymous and threads `undefined`; an **empty
  string `''` buckets as a real subject** (assert two distinct empty-key contexts bucket the same). Do
  not assert `TARGETING_KEY_MISSING` for `''` — it cannot occur.
- [ ] **Per-resolution path selection (B):** with **both** precomputed (matching stored context) and
  rules loaded, a `before` hook that mutates the resolution context so it **no longer matches** the
  precomputed snapshot must **not** be served the precomputed value — it must fall through to rules (or
  error), i.e. the precomputed match is re-checked against the resolution context, not the stored one.
- [ ] Exposure/telemetry (D3): `native.trackEvaluation` called for **every successful assignment
  regardless of `doLog`** (verify `doLog:false` still crosses the bridge so native RUM/eval telemetry
  fire); assert the synthesized flag carries `variationKey`, `allocationKey`, `variationValue` string,
  and `extraLogging` (blocked on G4).
- [ ] **Negative tracking (J):** `native.trackEvaluation` is **NOT** called for `DISABLED`,
  unmatched/no-variant `DEFAULT`, `FLAG_NOT_FOUND`, `TYPE_MISMATCH`, or error results — only a real
  assigned variant tracks (matches precomputed's early returns).
- [ ] **Validation / hostile input (G7):** malformed envelope (no `flags`), malformed flag, bad
  shard/range, inherited-key flag (`toString`/`__proto__`), and **post-load mutation** of the passed
  config object — each fails predictably (default + error, not a throw/hang from a READY provider).
- [ ] **Catastrophic regex (G7/F) — run in an isolated, time-bounded process** (a hostile pattern can
  hang Jest/Hermes). Assert the chosen mitigation (upstream safe-regex guarantee / static policy /
  bounded engine) holds; do not rely on structural validation to detect ReDoS.
- [ ] **Mixed configs (D):** (a) **parse-time** corruption of either branch collapses the whole wire to
  `{}` (atomic — assert the valid sibling is *not* recoverable today); (b) **structurally-invalid but
  decoded** branch is isolated — the valid sibling stays servable, the bad branch is never a silent fallback.
- [ ] Context threading uses the client-side model (global/domain + `before` hooks; no client/invocation
  context — C), and the OpenFeature types reach `FlagsClient` via the chosen dependency boundary (D11),
  not a bare `@openfeature/*` import in core.
- [ ] **Unsupported operator fails closed (G6):** a rule with an operator RN doesn't recognize
  (`ONE_OF_SHA256` today, or any future operator) is **rejected at load as `GENERAL`** — assert it does
  **not** silently evaluate to `DEFAULT`. Include a **cached-config-after-downgrade** case (a config with
  newer operators loaded by an older SDK build).
- [ ] Obfuscation (D7): (a) attribute string values survive `processEvaluationContext` / the flat adapter
  **unmodified** so the engine can hash them; (b) once upstream ships `ONE_OF_SHA256`/`NOT_ONE_OF_SHA256`
  with a specified protocol (G12), evaluate the **canonical cross-SDK test vectors** (salt, stringification
  of numbers/booleans, empty/null, `NOT_ONE_OF_SHA256`) — byte-identical to the generator/server, not just
  "strings pass through". Until then those operators are an upstream gap (absent from 2.0.1).
- [ ] **Evaluation hot-path performance:** rules `getX` (incl. the sync SHA-256 once present) is fast
  enough for repeated per-render calls; measure on a release build under Hermes and JSC.

### Provider (react-native-openfeature)
- [ ] Rules config loaded before registration → provider reaches `READY` (no context needed).
- [ ] `setContext(ctxA)` then `setContext(ctxB)` re-evaluates locally, **no fetch**, values reflect each
  context. Do **not** assert a `RECONCILING→READY` sequence: `onContextChange` is **synchronous**
  (`offlineProvider.ts:103`) and intentionally skips the transient `RECONCILING` state; assert the
  final `READY`/updated values and that no fetch occurred instead.
- [ ] `setConfiguration` valid rules → `CONFIGURATION_CHANGED` (and `READY` if recovering from error).
- [ ] `setConfiguration` empty/invalid → `PROVIDER_ERROR` with a top-level errorCode.
- [ ] Determinism: same (context, config) → same bucketed variant across calls.
- [ ] Regression: all existing precomputed offline tests still pass.

### Integration / non-functional
- [ ] End-to-end: parse a real rules `ConfigurationWire` sample → set provider → evaluate several flags
  across several contexts; assert values + exposure calls. Use a UFC fixture from ffe-service or the
  flagging-core test fixtures.
- [ ] **Bundle-size check** (D5/G5): measure **separate baselines** — current baseline, root-SDK import,
  online flags, precomputed offline, dynamic offline — and attribute the delta correctly (the engine
  already ships, so the *incremental* rules cost is near-zero; the **real future adds are the protobuf
  runtime (G2) and the synchronous SHA-256 (G11)** — measure each against the pinned post-SHA version).
- [ ] **Hermes AND JSC smoke test**: rules evaluation (incl. `sharders`/`spark-md5`, the future protobuf
  runtime, and the future synchronous SHA-256) runs under **both engines** across the supported RN range;
  confirm no Node `crypto` / browser-only Web Crypto / unavailable globals.
- [ ] **Integration prerequisites checklist** must include: the synchronous SHA dependency (G11), Hermes
  **and** JSC coverage, and the **actual post-SHA flagging-core version** (Step 0) — not "protobuf only".

---

## 7. Risks & unknowns

1. **Rules wire parsing + parsed-config slot are unpublished (G1, G3).** The engine **and the rules
   evaluator (`evaluateRulesBasedConfiguration`) already ship** in 2.0.1; only the wire parsing + slot
   (PR #336) block — **not `evaluate()`** (RN doesn't use it). PR #336 is **CONFLICTING / REVIEW_REQUIRED**,
   so its shape may still move. Mitigate: develop against a linked / `npm pack` build; keep the RN diff
   isolated so the dependency bump is the only integration point.
2. **Two evaluation paths in `FlagsClient` (DECIDED D4 — keep two).** Precomputed serves from a decoded
   `Map`; rules evaluate lazily via `evaluateRulesBasedConfiguration()`. Residual risk: divergent reason
   codes / type checks — mitigated by the shared mapping helper, the explicit per-resolution
   path-selection (Step 3/5), and tests. (The evaluator returns `FLAG_NOT_FOUND` itself; RN only adds the
   own-property guard — R14.)
3. **Exposure/telemetry parity — BLOCKING (G4, CORRECTED D3, NARROWED).** Native tracks **every** successful
   assignment (`doLog` gates only the exposure event; RUM + eval telemetry are separate), so RN must
   `track` unconditionally on assignment. The rules `flagMetadata` **already carries** serialId
   (`__dd_split_serial_id`) and timestamp (`__dd_eval_timestamp_ms`); **only `extraLogging` is missing**
   — and RN's `FlagCacheEntry`/bridge have no serial/timestamp slot anyway. Define the exact native
   payload, have upstream expose **`extraLogging`**, and confirm whether the `INTEGER`/`NUMERIC`→`number`
   collapse matters for native telemetry.
4. **Bundle size (CORRECTED D5 — mostly a non-issue, two future adds).** The engine + `spark-md5` + the
   rules evaluator **already ship** via RN's root-barrel import today, so the incremental rules cost is the
   wire branch only. Two **future** upstream additions are genuinely new mass: the protobuf runtime (G2)
   and a **synchronous SHA-256** for obfuscation (G11). Metro won't code-split, so dynamic import is out; a
   provider/subpath split is the only real lever and only if measurement justifies it. Measure first.
5. **Hermes/JSC bundling.** `sharders.ts`/`spark-md5`, the future protobuf runtime (G2), and the future
   **synchronous SHA-256** (G11) must run under **Hermes and JSC** across the supported RN range. Add smoke
   tests + SHA-specific release-build perf/bundle measurements; confirm no Node `crypto` / browser-only Web
   Crypto / unavailable globals.
6. **Context/logger threading + paradigm (item 5, CORRECTED C).** `resolveX` discards the OF context+logger
   and evaluates against the stored context. The web SDK is **static-context** — there is no
   client/invocation context; context is global/domain + `before`-hook mutations. Thread the resolver's
   effective context+logger into rules eval **through a resolved dependency boundary (R13)**, settle the
   `id`/`targetingKey` precedence (R15), and — see R12 — do the precomputed match against that
   per-resolution context.
7. **Security / opt-in — justification splits by config source (D6).** For **Datadog-generated** configs
   the platform per-flag switch is the opt-in (but the RFC is a first draft and scoped client tokens don't
   exist yet, RFC:109). For **customer-supplied/bundled** wires — which this provider accepts — platform
   controls are **bypassed**, so `setConfiguration(rules)` is the opt-in and the customer owns supplying
   client-appropriate rules. "No SDK gate" still holds; keep sign-off on record + ship the docs caveat.
8. **Wire naming/version churn (§2.5).** `rulesBased` (code) vs `server` (RFC) vs `rules` (Confluence);
   `version` 1 vs 2. The docs are drafts. Pin to the released version, never hard-code the field name, add a guard test.
9. **Obfuscation — design known, three hard prereqs, and today it fails **open** (G6/G11/G12, D7).**
   Salted `ONE_OF_SHA256`/`NOT_ONE_OF_SHA256` operators, engine-evaluated. RN needs no detection/pre-hash,
   **but**: (a) the operators are absent from 2.0.1 and an unknown operator **silently returns `DEFAULT`**
   (not an error) — RN must reject unknown operators at load as `GENERAL` and upstream must add them +
   capability/version negotiation; (b) SHA-256 must be **synchronous** and Hermes/JSC-safe — new bundle
   mass (G11); (c) the salted-hash **protocol is unspecified** — needs cross-SDK test vectors (G12).
   **Threat model:** salt defeats precomputation/rainbow tables but does **not** hide low-entropy guessable
   values from offline enumeration (NIST SP 800-132) — do not call it "confidentiality".
10. **Untrusted-wire validation + regex — high (G7, CORRECTED F).** `evaluateRulesBasedConfiguration`
    derefs `config.flags[flagKey]` before its try/catch and builds `new RegExp(...)` from wire patterns,
    so a malformed/hostile rules wire can throw or hang from a READY provider. Structural validation on
    load is doable in RN, but **ReDoS is not reliably detectable by validation alone** — require an
    upstream safe-regex guarantee / static policy / bounded engine, run adversarial tests in an isolated
    time-bounded process, and **clone before freezing** the snapshot (don't freeze the caller's object).
11. **Missing vs anonymous targeting key (G8).** `''` buckets as a real subject; only null/undefined
    raises `TARGETING_KEY_MISSING`. RN's required-`string` type and missing `FlagErrorCode` member make
    "missing" unrepresentable. Decide the semantics (D8) before coding the context adapter.
12. **Per-resolution path selection (B).** A `before` hook can mutate the resolution context, so a
    precomputed-vs-rules choice frozen at reconcile time (against the stored context) could serve a
    precomputed value to a non-matching context (assignment leak). Re-check the precomputed match against
    the effective resolution context on every evaluation, or explicitly ignore/forbid hook context changes.
13. **OpenFeature type/dependency boundary (N, NEW).** `packages/core` has **no** `@openfeature/*` dep, and
    flagging-core ships `.d.ts` that import `@openfeature/core` while declaring it only as a devDependency —
    so the shared types resolve only by hoisting accident. Threading `Logger`/`ResolutionDetails` into core
    would deepen this. Fix by either passing structurally-compatible internal types from
    react-native-openfeature into core (no core dep), or adding an explicit core dep **and** getting
    flagging-core to publish `@openfeature/core` as a real dependency. Also decide public-API vs internal
    entry point for the threaded params.
14. **Prototype-unsafe flag lookup (item 1, NEW — bug).** `config.flags[flagKey]` on a plain object means an
    absent flag named `toString`/`__proto__`/`constructor` returns `DISABLED` instead of `FLAG_NOT_FOUND`.
    RN must own-property-guard before delegating, or get an upstream own-property/null-prototype fix.
15. **`id` vs `targetingKey` precedence (D9, NEW).** The evaluator lets a customer `id` attribute override
    the targeting-key id for **rule matching** while **sharding** uses the targeting key — split identity.
    Enforce a contract (recommended: reserve `id` for the targeting key, drop a customer `id`) and test it.
16. **Public config opacity is already partial (item 2, NEW).** `ParsedFlagsConfiguration` (= upstream
    `FlagsConfiguration`) is exported from the package root, so its structure — `precomputed` today,
    `rulesBased` after the bump — is inspectable/constructable by TS consumers regardless of whether the
    sub-types are exported. Either soften the opacity claim (accept structural visibility, as precomputed
    already is) or make `ParsedFlagsConfiguration` a branded/opaque type (breaking type-compat change).

---

## 8. Decisions & remaining open questions

> **Reviewed over six rounds (2026-07-22 → 07-23); all items confirmed accurate against installed
> `@datadog/flagging-core@2.0.1`, PR #336, native Android/iOS clients, and OpenFeature specs.**
> R1 reversed **D3/D5**, corrected §2 (engine already published), added **G7/G8/D8**, flagged **D6/D7**.
> R2: use the already-published **`evaluateRulesBasedConfiguration`** not `evaluate()` (D4/A); path
> selection **per-resolution** (R12/B); mixed-validity split parse-time vs structural (D); types internal
> (E); regex safety is an **upstream** contract (F); **Q3 narrowed to `extraLogging`** (H); obfuscation
> **undetectable → "unsupported"** (G/D7). R3: **`evaluateRulesBasedConfiguration` DOES return
> `FLAG_NOT_FOUND`** (my R2 note was wrong — corrected) but its lookup is **prototype-unsafe** (G9/bug);
> `ParsedFlagsConfiguration` is **already public** so opacity is only partial (**D10**, R16); the
> **`@openfeature/*` dependency boundary is unsound** (G10, R13); **`id` overrides targeting-key** for
> rule matching (**D9**, R15). R4 (Obfuscation RFC): obfuscation is **salted `ONE_OF_SHA256` operators +
> binary structure**, engine-evaluated and server-compatible — RN no-op — superseding the "customer
> pre-hashes"/"unsupported" framing. R5 (obfuscation deep-dive) tempered R4: those operators are **absent
> from 2.0.1 and today fail *open* to a silent `DEFAULT`** → must **reject unknown operators as `GENERAL`**
> + capability/version (G6); SHA-256 must be **synchronous/Hermes+JSC-safe = new bundle mass** (G11,
> corrects D5); the salted-hash **protocol is unspecified** → needs cross-SDK vectors (G12); "confidential"
> is **overstated** — salt stops precomputation but not offline enumeration of guessable values (D7 threat
> model); and the platform opt-in only covers **Datadog-generated** configs, not customer-supplied wires (D6).
> R6: unsupported-operator validation belongs **upstream** (`validateRulesConfiguration`/capabilities) or
> derived from the pinned `OperatorType` — **not** an RN-maintained set that drifts (G6); unsupported
> operators invalidate the **rules branch**, keeping a valid precomputed sibling (matrix in Step 3);
> malformed **SHA condition shapes** (salt/digest) need load-time rejection (G12); the "what stays visible"
> list must cover **all** UFC metadata incl. `extraLogging`/`doLog`/allocation keys/serialIds/salts (D7);
> "fail-open" → "**silent fallback**".
> **Upstream items (G1, G2, G4, G6, G7, G9, G10, G11, G12) are collaboration points with the Core
> developer** — `@datadog/flagging-core` is under active development, so edge-case gaps/bugs are expected.
> Note them here and work fixes through *together* — **not** external blockers to file or work around
> unilaterally. Raise with Core as the design firms up.

### Decisions (2026-07-23)
- **D3 — Exposure/`doLog` (REVERSED):** call native `track` for **every successful assignment,
  NOT gated on `doLog`** — matching the precomputed path (`FlagsClient.ts:441`, confirmed correct).
  Native applies `doLog` to the *exposure event only*; RUM + evaluation telemetry fire independently
  (verified in Android `trackResolution` / iOS `trackEvaluation`). Do not track for
  disabled/unmatched/type-mismatch/not-found/error (J). **Blocked by G4:** the rules result omits
  `extraLogging`, so the synthesized `FlagCacheEntry` is not yet faithful — resolve upstream first. (§Step 5, R3)
- **D4 — Evaluation paths (REFINED):** **keep two paths** — precomputed on the decoded `Map` + `track`;
  rules via the **rules-only `evaluateRulesBasedConfiguration()`** (already in 2.0.1), called with the UFC
  directly (A). RN selects the path itself (no combined `evaluate()`), so precomputed never routes through
  upstream arbitration and `decodePrecomputedFlags` validation is never bypassed. One explicit,
  **per-resolution** selection (Step 3/5, B) + a shared mapping helper. (§Step 3/6, R2/R12)
- **D5 — Bundle size (CORRECTED):** the engine + `spark-md5` + the rules evaluator **already ship** via
  RN's existing root-barrel import, so enabling rules is a near-zero incremental cost (the wire branch
  only). **Two future upstream additions are the real new mass:** the protobuf runtime (G2) and a
  **synchronous SHA-256** for obfuscation (G11). **Measure separate baselines.** Dynamic `import()`
  rejected (Metro doesn't code-split). A precomputed-only provider + `@datadog/flagging-core/precomputed`
  subpath is the only real lever (needs an upstream subpath 2.0.1 lacks + an RN `wire.ts` rework) — pursue
  only if measurement demands it. (§Step 6, R4)
- **D6 — Security/opt-in (split the justification by config provenance).** "No additional SDK gate" still
  holds, but the *why* differs by source, and the platform argument does **not** cover arbitrary offline
  wires:
  - **Datadog-generated configs:** the platform enforces distribution policy — a **per-flag switch**
    governs whether a flag may be used in rules-based client eval, so the config only carries opted-in
    rules. This is the "explicit opt-in" the Offline-Init RFC wants, satisfied server-side. *Caveats:* the
    Obfuscation RFC is a first draft (per-flag vs per-org debated), and **scoped client tokens don't exist
    today** (RFC:109) — so the fetch-time token control is partly aspirational for the rules case.
  - **Customer-supplied / bundled wires (this offline provider accepts these):** they **bypass** Datadog's
    generation and token controls entirely, so the platform opt-in doesn't apply. Here the opt-in is simply
    **calling `setConfiguration(rules)`**, and the **customer is responsible** for supplying
    client-appropriate rules.
  Keep product/security sign-off on record; ship the docs caveat (rules are on-device / reverse-engineerable)
  and the "what stays visible" list (D7) regardless. (§Step 7, R7)
- **D7 — Obfuscation (design known; NOT yet supportable).** Obfuscation is **new salted operators**
  (`ONE_OF_SHA256`/`NOT_ONE_OF_SHA256` from `ONE_OF`, server-compatible, engine-evaluated) + **binary
  structure**. It is **not** a separate payload mode and needs **no** RN detection/rejection/context
  pre-hashing (the engine hashes the subject attribute with the per-condition salt) — this supersedes the
  earlier "customer pre-hashes" / "reject obfuscated" framing. **But three hard upstream prerequisites gate
  "supported":** the SHA operators must exist (G6 — today they silently **fall back** to `DEFAULT`), backed by
  a **synchronous** Hermes/JSC-safe SHA-256 (G11 — new bundle mass), against a **fully specified portable
  hash protocol with cross-SDK test vectors** (G12). RN work: map the operators through once they exist,
  **reject unknown operators at load as `GENERAL`** (don't serve a silent default), and verify with the
  canonical vectors — not just "strings pass through".
  - **Threat model (CORRECTED — do not call this "confidentiality"):** a public per-condition salt + one
    fast SHA-256 defeats **cross-config precomputation / rainbow tables** and **obscures literal values**,
    but does **not** protect **low-entropy / guessable** values — anyone with the bundled config can hash
    candidates (`true`/`off`, common plans, domains, email dictionaries) against the included salt (NIST
    SP 800-132: known-salt lets an attacker enumerate likely candidates; only added work slows dictionary
    attacks). State it precisely; do not claim guessable values are hidden.
  - **What stays visible** (document for customers — Step 8; **all** shipped UFC data per `ufc-v1.d.ts`):
    flag/variant/attribute **names**; variant **values**; regex/numeric/version operands; decodable config
    **structure**; **guessable hashed membership values**; **plus** allocation **keys**, split
    **serialIds**, **`extraLogging`**, **`doLog`**, allocation `startAt`/`endAt`, shard **salts**,
    **environment name**, **`createdAt`**. (G6/G11/G12, R9) 
- **D8 — Targeting key (NEW):** decide whether missing (`undefined`) and anonymous-empty (`''`) are
  distinct. `''` buckets as a real subject; only null/undefined yields `TARGETING_KEY_MISSING`. If
  distinct, thread `undefined` through the rules path and add `TARGETING_KEY_MISSING` to `FlagErrorCode`;
  if not, document that all keyless contexts share one bucket. (§Step 4/7, G8, R11)
- **D9 — `id` vs `targetingKey` (NEW):** the engine lets a customer `id` attribute override the
  targeting-key id for **rule matching** while **sharding** uses the targeting key. **Recommended:**
  reserve `id` for the targeting key — drop a customer-supplied `id` in the flat adapter so matching and
  bucketing share one subject id. Assert in tests. (§Step 5, R15)
- **D10 — Config opacity (NEW):** `ParsedFlagsConfiguration` is already public and structurally exposes
  `precomputed` (today) and `rulesBased` (post-bump). Choose: **(a) accept structural visibility and drop
  the "opaque" language** (pragmatic — matches how precomputed already ships), or **(b) brand
  `ParsedFlagsConfiguration`** as opaque (breaking type-compat change). Not exporting the sub-types is
  necessary but **not sufficient** for opacity. (§Step 1/8, R16)
- **D11 — OpenFeature dependency boundary (NEW):** do not import `@openfeature/*` bare into `packages/core`.
  Choose: **(a)** keep OF types in react-native-openfeature and pass structurally-compatible internal
  context/logger types into `FlagsClient` (no core dep — preferred, and keeps threading off the public
  `get*Details` API via an internal entry point), or **(b)** add an explicit core `@openfeature/*` dep and
  require flagging-core to declare `@openfeature/core` as a real (non-dev) dependency. (§Step 5, G10, R13)

### Remaining open questions (PUNTED — revisit with flagging-core owners; do not block planning)
- [ ] **Q1 (punted):** which published `@datadog/flagging-core` version adds the `rulesBased` wire parsing
  + parsed-config slot; confirm `configurationFromString` populates the rules branch and the final wire
  field name/version. (`evaluateRulesBasedConfiguration` + `UniversalFlagConfigurationV1` already ship.) (G1/G3/R8)
- [ ] **Q2 (punted):** protobuf rules encoding — when flagging-core publishes the `.proto` and switches
  `response` from JSON to protobuf/base64-decode; which protobuf runtime, and is it Hermes-safe. (G2/§2.5)
- [ ] **Q3 (narrowed):** will upstream expose **`extraLogging`** on the rules-eval result (serialId +
  timestamp are already in `flagMetadata`, and RN's bridge has no slot for them anyway), and does native
  telemetry need the original `INTEGER`/`NUMERIC` type (engine collapses both to `number`)? (G4/D3 — blocking)
