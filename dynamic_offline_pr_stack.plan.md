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
Upstream PR #344 adds the generated Protobuf-ES rules parser, SHA-256 evaluation, evaluation-time validation, safe flag lookup, and React Native compatibility.
Its code head is `9f794c7` as of 2026-08-03.
Commits `cf9ef2e` and `9f794c7` were added after the previous review.
They align the unsupported feature-level contract and add capability-specific entry points.
It adds `@bufbuild/protobuf` as a runtime dependency.
Its packed-package smoke test uses the Metro export conditions from this repository.
It moves wire parsing and `FlagsConfigurationWire` to `@datadog/flagging-core/configuration`.
It also adds `@datadog/flagging-core/precomputed` for protobuf-free precomputed parsing and serialization.
The browser package root now includes the complete parser and provider.
The browser package adds `@datadog/openfeature-browser/precomputed` as the protobuf-free capability entry point.
The old planned `@datadog/openfeature-browser/configuration` entry point no longer exists.
The default flagging-core entry point keeps the evaluator and shared types.
It does not load Protobuf-ES.
The configuration subpath uses the Protobuf-ES base64 decoder.
The precomputed subpath ignores rules and does not load Protobuf-ES.
It does not promise strict rejection of non-canonical base64 padding.
The parser preserves decoded rules data.
The evaluator validates the requested flag and the data that evaluation reaches.
It returns a deterministic `PARSE_ERROR` for invalid data.
The parser ignores unknown protobuf fields when supported known fields remain.
The parser preserves protobuf integers as `bigint`.
The evaluator returns `PARSE_ERROR` instead of an imprecise number when an integer is outside the JavaScript safe range.
PR #344 now serializes rules configurations.
Rules serialization preserves unknown protobuf fields.
It validates precomputed configuration data during parsing.
It records complete precomputed branch errors and per-flag precomputed errors.
It requires composite conditions to reference preceding conditions.
It compiles and caches regular expressions lazily.
This cache does not solve ReDoS.
It uses the canonical schema from merged ddoghq/dd-source PR #40304 at `071c4ad`.
That schema requires an informative flag-scoped error for an unsupported feature level.
The evaluator already returns a deterministic `PARSE_ERROR` for that case.
The latest protobuf evaluator no longer validates that SHA-256 digests are 32 bytes.
An upstream fix is required before the dependency is pinned.
The React Native smoke test runs without global `BigInt`, but it evaluates only a static boolean.
The protobuf evaluator still calls global `BigInt(...)` for integer and shard safety checks.
Upstream must test and fix this path or declare `BigInt` as a runtime requirement before publication.

Upstream PR #336 uses that parser in the browser `CoreProvider`.
PR #336 also uses the safe upstream lookup for precomputed flags.
Its head is `9e1fefd`.
Its merge base is the previous PR #344 head, `41dff20`.
PR #336 has no new code commit as of 2026-08-03.
GitHub reports PR #344 as mergeable and PR #336 as not mergeable.
PR #336 must be restacked on `9f794c7` and must resolve the new browser entry-point contract.
Its description still says that the browser root excludes the parser.
That statement is stale.
The combined evaluator returns `precomputedError` before it checks rules.
React Native must keep its separate-path behavior so valid rules can survive a malformed precomputed sibling.

ddoghq/dd-source PR #34959 is merged.
It adds protobuf content negotiation to the existing UFC service endpoints.
The service returns raw UFC protobuf bytes for `Accept: application/protobuf`.
It continues to return JSON for other requests.

ddoghq/dd-source PR #40304 is also merged.
It changes only the canonical schema comments for unsupported feature levels.
It does not change the protobuf wire encoding or the service-to-envelope contract.

The raw service response is not a complete `FlagsConfigurationWire`.
A configuration producer must base64-encode the raw bytes one time and put the result in a version `1` `rules.response` envelope.
The React Native SDK does not fetch the service response.
It does not build the portable envelope.

Put a `TODO` immediately before each temporary implementation.
The `TODO` must identify the upstream replacement.
Do not hide temporary behavior in a general helper.
Tests can use a fake rules engine.
Production code must use one internal engine adapter.

Remove temporary JSON rules-wire parsing, duplicate rules evaluation checks, and local lookup guards after the upstream package is published.
Do not add a local protobuf parser.
Do not copy the removed strict base64 validator.
Do not add a service HTTP client.
Do not add service-to-wire packaging to the React Native SDK.
Do not wait for upstream `extraLogging`.
The field is deprecated.
Use an empty object only where the current Android bridge requires it.

## PR1 — Rules configuration and engine boundary

Add the internal boundary for the rules engine.

