# FFL-2837 — Dynamic Offline PR Stack

This document uses Simplified Technical English.

## Stack

Use these branches:

1. `blake.thomas/FFL-2837-PR1`
2. `blake.thomas/FFL-2837-PR2`
3. `blake.thomas/FFL-2837-PR3`

PR1 uses `blake.thomas/FFL-2837` as its base.
PR2 uses `blake.thomas/FFL-2837-PR1` as its base.
PR3 uses `blake.thomas/FFL-2837-PR2` as its base.

Keep all three pull requests in draft state.

## Temporary upstream code

Published flagging-core version 2.0.2 does not contain the new rules wire contract.
Upstream PR #344 adds the generated Protobuf-ES rules parser, SHA-256 evaluation, validation, safe flag lookup, and React Native compatibility.
It adds `@bufbuild/protobuf` as a runtime dependency.
Its packed-package smoke test uses the Metro export conditions from this repository.
Upstream PR #336 uses that parser in the browser `CoreProvider`.
PR #336 also uses the safe upstream lookup for precomputed flags.

Put a `TODO` immediately before each temporary implementation.
The `TODO` must identify the upstream replacement.
Do not hide temporary behavior in a general helper.
Tests can use a fake rules engine.
Production code must use one internal engine adapter.

Remove temporary JSON rules-wire parsing, duplicate rules validation, and local lookup guards after the upstream package is published.
Do not add a local protobuf parser.
Do not wait for upstream `extraLogging`.
The field is deprecated.
Use an empty object only where the current Android bridge requires it.

## PR1 — Rules configuration and engine boundary

Add the internal boundary for the rules engine.

- Bump to the flagging-core release that contains PR #344.
- Use a packed PR #344 package before publication.
- Use `FlagsConfiguration.rules.response`.
- Remove the temporary `rulesBased` and JSON compatibility shapes.
- Remove duplicate structural validation after the dependency bump.
- Remove the temporary own-property guard after the dependency bump.
- Add internal rules configuration types.
- Add a rules-engine adapter.
- Convert SDK contexts to engine contexts.
- Normalize engine results.
- Use the upstream protobuf rules object.
- Use upstream parser validation.
- Derive the rules response type from `FlagsConfiguration['rules']`.
- Do not export generated UFC message types.
- Keep OpenFeature types out of React Native core.
- Use compatible internal context and logger types.
- Verify that the pinned evaluator returns `FLAG_NOT_FOUND` for absent reserved-name keys.
- Keep regular-expression safety as an explicit open item.
- Add adapter contract tests.
- Add a protobuf wire contract test.
- Add reserved-name flag-key contract tests.
- Confirm that rules serialization throws.
- Add fake-engine test helpers.
- Keep current provider behavior unchanged.
- Keep precomputed evaluation unchanged.

The main review question is:

> Does this boundary isolate the SDK from the upstream rules engine?

## PR2 — Core dynamic and mixed evaluation

Add dynamic evaluation to `FlagsClient`.

- Store precomputed and rules branches independently.
- Keep a valid branch when its sibling is invalid.
- Reconcile a rules branch as ready for each context.
- Select the evaluation path for each resolution.
- Use matching precomputed data first.
- Use valid rules data second.
- Return the applicable error when neither path is usable.
- Treat a flag that the upstream parser drops as `FLAG_NOT_FOUND`.
- Keep other valid rules flags.
- Map rules results to `FlagDetails`.
- Convert successful rules results to `TrackableAssignment`.
- Track each successful rules assignment through the current native bridge.
- Let native code apply `doLog` to exposure events.
- Do not require split serial ID or evaluation timestamp in the mobile exposure payload unless the mobile contract changes.
- Record that integer and numeric variations both use the OpenFeature type `number`.
- Confirm whether mobile telemetry must preserve the original integer or numeric type.
- Keep online and precomputed behavior unchanged.
- Add rules-only and mixed-configuration tests.
- Use the fake engine for path-selection tests.

The main review question is:

> Does `FlagsClient` select the correct path and return the correct result?

## PR3 — Provider activation and customer experience

Expose dynamic evaluation through the existing offline provider.

- Pass the effective resolution context to `FlagsClient`.
- Pass the resolution logger to `FlagsClient`.
- Keep `initialize` network-free.
- Keep `onContextChange` network-free.
- Keep current provider event mapping.
- Add global-context and domain-context tests.
- Confirm the Web SDK 1.8 hook-context constraint.
- Add real-provider integration tests.
- Use a protobuf rules wire in integration tests and examples.
- Update the provider documentation.
- Update both example applications.
- Add Hermes and JSC checks where the repository supports them.
- Test the packed dependency with the repository Metro export conditions.
- Record the 6,229-byte minified and 2,070-byte gzipped browser bundle increase.
- Record the 1,106-byte minified and 459-byte gzipped React Native compatibility cost.
- Measure the packed dependency in this repository.

The main review question is:

> Does the existing offline provider expose dynamic rules without changing online or precomputed behavior?

## CI loop

After PR3 is open, check PR1 first.
Fix PR1 until its checks pass.
Then, update PR2 with the PR1 fixes.
Fix PR2 until its checks pass.
Then, update PR3 with the PR2 fixes.
Fix PR3 until its checks pass.

Repeat this order until all three pull requests are green:

```text
PR1 -> PR2 -> PR3 -> PR1
```
