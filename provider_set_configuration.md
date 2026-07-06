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

Scope for this task: **precomputed (static context)** configuration only. The API is
designed to leave room for a future **rules-based (UFC / dynamic)** branch without
reshaping it.

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

## Approach (decisions)

- **Parse the `ConfigurationWire` string in JS**, populating the existing `flagsCache`.
- **Input** is a `ConfigurationWire` string, consumed via `configurationFromString(wire)`.
- **No Swift/Kotlin changes** — evaluation and per-flag exposure tracking already run off
  JS-provided data.
- **Expose the API on both** the core `FlagsClient` and the `DatadogOpenFeatureProvider`.
- The customer still calls `setEvaluationContext` themselves; `setConfiguration` must
  **verify the precomputed config matches the active context** (see below).

## Wire format (confirmed)

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

**Inner `precomputed.response` → PrecomputedConfiguration** — **ASSUMED**: the shipped
`openfeature-js-client` `PrecomputedFlag` shape
(`packages/core/src/configuration/configuration.ts`), which matches RN's existing
`FlagCacheEntry`:

```ts
{
  data: { attributes: {
    createdAt: string
    flags: Record<flagName, {
      allocationKey: string
      variationKey: string
      variationType: 'boolean' | 'string' | 'number' | 'object'
      variationValue: /* typed value, per variationType */
      reason: string
      doLog: boolean
      extraLogging: Record<string, unknown>
    }>
  }}
}
```

> ⚠️ **Two documented formats exist.** The Confluence *PrecomputedConfiguration format*
> page ([5141791092](https://datadoghq.atlassian.net/wiki/spaces/PANA/pages/5141791092/PrecomputedConfiguration+format))
> describes an OpenFeature-aligned shape (`type` + `resolution.flagMetadata.experiment`).
> The **shipped** `openfeature-js-client` uses the `PrecomputedFlag` shape above, which
> matches RN's `FlagCacheEntry`. **We assume the shipped `PrecomputedFlag` shape.** Confirm
> with the flags backend team which the CDN actually returns, and whether `variationValue`
> is the typed value or a string.

Key facts that de-risk the JS approach:

- **Obfuscation is not supported** in the DD precomputed format — parsing is plain
  JSON → object mapping (no key hashing, no base64/salt decoding).
- `context` and the active context are both plain (`targetingKey` + attributes) — matching
  is a normalized deep-equality.
- **`configurationFromString` is lenient** — it returns an empty config (`{}`) on a parse
  error or unknown `version` rather than throwing, matching the shipped
  `openfeature-js-client` `wire.ts`. Predictable failure surfaces at the
  `setConfiguration`/provider layer (empty/absent precomputed → provider stays not-ready /
  emits `PROVIDER_ERROR`), not as a thrown parse error.
- The assumed `PrecomputedFlag` shape maps **~1:1** onto RN's existing `FlagCacheEntry`
  (`allocationKey`, `variationKey`, `variationType`, `variationValue`, `reason`, `doLog`,
  `extraLogging`), so the decoder is near-trivial and the earlier `doLog`/`variationValue`
  uncertainty is resolved by the shipped format.

## Context matching (order-independent)

Customers may call `setConfiguration` and `setEvaluationContext` in either order. The
`FlagsClient` holds the **loaded configuration** (carrying its embedded `context`) and the
**active evaluation context** independently. The servable `flagsCache` is only populated
when the two **match**; the match is re-validated on **both** calls. On mismatch, values are
not served.

## Work breakdown

| Subtask | Summary |
| :------ | :------ |
| [FFL-2686](https://datadoghq.atlassian.net/browse/FFL-2686) | `configurationFromString` + `FlagsConfiguration` type (parse wire v1; lenient — empty config on invalid/unknown version; extensible for `server`/rules) |
| [FFL-2687](https://datadoghq.atlassian.net/browse/FFL-2687) | Decode precomputed `flags` (assumed `PrecomputedFlag` shape) → `FlagCacheEntry` map — ~1:1, plain JSON |
| [FFL-2688](https://datadoghq.atlassian.net/browse/FFL-2688) | `FlagsClient.setConfiguration` + order-independent context matching |
| [FFL-2689](https://datadoghq.atlassian.net/browse/FFL-2689) | OpenFeature provider `setConfiguration` + lifecycle events |
| [FFL-2690](https://datadoghq.atlassian.net/browse/FFL-2690) | Public exports, types & docs (core + openfeature + example) |
| [FFL-2691](https://datadoghq.atlassian.net/browse/FFL-2691) | Tests (parse/round-trip, decode, context match/mismatch, events) |

## Open items (non-blocking)

- Confirm the CDN's actual precomputed shape against the two documented formats, and whether
  `variationValue` is the typed value or a string (FFL-2687). Plan assumes the shipped
  `PrecomputedFlag` shape.
- Precomputed context-mismatch behavior: default value vs `PROVIDER_NOT_READY` vs error
  (RFC open question).
- `setConfiguration` sync vs `Promise`-returning (JS-only work is synchronous, but a Promise
  keeps parity with `setEvaluationContext` and forward-compat for rules).
