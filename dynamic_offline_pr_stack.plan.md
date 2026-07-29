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
It moves wire parsing and `FlagsConfigurationWire` to `@datadog/flagging-core/configuration`.
The default flagging-core entry point keeps the evaluator and shared types.
It does not load Protobuf-ES.
The configuration subpath uses the Protobuf-ES base64 decoder.
It does not promise strict rejection of non-canonical base64 padding.

Upstream PR #336 uses that parser in the browser `CoreProvider`.
PR #336 also uses the safe upstream lookup for precomputed flags.
Its head did not change.
Its base moved to the first new PR #344 commit, but not to the latest PR #344 head.
GitHub currently reports PR #336 as non-mergeable.
Recheck it after the upstream stack is repaired.

ddoghq/dd-source PR #34959 is merged.
It adds protobuf content negotiation to the existing UFC service endpoints.
The service returns raw UFC protobuf bytes for `Accept: application/protobuf`.
It continues to return JSON for other requests.

The raw service response is not a complete `FlagsConfigurationWire`.
A configuration producer must base64-encode the raw bytes one time and put the result in a version `1` `rules.response` envelope.
The React Native SDK does not fetch the service response.
It does not build the portable envelope.

Put a `TODO` immediately before each temporary implementation.
The `TODO` must identify the upstream replacement.
Do not hide temporary behavior in a general helper.
Tests can use a fake rules engine.
Production code must use one internal engine adapter.

Remove temporary JSON rules-wire parsing, duplicate rules validation, and local lookup guards after the upstream package is published.
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
- Add a protobuf wire contract test from canonical dd-source bytes.
- Put one base64 encoding of those bytes in a version `1` `rules.response` fixture.
- Confirm that base64-decoding the fixture returns the original bytes.
- Do not require stricter base64 rejection than the upstream Protobuf-ES decoder.
- Record the source schema or generator revision for the fixture.
- Confirm that the fixture represents the client distribution channel.
- Add reserved-name flag-key contract tests.
- Confirm that rules serialization throws.
- Add fake-engine test helpers.
- Add a package contract check for the configuration subpath.
- Confirm that the default flagging-core entry point does not load Protobuf-ES.
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
- Use the PR1 production-derived portable wire fixture in integration tests and examples.
- Do not use the raw protobuf response as the `configurationFromString` input.
- Do not use the legacy service JSON response as `rules.response`.
- Reuse the same fixture for Metro, Hermes, and JSC checks.
- Update the provider documentation.
- State that customers must supply the complete version `1` portable wire.
- State that the offline provider does not fetch the UFC endpoint.
- Update both example applications.
- Add Hermes and JSC checks where the repository supports them.
- Test the packed dependency with the repository Metro export conditions.
- Record that the 6,229-byte minified and 2,070-byte gzipped browser increase applies to configuration parsing, not the default flagging-core entry point.
- Record the 1,106-byte minified and 459-byte gzipped React Native compatibility cost.
- Measure the default flagging-core entry point, its configuration subpath, and the React Native package root separately.
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
