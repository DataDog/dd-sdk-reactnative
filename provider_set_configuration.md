# `provider.setConfiguration` — Offline Init for React Native Feature Flags

**Jira:** [FFL-2666](https://datadoghq.atlassian.net/browse/FFL-2666)
**Status:** Planning (no implementation yet)

## Goal

Let a customer who has fetched a flag **configuration themselves** load it into the
React Native SDK and have flag evaluation behave **exactly** as it does today when the
SDK fetches precomputed assignments from the edge CDN. The core operation is:

```
configurationFromString(wire) -> provider.setConfiguration(configuration) -> evaluate(...)
```

Scope for this task: **precomputed, static single-context (one user)** configuration only.
The API is designed to leave room for a future **rules-based (UFC / dynamic)** branch without
reshaping it.

## Non-goals (out of scope for now)

The goal here is only `setConfiguration()` for a **static, single-context (one user)**
precomputed configuration. The following are explicitly out of scope for this work and can be
later:

- **`fetchPrecomputedConfiguration(...)`** — a convenience helper that fetches precomputed
  assignments over HTTP (from the Datadog/Fastly edge CDN, or from the customer's own
  service/proxy) and returns a `FlagsConfiguration`. Customers in this work fetch the
  configuration themselves; a JS-level fetch helper (auth, endpoint, ETag/`304`) returns a
  `ParsedFlagsConfiguration` and is a separate
  convenience feature for customers who would rather not handle the HTTP fetch, and is later
  work.
- **`precomputeConfiguration(...)`** — server-side conversion of rules into a client precomputed
  configuration (Node.js-only in the RFC). Not relevant to the RN client.
- **Rules-based / dynamic (UFC) on-device evaluation** — the wire `server` branch. The type
  stays extensible for it, but it is not implemented here.

## Background: how flags work today

1. `DdFlags.enable(config)` → native `enable`.
2. `DdFlags.getClient(name)` → a JS `FlagsClient` (`packages/core/src/flags/FlagsClient.ts`).
3. `flagsClient.setEvaluationContext(ctx)` → native `setEvaluationContext(...)`. **Setting
   the context is what triggers the CDN fetch** of precomputed assignments. Native
   fetches + parses and returns a **serialized snapshot** (`Record<string, FlagCacheEntry>`).
4. JS caches the snapshot in `flagsCache`. **All evaluation already happens in JS** against
   that cache.
5. `trackEvaluation` (exposure / RUM logging) is a per-flag, stateless call back to native.

So the native read path only does *fetch → parse → return a snapshot*, and native exposure
tracking reconstructs what it needs from the per-flag data JS passes it. This means offline
init can be done **entirely in JS with no native changes**: parse a supplied configuration
into the same `FlagCacheEntry` map and populate `flagsCache`.

## Approach

- **Parse the `ConfigurationWire` string in JS**, populating the existing `flagsCache`.
- **Input** is a `ConfigurationWire` string, consumed via `configurationFromString(wire)`.
- **No Swift/Kotlin changes** — evaluation and per-flag exposure tracking already run off
  JS-provided data.
- **Expose the API on both** the core `FlagsClient` and the `DatadogOpenFeatureProvider`.
- **Avoid the `FlagsConfiguration` name collision.** That identifier is already the `enable()`
  options type (`packages/core/src/flags/types.ts`). Name the parsed-wire config type distinctly
  — this plan uses **`ParsedFlagsConfiguration`** — so `configurationFromString` /
  `setConfiguration` don't overload the existing type.
- The customer still calls `setEvaluationContext` themselves; `setConfiguration` must
  **check that the precomputed config matches the active context** (see below).
- Add a **`fetchPolicy`** (`ALWAYS` default / `NEVER` / `ON_MISMATCH`) set at `enable()` with a
  per-`getClient()` override, so customers can turn off the fetch-on-`setEvaluationContext`.
  Offline init needs `NEVER`; see [Fetch policy](#fetch-policy).
- **Port, don't depend.** `openfeature-js-client` is not a dependency here (only upstream
  `@openfeature/core` + `@openfeature/web-sdk` are). Port its small pure helpers —
  `wire.ts` (`configurationFromString`/`configurationToString`) and `configMatchesContext` —
  into RN core rather than depending on the package, whose provider/exposure-logging would
  bypass RN's native RUM/exposure path. **But for the future rules (UFC) evaluator and any
  obfuscation logic, prefer *depending* on a shared platform-agnostic core (e.g.
  `@datadog/flagging-core`) rather than re-porting** — hand-porting an evolving evaluator risks
  silent assignment drift. Keep the ported helpers behind a thin internal module boundary so a
  later port → dependency swap stays contained.

## Wire format

**ConfigurationWire v1** ([ConfigurationWire](https://datadoghq.atlassian.net/wiki/spaces/PANA/pages/5141725646/ConfigurationWire)):

```ts
type ConfigurationWire = string // JSON-serialized
type Configuration = {
  version: 1
  precomputed?: {
    response: string            // JSON-encoded PrecomputedConfiguration
    context?: EvaluationContext // the context the assignments were computed for
    fetchedAt?: number
    etag?: string
  }
  server?: {                    // rules-based (UFC) config — out of scope for MVP
    response: string            // JSON-encoded server configuration
    fetchedAt?: number
    etag?: string
  }
}
```

**Inner `precomputed.response` → PrecomputedConfiguration.** A sample staging CDN response
(`POST /precompute-assignments?dd_env=staging`, saved locally as `example.json`) shows the
`PrecomputedFlag`-style shape used by the shipped `openfeature-js-client`, which lines up
with RN's existing `FlagCacheEntry`:

```ts
{
  data: {
    id: string
    type: 'precomputed-assignments'
    attributes: {
      obfuscated: boolean          // false in the sample
      createdAt: string            // RFC3339 timestamp (string, not a number)
      format: 'PRECOMPUTED'
      environment: { name: string }
      flags: Record<flagName, {
        variationType: 'boolean' | 'string' | 'number' | 'object'
        variationValue: /* typed value (e.g. boolean false) — NOT a string */
        variationKey: string
        allocationKey: string
        reason: string
        doLog: boolean
        extraLogging: Record<string, unknown>
        serialId?: number
      }>
    }
  }
}
```

> ⚠️ **Two documented formats exist.** The Confluence *PrecomputedConfiguration format*
> page ([5141791092](https://datadoghq.atlassian.net/wiki/spaces/PANA/pages/5141791092/PrecomputedConfiguration+format))
> describes an OpenFeature-aligned shape (`type` + `resolution.flagMetadata.experiment`).
> The sample CDN response and the shipped `openfeature-js-client` instead use the
> `PrecomputedFlag`-style shape above, which matches RN's `FlagCacheEntry`. **This plan
> assumes the `PrecomputedFlag`-style shape.** Since `variationValue` is the **typed** value,
> the decoder maps it to RN's `FlagCacheEntry.value` and derives the string
> `variationValue`/`variationType` that native Android exposure tracking expects. Still worth
> checking with the flags team whether the shape is stable across environments and versions.

Key facts that de-risk the JS approach:

- **Obfuscation is not supported** in the DD precomputed format (the sample response carries
  `obfuscated: false`) — parsing is plain JSON → object mapping (no key hashing, no
  base64/salt decoding). The decoder must still **read `attributes.obfuscated` and fail
  predictably** (unsupported → `PROVIDER_ERROR`) if it is ever `true`, rather than silently
  mis-mapping hashed keys as flag names when the CDN flips it on. This is the seam for a future
  obfuscated precomputed/rules format.
- `context` and the active context are both plain (`targetingKey` + attributes) — matching
  is a normalized deep-equality.
- **`configurationFromString` is lenient** — it returns an empty config (`{}`) on a parse
  error or unknown `version` rather than throwing, matching the shipped
  `openfeature-js-client` `wire.ts`. Predictable failure surfaces at the
  `setConfiguration`/provider layer (empty/absent precomputed → provider stays not-ready /
  emits `PROVIDER_ERROR`), not as a thrown parse error.
- The `PrecomputedFlag`-style shape maps **~1:1** onto RN's existing `FlagCacheEntry`
  (`allocationKey`, `variationKey`, `variationType`, `variationValue`, `reason`, `doLog`,
  `extraLogging`), so the decoder is near-trivial — the sample shows `doLog` and the per-flag
  fields present directly. The one transform is the typed `variationValue` → RN's typed
  `value` plus a stringified `variationValue`.

## Configuration kind (evaluation mode)

Keep two axes separate so the future rules mode is additive, not a reshape:

- **Configuration kind / evaluation mode** — *how* a loaded config is evaluated, chosen by which
  wire branch is populated (the way the reference providers do it): `precomputed` → look up an
  assignment that **must match** the active context; `server` (future rules/UFC) → evaluate the
  active context **locally** and serve *any* context. Only `precomputed` is implemented now.
- **`fetchPolicy`** — *whether* the SDK may hit the network on `setEvaluationContext`
  ([Fetch policy](#fetch-policy)). Network posture only; it does not select the evaluation mode.

The context match/mismatch rules below apply to the **precomputed** kind; a rules config is
context-agnostic (below).

## Context matching (order-independent)

Customers may call `setConfiguration` and `setEvaluationContext` in either order. The
`FlagsClient` holds the **loaded configuration** (carrying its embedded `context`) and the
**active evaluation context** independently.

**For a precomputed configuration** the servable `flagsCache` is only populated when the two
**match**; the match is re-validated on **both** calls. (A future rules/`server` configuration
is context-agnostic — it evaluates any active context locally and is never rejected for a
context mismatch; the match check is gated on config kind = precomputed.)

On mismatch the provider does not serve the precomputed values: it emits a `PROVIDER_ERROR`
event and enters the error provider state, and flag evaluations return the default with an
`INVALID_CONTEXT` error code (the active context does not match the loaded precomputed
configuration). `PROVIDER_ERROR` is an OpenFeature provider event/status, not an evaluation
error code. `INVALID_CONTEXT` is an existing OpenFeature `ErrorCode` — no new code is needed —
but RN's local `FlagErrorCode` union
(`PROVIDER_NOT_READY | FLAG_NOT_FOUND | PARSE_ERROR | TYPE_MISMATCH`) has to be extended to
include it. The provider's `toFlagResolution` already maps any `ErrorCode`, so it needs no
change.

This is a port of the reference `configMatchesContext` (deep-equality on `targetingKey` +
attributes), including its nuance: **a config with no embedded `context` is context-agnostic
and matches any evaluation context; a stored context must match exactly.** The RN port must
also treat a **rules-kind** config (not just a missing `context`) as context-agnostic.

## Native tracking path and `setEvaluationContext`

Two native code paths shape how much of this can stay in JS.

**Exposure / RUM tracking is per-flag and parameter-driven.** RN's `trackEvaluation` bridges to
the native SDK's internal tracking entry point (iOS
`FlagsClient.sendFlagEvaluation(key:assignment:context:)`, Android
`_FlagsInternalProxy.trackFlagSnapshotEvaluation(key, flag, context)`). On iOS that calls
`exposureLogger.logExposure`, `evaluationLogger.logEvaluation`, and
`rumFlagEvaluationReporter.sendFlagEvaluation` — each takes the `key`, `assignment`, and
`context` as arguments and none reads the native repository's stored context or fetched
assignments (`ExposureLogger` gates on `assignment.doLog`, dedups in memory, and writes through
the core feature scope). Android's `ExposureEventsProcessor` is constructed from a record writer
plus a time provider and builds each event from the passed flag + context. So tracking runs off
the flag data and context that JS supplies, as long as `DdFlags.enable()` and `getClient()` have
run to create the client. That is what keeps offline init in JS with no Swift/Kotlin changes.

**`setEvaluationContext` currently triggers a native CDN fetch.** RN's JS
`FlagsClient.setEvaluationContext` calls native `setEvaluationContext`, which fetches precomputed
assignments from the CDN and then overwrites `flagsCache` with the result:

```ts
const result = await this.nativeFlags.setEvaluationContext(...); // CDN fetch
this.evaluationContext = processedContext;
this.flagsCache = result;                                        // overwrites loaded config
```

In the offline flow the customer still calls `setEvaluationContext` (needed for context matching
and to hand a context to `trackEvaluation`), so under `fetchPolicy: NEVER` this path records the
context without invoking the native fetch and without overwriting the config-populated cache.
This is a JS-only change. See [Fetch policy](#fetch-policy) below.

## Fetch policy

Because `setEvaluationContext` fetches from the CDN today (see above), offline customers need an
explicit way to turn that off — and a hard "no network" guarantee, not just "usually won't." We
add a `fetchPolicy` set at `enable()` (global default) with an optional per-`getClient()`
override:

```ts
enum FetchPolicy {
  ALWAYS,      // fetch on setEvaluationContext (today's behavior; default)
  NEVER,       // never fetch; serve only configurations supplied via setConfiguration
  ON_MISMATCH, // use a matching supplied config; fetch only when it doesn't match the context
}
```

- **`ALWAYS`** — default; preserves current behavior. A `setConfiguration` bootstrap is
  overwritten by the fetch, so this mode is mostly for online apps.
- **`NEVER`** — MVP target for offline. `setEvaluationContext` records the context but does not
  call the native fetch or overwrite the cache; the client serves only what `setConfiguration`
  loaded. A context set with no matching config → provider not-ready / `PROVIDER_ERROR`.
- **`ON_MISMATCH`** — *fast-follow, not in this MVP.* Bootstrap-then-refresh: serve a supplied
  config when it matches the active context, otherwise fetch. Adds async fetch orchestration,
  `Reconciling`/`Stale`/`Ready` sequencing, and a fetch-failure fallback, so it is deferred.

Only `ALWAYS` (default) and `NEVER` are built now. `ON_MISMATCH` is declared for forward-compat
and implemented later. A mutable runtime setter is intentionally left out of v1 to avoid races
with in-flight fetches and already-loaded config.

`fetchPolicy` is passed inside an **options object** at `enable()` / `getClient()` (not a bare
positional enum) so it can grow fields later — e.g. `ttl`, `staleWhileRevalidate` for the future
staleness axis — without an API break.

`fetchPolicy` is purely the **network axis**; *how* a config is evaluated is set by its
[configuration kind](#configuration-kind-evaluation-mode), not by `fetchPolicy`.

## Work breakdown

| Subtask | Summary |
| :------ | :------ |
| [FFL-2686](https://datadoghq.atlassian.net/browse/FFL-2686) | `configurationFromString` + `ParsedFlagsConfiguration` type (distinct from the existing `enable()` `FlagsConfiguration`; parse wire v1; lenient — empty config on invalid/unknown version; extensible for `server`/rules) |
| [FFL-2687](https://datadoghq.atlassian.net/browse/FFL-2687) | Decode precomputed `flags` (assumed `PrecomputedFlag` shape) → `FlagCacheEntry` map — plain JSON; inject `key`; derive typed `value` + string `variationValue`; fail predictably if `attributes.obfuscated` |
| [FFL-2688](https://datadoghq.atlassian.net/browse/FFL-2688) | `FlagsClient.setConfiguration` + order-independent context matching (port `configMatchesContext`, gated on config kind = precomputed); mismatch → `PROVIDER_ERROR` + `INVALID_CONTEXT` |
| [FFL-2718](https://datadoghq.atlassian.net/browse/FFL-2718) | `fetchPolicy` enum + wiring via an **options object** at `enable()` default + `getClient()` override; implement `ALWAYS` (default) and `NEVER` (under `NEVER`, `setEvaluationContext` skips the native fetch / cache overwrite and sets context synchronously). `ON_MISMATCH` declared, implemented later |
| [FFL-2689](https://datadoghq.atlassian.net/browse/FFL-2689) | OpenFeature provider `setConfiguration` + lifecycle events |
| [FFL-2690](https://datadoghq.atlassian.net/browse/FFL-2690) | Public exports, types & docs (core + openfeature + example) |
| [FFL-2691](https://datadoghq.atlassian.net/browse/FFL-2691) | Integration / e2e tests (RUM FIT) — offline-loaded flag → RUM parity; unit tests ship inside each PR above |

## Delivery plan (PRs)

To keep each changeset easy to review, the seven sub-tasks ship as **four stacked PRs**, each
self-contained with its own unit tests (no trailing test-only PR). RUM FIT integration/e2e
coverage (FFL-2691) lands after the feature is complete.

```
PR1 ─▶ PR2 ─▶ PR3 ─▶ PR4        (each branch based on the previous)
```

| PR | Sub-tasks | Scope |
| :- | :-------- | :---- |
| PR1 | FFL-2686 + FFL-2687 | Pure JS: wire parse + precomputed → `FlagCacheEntry`, with fixtures. Kept internal (un-exported) until PR4. |
| PR2 | FFL-2688 | `FlagsClient.setConfiguration` + context matching; mismatch → `PROVIDER_ERROR` / `INVALID_CONTEXT`. |
| PR3 | FFL-2718 | `fetchPolicy` `ALWAYS`/`NEVER`. Code-independent of PR1/PR2 — can be authored in parallel and rebased into the stack. |
| PR4 | FFL-2689 + FFL-2690 | OpenFeature provider `setConfiguration` + events, public exports, docs, example. |
| after | FFL-2691 | RUM FIT integration/e2e: an offline-loaded flag evaluation reports to RUM with parity to the fetch path. |

Ordering rationale: leaf-first (pure, tested transforms), then client behavior, then fetch
control, then the public surface — one reviewable idea per PR, tests co-located. Jira encodes
this order with `Blocks` links: 2686 → 2687 → 2688 → 2718 → 2689 → 2690 → 2691.

## Open items (non-blocking)

- Check with the flags team whether the `PrecomputedFlag`-style shape seen in the sample
  (`example.json`) is stable across environments/versions, vs the OpenFeature-aligned proposal
  page (FFL-2687).
- Precomputed context mismatch surfaces as a `PROVIDER_ERROR` event/state plus an
  `INVALID_CONTEXT` evaluation error code (extending RN's `FlagErrorCode` union with this
  existing OpenFeature code) — current direction for RFC open Q2.
- `setConfiguration` sync vs `Promise`-returning (JS-only work is synchronous, but a Promise
  keeps parity with `setEvaluationContext` and forward-compat for rules).
- For the future `ON_MISMATCH` policy: fetch-failure fallback (keep serving the previous usable
  config and report `Stale`, but never serve a config that doesn't match the context) and a
  staleness axis (`fetchedAt`/`etag`/`expiresAt`-driven refresh) are separate from context
  matching and out of this MVP.
