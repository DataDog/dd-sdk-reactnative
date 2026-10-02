# Flags request identity

`packages/core/package.json` is the version source. Normal `yarn prepare` generates the JavaScript, Swift, and Kotlin constants.
The release script calls this workflow after Lerna changes the package version. No customer step is required.
CI checks generated files before building. Packing checks the generated files and rebuilds JavaScript before creating the archive.

Run the generator checks with:

```sh
node packages/core/scripts/generate-sdk-version.cjs --check
node --test packages/core/scripts/generate-sdk-version.test.cjs
```

The JavaScript Flags reader sends its generated version to the native bridge automatically.
The native SDK places that version in the request without changing RUM telemetry metadata.
For example, an over-the-air JavaScript update can produce:

```json
{
  "sdk_name": "dd-sdk-reactnative",
  "sdk_version": "4.2.0"
}
```

These values are compatibility information, not authentication.
Before a React Native release advertises a response format, its native dependencies and bridge must support that format.
The JavaScript version alone cannot prove this after an over-the-air update with an older native binary.
Response-format rollout must handle that combination separately; this PR does not enable a new format.
An older JavaScript bundle reports an unknown reader version. The bridge must not substitute its own version for that reader.

The internal native enable interfaces require the companion iOS and Android changes before this PR can merge.
Update the native dependency pins after those interfaces are released. Do not substitute a declared dependency version for the actual native artifact version.
Local validation can use the companion native builds. No native version is duplicated in this repository.
