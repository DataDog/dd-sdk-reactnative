# Android Emulator Benchmark Results

Measured on 2026-09-29 for [FFL-3347](https://datadoghq.atlassian.net/browse/FFL-3347).
These are prototype architecture experiments, not shipping SDK performance guarantees.
Keep them separate from the [iOS results](RESULTS.md).

## Takeaways

- Repeated reads were faster for the RN caller when evaluation stayed in JS than
  when every read crossed the synchronous or asynchronous Kotlin bridge. Both
  full runs showed the same ordering.
- This does not mean that the JS evaluator itself is faster. The native-direct
  control was faster, but excluded RN transport and used preconverted inputs.
- Native-only loading returned the first result sooner. For a JS evaluator,
  native decoding followed by a ProtoJSON handoff cost more than transferring
  bytes and decoding in JS. Parsing and repeated evaluation are separate choices.
- This supports the proposed JS-local repeated RN evaluation path, while retaining
  native evaluation for native SDK clients and considering startup requirements
  separately.
- Native tracking now passes the same experiments as iOS, including captured
  exposure/evaluation totals in both mode orders. Each native tracking call still
  costs JS time. These tests support separating tracking from evaluation, not a
  claim that tracking is free or that native logging is faster than JS logging.

## Environment and Validation

- Host: Apple M3 Max, 64 GB RAM, macOS 26.6.2 (25G83).
- Android Emulator 37.1.11.0, AOSP API 35 / Android 15 ARM64 image, revision 2.
  Pixel 6 profile, four virtual CPU cores, 4 GB guest RAM, 4 GB data partition.
- CPU acceleration: Apple's Hypervisor.Framework. Headless `-gpu auto` selected
  software graphics (`swangle` / `lavapipe`); these are CPU/bridge measurements,
  not graphics or UI frame-rate measurements. Snapshots were disabled.
- RN 0.78.2, New Architecture, Release/Hermes; core evaluator 3.1.1 and
  Protobuf-ES 2.15.0. Kotlin 2.0.21, protobuf-java/protobuf-java-util 3.25.5.
- Gradle 8.12, JDK 17.0.18, build-tools 35.0.0, NDK 27.1.12297006,
  CMake 3.22.1. Only `arm64-v8a` was built. R8/minification remained disabled,
  matching the benchmark app's existing Release configuration. The benchmark
  app uses its debug signing key with Release code.
- Release APK build, 28 RN harness tests, and eight Kotlin tests passed.
- Real-bridge smoke: six placements, 600 timed reads. Two full runs: 90 placement
  rows and 900,000 timed reads each. Hydration: 27 rows and 810 samples.
- Both full runs used fresh app processes on the same emulator and the same APK.
  No forced ART AOT/compilation-mode override was applied. Builds had finished
  before timing; the iOS simulator was shut down. No physical phone was used.

The correctness gates verify values, metadata, context A -> B -> A, configuration
replacement, and native control checksums against the JS reference. The native
engine covers a boolean benchmark subset, not full production UFC conformance.

## Repeated Evaluation

Each full run has five rotated repetitions across 10, 100, and 1,000 flags, with
10,000 timed reads and 1,000 warmup calls per placement/repetition/size. The hot
working set stays at four flags: static, string membership, compound numeric
targeting, and MD5 splits. It is not a scan of all flags in the configuration.

100-flag configuration, microseconds. Each endpoint of a range is one full run's
median of five per-repetition percentiles. These are not pooled percentiles or
confidence intervals.

| Decode / evaluation path             |   Read p50 us |   Read p99 us |
| ------------------------------------ | ------------: | ------------: |
| JS / JS                              |     5.96-6.00 |   20.67-20.71 |
| Native / JS, ProtoJSON handoff       |     5.96-6.04 |   20.92-23.00 |
| JS / native sync, ProtoJSON handoff  |   14.08-14.54 |   34.79-45.50 |
| Native / native sync                 |   14.21-14.62 |   32.92-44.88 |
| JS / native async, ProtoJSON handoff | 190.71-199.71 | 388.63-388.71 |
| Native / native async                | 188.04-199.63 | 383.54-412.46 |

At 100 flags, the native-direct evaluation control had p50 values of 0.750 and
0.875 us. Native protobuf decoding had p50 values of 78.334 and 83.541 us, versus
2,161.458 and 2,216.083 us for the JS decoder control. Do not subtract control
percentiles from end-to-end percentiles or treat preconverted native inputs as
equivalent to a caller crossing the RN boundary.

For 1,000 flags, in-memory installation p50 was 22.97-23.14 ms for JS decode,
60.23-60.33 ms for native decode followed by ProtoJSON transfer to JS, and
0.78 ms for native decode/install through the sync bridge. These installation
timers exclude preloading/base64 transfer, file I/O, and networking.

## Warm Persisted Hydration

The timer starts at the JS request to read a native cached file and ends when the
first correct static-flag result is usable in JS. All paths call native code
asynchronously. Files are written before timing and the OS cache is warm; this is
not cold app startup. Each cell is the median of three per-repetition p50 values,
with 30 samples per repetition.

| Flags / protobuf bytes | Bytes as base64 -> JS decode/evaluate p50 ms | Native decode -> ProtoJSON -> JS evaluate p50 ms | Native decode/evaluate -> result p50 ms |
| ---------------------- | -------------------------------------------: | -----------------------------------------------: | --------------------------------------: |
| 10 / 869               |                                        1.352 |                                            2.022 |                                   0.797 |
| 100 / 8,269            |                                        4.315 |                                            7.183 |                                   0.898 |
| 1,000 / 86,084         |                                       30.653 |                                           61.058 |                                   1.712 |

Returning the first result sooner does not eliminate the cost of later bridged
evaluations. Conversely, an async native file read does not make subsequent JS
parsing nonblocking. Thirty samples per row are insufficient for a stable p99.

## Native Tracking

The tracking extension uses the same JS workload as the iOS simulator: five
modes, repeated and changing contexts, 500-call uninterrupted bursts, yields
every 25 calls, and three rotated repetitions. Each mode has 6,000 timed
evaluations plus 12 native-client warmups when the bridge is enabled. A second
pass reverses the mode order. All 60,000 timed evaluations passed.

The real `DdFlags.trackEvaluation` bridge calls native Datadog Flags 3.13.1.
Initialization is outside timing. RUM is disabled; uploads are small/frequent,
and evaluation aggregation runs every second. An `adb reverse` tunnel connects
emulator loopback to a collector bound to host `127.0.0.1`. The test-only final
drain runs on a worker thread. Each mode starts a fresh process with cleared
synthetic app data. No Datadog credentials, external intake, or phone is used.

Verified totals in each pass:

| Mode                     | Exposures | Evaluation count represented | Evaluation records | HTTP requests |
| ------------------------ | --------: | ---------------------------: | -----------------: | ------------: |
| No tracking              |         0 |                            0 |                  0 |             0 |
| Bridge, loggers disabled |         0 |                            0 |                  0 |             0 |
| Exposures                |     3,006 |                            0 |                  0 |             4 |
| Evaluations              |         0 |                        6,012 |              3,018 |             4 |
| Both                     |     3,006 |                        6,012 |              3,018 |             8 |

These exposure and evaluation totals match iOS. Android sends gzip-compressed
newline-delimited evaluation records; iOS uses a JSON envelope. Native batching
produces different request counts. Neither request count nor payload encoding
is a performance ranking between SDKs.

Changing-context uninterrupted bursts, caller p50 / p99 in microseconds. Each
cell is the median of three per-repetition percentiles, not a pooled percentile:

| Mode                     |          Forward |    Reverse order |
| ------------------------ | ---------------: | ---------------: |
| No tracking              |    4.458 / 5.958 |    4.583 / 6.166 |
| Bridge, loggers disabled | 19.125 / 243.916 | 24.708 / 261.583 |
| Exposures                | 17.041 / 314.584 | 20.834 / 253.625 |
| Evaluations              | 16.625 / 240.917 | 20.500 / 199.584 |
| Both                     | 20.875 / 280.209 | 21.750 / 424.292 |

Caller time includes JS evaluation, argument construction, bridge submission,
and measurement bookkeeping. It does not include waiting for native storage or
upload. Both passes show a cost for per-evaluation bridge submission. Variation
between modes and passes prevents ranking individual logger costs. These are
stress tests, not typical application rates or device latency guarantees.

Uninterrupted tracking bursts reached 500 outstanding acknowledgements; yielding
every 25 calls limited that count to 25. No promises failed or remained pending.
This is not native queue depth or proof of a production backlog. We did not
compare native logging with a JS-only logger or measure RUM attribution.

The tracking APK also passed the 600-read smoke test and all 810 hydration
samples. The RN harness now has 38 passing tests. Tracking evidence is retained
under `android-tracking-2026-09-29/forward/` and `reverse/`, with reports, captured
HTTP bodies, manifests, source snapshots, and hashes for all ten runs. The
summary is `android-tracking-2026-09-29/summary-statistics.json`. The APK SHA-256 is
`7f465cded748f0037ed538ff6d1c35cf7846ff0d453c54eff80a3ace2384f256`.
The earlier `diagnostic-both` run is excluded from timing tables: its initial
validator expected the iOS envelope and rejected Android's NDJSON.

## Reproduction and Evidence

Use the build and runner commands in [the README](README.md#android-emulator-extension).
The measured emulator command was:

```sh
"$ANDROID_HOME/emulator/emulator" -avd flags-api35-arm64 -port 5554 \
  -memory 4096 -cores 4 -no-snapshot -no-boot-anim -no-audio -no-window -gpu auto
```

The original evidence is retained under
`mobile-flags-benchmark-results/android-emulator-2026-09-29/`. Successful reports,
filtered manifests, source snapshots, and summary JSON are also available in the
[recorded evidence archive](evidence/README.md). The original collection contains:

- `smoke/`, `full/`, `full-repeat/`, and `hydration/`: reports, manifests,
  changed-source copies/hashes, APK and lockfile hashes, device properties, logs.
- `environment.json` and `avd-config.ini`: host, toolchain, emulator settings,
  and limitations. `summary-statistics.json`: all configuration sizes and controls.
- Baselines: RN `16f3a45e785a394e4f9f5227ce258f1825a49c6d` and Android
  `9dee604d64065c0cd66381981bf73cd5b7ffeb2e`, plus each manifest's saved changes.
  A baseline SHA alone does not identify the uncommitted measured prototype.
- APK SHA-256: `03db1a925d19ddfb8a1cf1402fd6875664ac5c41f32d551be855ce76ee718abd`.
  All saved report hashes were verified. Documentation was updated afterward;
  measured operations were not changed during the runs.

Placement reports retain per-repetition summaries, not every individual sample.
Hydration reports also retain individual samples. The archive excludes build
logs, binaries, and full system-property dumps. The shared hydration metadata contains a generic loopback
sink label from the iOS tracking harness; Android hydration used no collector,
tracking, or network. This labeling limitation does not change its timed work.

## Limits

See the later [batching comparison](BATCHING_RESULTS.md) for matching iOS and
Android tests of per-evaluation delivery, a one-record wrapper control and a
25-record/50 ms JS buffer. Native tracking stays unchanged in that experiment.

No physical Android, full evaluator conformance, cold
launch, shipping package size, or device energy conclusions are established.
Host/guest thermal state was not sampled. Process RSS is not isolated evaluator
heap or a true peak. ProtoJSON is only one possible transfer format, not a lower
bound for typed objects, optimized binary transfer, shared memory, or direct JSI.
Emulator timings and the unoptimized native prototype cannot establish absolute
customer-device latency or a universally fastest production design.