- Bump to the flagging-core release that contains PR #344.
- Use a packed PR #344 package before publication.
- Import wire parsing from `@datadog/flagging-core/configuration`.
- Keep the evaluator and shared configuration types on the package root.
- Do not import wire parsing from the package root.
- Use `FlagsConfiguration.rules.response`.
- Remove the temporary `rulesBased` and JSON compatibility shapes.
- Remove duplicate rules evaluation checks after the dependency bump.
- Remove the temporary own-property guard after the dependency bump.
- Add internal rules configuration types.
- Add a rules-engine adapter.
- Convert SDK contexts to engine contexts.
- Normalize engine results.
- Use the upstream protobuf rules object.
- Use upstream evaluation-time validation.
- Derive the rules response type from `FlagsConfiguration['rules']`.
- Do not export generated UFC message types.
- Keep OpenFeature types out of React Native core.
- Use compatible internal context and logger types.
- Verify that the pinned evaluator returns `FLAG_NOT_FOUND` for absent reserved-name keys.
- Keep regular-expression safety as an explicit open item.
- Add adapter contract tests.
- Preserve `PARSE_ERROR` and its message from the upstream evaluator.
- Add a contract test for an invalid flag that returns `PARSE_ERROR`.
- Add a contract test that an unsupported feature level returns flag-scoped `PARSE_ERROR`, not `FLAG_NOT_FOUND`.
- Add a contract test for deterministic `PARSE_ERROR` messages.
- Add contract tests for backward-only composite condition references.
- Add a contract test for lazy regular-expression compilation.
- Add a contract test that malformed SHA-256 digests return `PARSE_ERROR`.
- Add a contract test that unknown protobuf fields do not reject supported known data.
- Add a contract test that preserves an out-of-range protobuf integer during parsing.
- Add a contract test that returns `PARSE_ERROR` instead of an imprecise number during evaluation.
- Add safe and unsafe integer and shard tests without global `BigInt`.
- Require `PARSE_ERROR`, not `GENERAL`, for invalid integer data without global `BigInt`.
- Add a protobuf wire contract test from canonical dd-source bytes.
- Put one base64 encoding of those bytes in a version `1` `rules.response` fixture.
- Confirm that base64-decoding the fixture returns the original bytes.
- Do not require stricter base64 rejection than the upstream Protobuf-ES decoder.
- Record dd-source PR #40304 commit `071c4ad` as the schema revision for the fixture.
- Record dd-source PR #34959 as the service producer path for the fixture.
- Confirm that the fixture represents the client distribution channel.
- Add reserved-name flag-key contract tests.
- Confirm that rules serialization round-trips.
- Confirm that rules serialization preserves unknown protobuf fields.
- Add fake-engine test helpers.
- Add a package contract check for the configuration subpath.
- Confirm that the default flagging-core entry point does not load Protobuf-ES.
- Confirm that the flagging-core precomputed subpath ignores rules and does not load Protobuf-ES.
- Measure whether the React Native package root still loads Protobuf-ES through its public re-export.
- Decide whether React Native needs its own configuration subpath.
- Do not add a fetch or transport-conversion API.
- Keep current provider behavior unchanged.
- Keep precomputed evaluation unchanged.

The main review questions are:

> Does this boundary isolate the SDK from the upstream rules engine?
>
> Does the wire contract test keep raw service protobuf separate from the portable JSON envelope?
>
> Does the import boundary keep Protobuf-ES out of code that does not use configuration parsing?

## PR2 — Core dynamic and mixed evaluation

Add dynamic evaluation to `FlagsClient`.

- Store precomputed and rules branches independently.
- Keep a valid branch when its sibling is invalid.
- Keep valid rules data when the parsed configuration also contains `precomputedError`.
- Do not copy the combined PR #336 evaluator precedence for `precomputedError`.
- Preserve `precomputed.flagErrors` beside the decoded precomputed `Map`.
- Return a matching precomputed flag error as `PARSE_ERROR` before `FLAG_NOT_FOUND`.
- Do not fall back to rules for a malformed key in matching precomputed data.
- Reconcile a rules branch as ready for each context.
- Select the evaluation path for each resolution.
- Use matching precomputed data first.
- Use valid rules data second.
- Return the applicable error when neither path is usable.
- Preserve `PARSE_ERROR` when a rules flag contains invalid data.
- Return `FLAG_NOT_FOUND` only when the flag key is absent.
- Keep other valid rules flags.
- Map rules results to `FlagDetails`.
- Convert successful rules results to `TrackableAssignment`.
- Track each successful rules assignment through the current native bridge.
- Do not track `PARSE_ERROR` results.
- Let native code apply `doLog` to exposure events.
- Do not require split serial ID or evaluation timestamp in the mobile exposure payload unless the mobile contract changes.
- Record that integer and numeric variations both use the OpenFeature type `number`.
- Record that only safely represented integer variations become JavaScript numbers.
- Preserve the upstream `PARSE_ERROR` and message for an unsafe integer.
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
- Use the PR1 production-derived portable wire fixture in integration tests and examples.
- Do not use the raw protobuf response as the `configurationFromString` input.
- Do not use the legacy service JSON response as `rules.response`.
- Reuse the same fixture for Metro, Hermes, and JSC checks.
- Exercise integer variations, shard counts, and ranges without global `BigInt`.
- Update the provider documentation.
- State that customers must supply the complete version `1` portable wire.
- State that the offline provider does not fetch the UFC endpoint.
- Update both example applications.
- Add Hermes and JSC checks where the repository supports them.
- Test the packed dependency with the repository Metro export conditions.
- Record that the 6,229-byte minified and 2,070-byte gzipped increase applies to the full browser entry point, which now includes configuration parsing.
- Record that the flagging-core root and both precomputed entry points exclude Protobuf-ES.
- Record the 1,106-byte minified and 459-byte gzipped React Native compatibility cost.
- Measure the default flagging-core entry point, its configuration and precomputed subpaths, and the React Native package root separately.
- Measure the packed dependency in this repository.

The main review question is:

> Does the existing offline provider expose dynamic rules without changing online or precomputed behavior?

## External distribution work

This PR stack does not implement the component that creates `FlagsConfigurationWire`.
Track that work with the service or distribution owner.

That component must:

1. Request `application/protobuf`.
2. Reject an unexpected response content type.
3. Base64-encode the raw protobuf bytes one time.
4. Put the result in a version `1` `rules.response` envelope.
5. Preserve the client distribution policy.

The PR stack can use a checked-in production-derived fixture before this distribution component is complete.
The fixture must make the service-to-wire contract reviewable.

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
