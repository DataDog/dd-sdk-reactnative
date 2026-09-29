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
  separately. It does not establish where Android tracking should run; that
  experiment has not been implemented or measured yet.

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

## Reproduction and Evidence

Use the build and runner commands in [the README](README.md#android-emulator-extension).
The measured emulator command was:

```sh
"$ANDROID_HOME/emulator/emulator" -avd flags-api35-arm64 -port 5554 \
  -memory 4096 -cores 4 -no-snapshot -no-boot-anim -no-audio -no-window -gpu auto
```

Raw evidence is retained locally in
`mobile-flags-benchmark-results/android-emulator-2026-09-29/`:

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
Hydration reports also retain individual samples. Raw artifacts have not been
uploaded or committed. The shared hydration metadata contains a generic loopback
sink label from the iOS tracking harness; Android hydration used no collector,
tracking, or network. This labeling limitation does not change its timed work.

## Limits

No physical Android, Android native tracking, full evaluator conformance, cold
launch, shipping package size, or device energy conclusions are established.
Host/guest thermal state was not sampled. Process RSS is not isolated evaluator
heap or a true peak. ProtoJSON is only one possible transfer format, not a lower
bound for typed objects, optimized binary transfer, shared memory, or direct JSI.
Emulator timings and the unoptimized native prototype cannot establish absolute
customer-device latency or a universally fastest production design.
