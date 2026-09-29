# Mobile Rules Placement Benchmark

## Implementation Status

The JS harness and companion SwiftProtobuf evaluator are implemented for the
synthetic workloads below. Native runs fail explicitly unless the local iOS
prototype is linked. Mocked Jest tests validate orchestration, not native
performance. Simulator and physical-device Release reports have been collected;
the follow-up experiments below cover storage hydration and native tracking.
See [recorded results](RESULTS.md) for the comparisons, source provenance, and
remaining limitations. Baseline and follow-up evidence remain separate.

This experiment changes only the benchmark app. It does not change the shipping
React Native package, OpenFeature provider API, or tracking behavior.

Tracking: [FFL-3347](https://datadoghq.atlassian.net/browse/FFL-3347).
Design context: [mobile RFC](https://docs.google.com/document/d/17PM3RoFPH-XM9zEUvoMAYZUfo5nwUi982rM-6RMZU8w/edit).

## Question and Matrix

For an RN application evaluating many changing contexts against one configuration,
where should decoding and evaluation happen?

| Decode | Evaluate | Installation being measured                                             | Repeated read               |
| ------ | -------- | ----------------------------------------------------------------------- | --------------------------- |
| JS     | JS       | Client protobuf bytes through flagging-core                             | Local JS evaluation         |
| Native | JS       | Swift protobuf decode, ProtoJSON encode, transfer, JS ProtoJSON decode  | Local JS evaluation         |
| JS     | Native   | JS protobuf decode, ProtoJSON encode, transfer, native ProtoJSON decode | Sync and async native calls |
| Native | Native   | Native protobuf decode and installation                                 | Sync and async native calls |

The crossed paths intentionally measure a concrete, portable ProtoJSON handoff.
They are **not** lower bounds for typed-object, shared-memory, or JSI-specific
handoffs. Sync native calls run inline; async calls use a serial worker queue.
Both must protect their shared configuration state. Evaluation results cross as
objects, not JSON strings.
Installation is synchronous in every row; the sync/async distinction applies to
reads. This is an RN 0.78.2 benchmark app, not a test of the shipping SDK's bridge.
The benchmark Metro config enables package exports and resolves core's public
rules-based export plus Protobuf-ES subpaths to their CommonJS entries. This avoids
Metro 0.81 selecting core's separately bundled legacy sub-entrypoint and ensures
the fixture/handoff adapter shares the decoder instance configured by core's UTF-8
fallback. Fixtures eagerly import that initializer before their generated schema.

Each runtime starts with the same in-memory protobuf bytes. Preloading/base64
transport, fixture generation, fetching, and disk I/O are outside installation
timers. Consequently, this experiment alone cannot decide which runtime should
own networking or durable storage. Add a byte-transfer/storage benchmark before
making those choices, particularly if native storage supplies the JS decoder.

## Workloads and Measurements

- Synthetic configurations containing 10, 100, and 1,000 boolean flags.
- Four evaluated flags: static, string membership, compound numeric targeting,
  and MD5 percentage splits. Increasing configuration size measures decoding and
  retained configuration effects; it does not increase the hot flag working set.
- Varying subjects, plans, and ages; result/metadata parity gates before timing.
- Configuration replacement and returning to earlier contexts must match the JS
  evaluator. Evaluation timestamps are excluded from equality checks only.
- Installation, first static read after installation, warm p50/p95/p99, and throughput.
  Warm reads are reported both together and per workload.
- Raw decoder and native-direct controls, representative sync/async echo calls,
  and JS clock overhead. Controls are reported, not subtracted from percentiles.
- Five repetitions with rotated placement order. Raw timing rows are retained
  per repetition. A queued timer indicates caller blocking, not rendering FPS.
  Throughput includes the sampling/checksum loop; it is not pure engine throughput.

The JS baseline uses the published `@datadog/flagging-core@3.1.1`, not a rewritten
JS evaluator. Both its decoder and the handoff adapter resolve Protobuf-ES 2.15.0
in the lockfile. `ufc_pb.ts` is an unchanged generated schema copied from
`DataDog/openfeature-js-client` at `fb8e9f7618768e9d34032049ab91cfa98eb21b95`, path
`packages/core/src/configuration/generated/ufc_pb.ts`.

No arbitrary production configuration, regex, semver, obfuscated targeting,
tracking, memory usage, or bundle-size conclusion is covered by these synthetic
workloads. Native support must reject unsupported input instead of silently
evaluating it. Broaden the fixture set before generalizing to those operations.

## Validation Available Now

From the RN repository root:

```sh
node .yarn/releases/yarn-3.4.1.cjs install --immutable
node .yarn/releases/yarn-3.4.1.cjs workspace benchmark-runner test:flags
```

The orchestration test substitutes the real JS evaluator for native methods. It
checks that all placements execute, correctness mismatches abort, and missing
native setup cannot generate a successful report. It does not benchmark Swift.
The fixture test also removes text-encoding globals to exercise the fallback.

On September 28, 2026, a Release/Hermes run on the iOS 26.2 arm64 simulator
passed all six placement/transport rows (100 reads each), decoder/native-direct
checks, context/configuration replacement checks, and both echo controls. The
report confirmed `newArchitecture: true`, `nativeDebug: false`, and `debug: false`.
This verifies the real bridge plumbing, not device performance.

## Device Reproduction

1. Check out the companion iOS prototype and this RN branch. Record both commit
   SHAs, Xcode version, device model/OS, power mode and thermal state alongside
   each result. The iOS branch is `sameerank/swift-rules-evaluator-prototype` and
   the RN branch is `sameerank/mobile-flags-benchmarks`.
2. Install the RN dependencies above, build the existing workspace Babel plugin,
   then install benchmark pods (CocoaPods 1.16.2):

   ```sh
   yarn workspace @datadog/mobile-react-native-babel-plugin prepare
   cd benchmarks/ios
   DD_FLAGS_PROTOTYPE_PATH=../../../dd-sdk-ios/DatadogFlags/Prototypes/RulesEvaluation pod install
   ```

   This example assumes sibling `dd-sdk-ios` and `dd-sdk-reactnative` checkouts.
   Set a different path when necessary. SwiftProtobuf 1.38.1 is isolated to this
   optional local pod. Xcode 26.2 / Swift 6.2 was used for validation.

3. Build the benchmark app for a physical iOS device using Release and Hermes,
   with no debugger attached. Do not run unrelated benchmark scenarios first.
4. Build with `ENVFILE` set to the absolute path of `benchmarks/flags.env`, or open
   `benchmark://start?scenario=flags&runType=baseline`. Run the smoke test
   first, then the benchmark. Export with **Share JSON**. Repeat from fresh app
   launches on at least a lower-end and a newer supported device.
5. Simulator Release runs can compare implementations and expose transfer,
   blocking, and queueing costs. They do not establish device latency, thermal,
   battery, or flash-storage behavior. Do not pool samples from different devices,
   build types, architectures, or workload types.

No Datadog credentials are required. The flags scenario bypasses SDK telemetry
initialization. `flags-smoke.env` selects the scenario and automatically runs only
the smoke test at launch. Reports are also saved as
`Documents/flags-benchmark-result.json`; a running/failed report overwrites the
previous result so a failed run cannot be mistaken for an old success.

For a simulator smoke build, from `benchmarks/ios`:

```sh
ENVFILE="$PWD/../flags-smoke.env" xcodebuild \
  -workspace BenchmarkRunner.xcworkspace -scheme BenchmarkRunner \
  -configuration Release -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,id=<simulator-udid>' \
  -derivedDataPath /tmp/flags-benchmark CODE_SIGNING_ALLOWED=NO build
```

Install and launch the resulting app with `xcrun simctl`, or run it from Xcode.
For device measurements use `flags.env` instead and configure your own signing
team; detach the debugger before measuring. Full runs use 10,000 reads per row,
1,000 warmups, 100 installation samples, and five rotated repetitions. Smoke runs
use 100 reads, 20 warmups, three installations, one repetition, and ten flags.

The fixture export can be regenerated with `yarn flags:compile-fixture` followed
by `node scripts/export-flags-fixture.cjs <iOS-client-benchmark.json-path>` from
`benchmarks`. The iOS package's README documents the companion correctness tests.

## RFC Evidence Template

**Implementations:** [iOS draft PR #3239](https://github.com/DataDog/dd-sdk-ios/pull/3239)
and the companion RN draft PR containing this README; both are linked in FFL-3347.

**Results:** retain simulator and physical-device reports separately. Link the full JSON artifacts,
both commit SHAs and the reproduction commands, then summarize installation and
warm p50/p99 separately for every placement and device. Include the native-direct
and echo controls to explain, not estimate by subtraction, transport overhead.

**Proposed direction:** JS-local repeated RN evaluation with native tracking and
separate durable-byte storage. The recorded runs support investigating this split;
they do not establish a universally fastest implementation. Compare
`installation + N * per-read cost` for realistic
numbers of context-dependent reads per configuration update. Consider caller
blocking and synchronous API requirements alongside latency. A faster native
engine does not imply a faster RN call; a faster JS read does not imply a faster
decoder. Tracking/telemetry transport is a separate measurement and decision.

These two PRs can support an **RN-on-iOS** decision. They cannot establish Android
performance; repeat with a Kotlin/native adapter before making a cross-platform
mobile claim.

## Simulator-First Follow-Ups

Build the Release simulator app with `flags-smoke.env` as above, then run:

```sh
node scripts/run-flags-followups.cjs \
  <booted-simulator-udid> \
  /tmp/flags-benchmark/Build/Products/Release-iphonesimulator/BenchmarkRunner.app \
  <new-results-directory> \
  <absolute-ios-repo-path>
```

Optional trailing arguments select `hydration`, `none`, `bridge-only`,
`exposures`, `evaluations`, or `both`. By default all six run. Each gets a fresh
app process. The follow-up harness refuses physical devices and Debug builds.
The runner never overwrites a result directory and stops the simulator app at
the end. No phone is accessed.

To repeat tracking with the opposite mode order, supply a second new results
directory and append `both evaluations exposures bridge-only none`. Do not
interpret run-order variation as a reliable ranking of native logger costs.

- **Hydration:** async native file read through the first correct evaluation,
  comparing base64 bytes to JS, native decode with ProtoJSON handoff, and native
  decode/evaluation with only the result transferred. There are 30 samples per
  size/path/repetition and three rotated repetitions. The file is persisted
  before timing; this is warm-file-cache hydration, not cold process startup.
- **Tracking:** published core JS evaluation plus the repository's actual
  `DdFlags.trackEvaluation` native bridge and DatadogFlags 3.16.0. Compare no
  bridge call, bridge with both loggers disabled, exposures, evaluations, and
  both. RUM is disabled. Repeated/changing subjects each run in 500-call bursts
  and with a yield every 25 calls, across three rotated repetitions. These are
  synthetic throughput/stress workloads, not a typical UI evaluation rate.
- Tracking uses synthetic data and a collector bound only to `127.0.0.1`. It exercises
  native deduplication, aggregation, event storage and request building without
  live intake or mobile radio latency. Loopback HTTP is not a device-network
  measurement. SDK upload settings are small/frequent;
  the evaluation aggregation timer is one second. Those are benchmark settings,
  not a measurement of default flush scheduling.
- Native client creation is outside the timed loop. Its one warmup evaluation
  per case is included in the expected native evaluation total, but has exposure
  logging disabled. Exact event totals are verified from captured HTTP bodies;
  successful promise resolutions alone are not sufficient to pass.
- Caller times include JS evaluation, argument construction and asynchronous
  bridge submission. Acknowledgement times and outstanding-promise counts are
  separate; neither means a native disk write or upload has finished. Logical
  argument byte counts use JSON length as an ASCII-only proxy, not RN wire bytes.
- Process resident-memory snapshots include Hermes, RN and SDK buffers; captured
  HTTP bodies stay in the external collector. They are not isolated cache/heap sizes or true allocation
  peaks. Hydration samples after each operation can miss transient peaks.

Each output directory includes per-call timing arrays, correctness checks,
captured synthetic HTTP bodies, thermal snapshots, and a manifest with report,
executable, JS bundle and lockfile hashes. Changed source files are copied next
to the manifest, so an uncommitted prototype can still be reconstructed from its
base commit plus saved sources. Keep failed diagnostic runs out of RFC tables.

Android, cold app launch, incremental shipping package size, device energy and
memory pressure remain separate experiments. These results do not establish
cross-platform performance or a fastest possible native/JSI implementation.
