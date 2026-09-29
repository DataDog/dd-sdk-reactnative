# Mobile Flags Benchmark Results

These are architecture experiments for [FFL-3347](https://datadoghq.atlassian.net/browse/FFL-3347),
not shipping SDK performance guarantees. The proposed direction is JS-local
repeated RN evaluation with optional native tracking and separately owned durable
configuration bytes. Native-only hydration is faster in the measured startup
path, so the results do not identify a universally fastest placement.

## Environment and Provenance

- RN 0.78.2, New Architecture, Release/Hermes, core evaluator 3.1.1,
  Protobuf-ES 2.15.0, and SwiftProtobuf 1.38.1.
- Simulator: iPhone 17 Pro, iOS 26.2, Apple M3 Max host with 64 GB RAM, Xcode 26.2.
- Device: iPhone 16 Pro, iOS 26.6.1. Its ending thermal state was 2 (serious).
  Only the ending state was captured; affected rows cannot be identified.
  Treat this as exploratory evidence, not a nominal-temperature baseline.
- Baseline source: RN `dcf80287531e42f60c223598dd78d136a5a9ac0d` and
  iOS `64d4dee6bc4675727e1a77fc2bd405a24e857496`.
- Follow-up sources were captured as changed-file snapshots and SHA-256 hashes
  on top of those baseline commits. They are added as follow-up commits on the
  same prototype branches; the original measurement manifests remain unchanged.
  Subsequent README/results edits and a clarification of the acknowledgement
  comment do not change the measured operations.
- [Reproduction instructions](README.md) and
  [companion iOS prototype](https://github.com/DataDog/dd-sdk-ios/pull/3239).

Tables use the median of each repetition's percentile, not pooled percentiles.
Do not combine device and simulator samples or subtract control percentiles from
end-to-end percentiles. Raw reports, manifests, and source snapshots are retained
locally under `mobile-flags-benchmark-results/`; they are not committed here.

## Repeated Evaluation

Each baseline run contains 900,000 timed warm reads across five rotated
repetitions, six placement/transport modes, and configurations with 10, 100, or
1,000 boolean flags. The hot working set stays at four flags: static, membership,
compound numeric targeting, and MD5 splits. Value/metadata, context A -> B -> A,
and configuration replacement gates passed. The Swift engine is a prototype
subset, not full production evaluator conformance.

100-flag configuration; times in microseconds:

| Path                              | Simulator p50 | iPhone p50 | iPhone p99 |
| --------------------------------- | ------------: | ---------: | ---------: |
| JS decode / local JS read         |         6.625 |      6.791 |     19.000 |
| Native decode / sync native read  |        18.291 |     17.667 |     22.667 |
| Native decode / async native read |        46.083 |     33.666 |     37.000 |

The native-direct control measured 1.125 us at p50 on the iPhone, with
preconverted inputs and no RN transport. Local JS reads being faster for the RN
caller does **not** mean the JS evaluator itself is faster than native.

Installation timers in these baseline runs exclude preloading/base64 transport,
networking, and disk I/O. Crossed placements use ProtoJSON; they are not lower
bounds for optimized binary, typed-object, shared-memory, or JSI handoffs.

## Warm Persisted Hydration

The simulator follow-up measures from JS requesting a native file read to the
first correct static-flag result being usable in JS. All paths use asynchronous
native calls. Files are created before timing, the OS cache is warm, and the app
is already running. This is **not cold application startup** or a production cache
implementation. There are 810 samples: 30 per size/path/repetition, three repeats.

| Flags / binary bytes | Bytes as base64 -> JS decode/evaluate p50 ms | Native decode -> ProtoJSON -> JS evaluate p50 ms | Native decode/evaluate -> result p50 ms |
| -------------------- | -------------------------------------------: | -----------------------------------------------: | --------------------------------------: |
| 10 / 869             |                                        2.155 |                                            2.300 |                                   0.985 |
| 100 / 8,269          |                                        5.187 |                                            6.869 |                                   1.580 |
| 1,000 / 86,084       |                                       30.044 |                                           50.486 |                                   3.676 |

At 1,000 flags, JS finishing work was approximately 29.895 ms in the bytes path
and 44.668 ms in the ProtoJSON path. An async native file read does not make
subsequent JS parsing nonblocking. Native-only hydration returns the first result
sooner, but later native evaluations still require RN calls. For JS evaluation,
the tested ProtoJSON handoff costs more than direct JS decoding.

Thirty samples per row are insufficient for a stable hydration p99. Handoff JSON
lengths are ASCII-only representation-size proxies, not actual bridge wire bytes.

## Native Tracking

The follow-up uses the repository's actual `DdFlags.trackEvaluation` bridge and
DatadogFlags 3.16.0. A collector bound only to `127.0.0.1` verifies actual request
bodies after native deduplication, aggregation, storage, and encoding. No customer
data, real credentials, external intake, or mobile radio traffic is involved.
RUM is disabled. Small/frequent uploads and a one-second aggregation interval are
benchmark settings, not measurements of default flush scheduling.

Each mode contains 6,000 timed evaluations of one static boolean flag against a
100-flag configuration, plus 12 native-client warmups when using the bridge.
Cases compare repeated/changing subjects, 500-call uninterrupted bursts, and
yielding every 25 calls, with three rotated repetitions. A second pass reverses
mode order. Both passes matched all event totals, with no failed tracking promises.

Verified totals per pass:

| Mode                     | Exposures | Evaluation count represented | Evaluation records | HTTP requests |
| ------------------------ | --------: | ---------------------------: | -----------------: | ------------: |
| No tracking              |         0 |                            0 |                  0 |             0 |
| Bridge, loggers disabled |         0 |                            0 |                  0 |             0 |
| Exposures                |     3,006 |                            0 |                  0 |            61 |
| Evaluations              |         0 |                        6,012 |              3,018 |            61 |
| Both                     |     3,006 |                        6,012 |              3,018 |           122 |

Changing-subject uninterrupted bursts; caller p50 / p99 in microseconds:

| Mode                     |         Forward |    Reverse order |
| ------------------------ | --------------: | ---------------: |
| No tracking              | 13.375 / 31.750 |  10.708 / 21.000 |
| Bridge, loggers disabled | 26.625 / 33.750 | 47.333 / 130.167 |
| Exposures                | 32.958 / 42.208 |  33.166 / 47.250 |
| Evaluations              | 34.875 / 74.833 | 49.083 / 106.959 |
| Both                     | 18.750 / 36.542 |  33.625 / 49.916 |

Caller time includes JS evaluation, argument construction, bridge submission, and
measurement bookkeeping. It excludes waiting for native persistence/upload.
Order-dependent variability prevents ranking individual logger costs; the both
row is not evidence that two loggers are cheaper than bridge-only.

Every uninterrupted tracking burst reached 500 outstanding promise
acknowledgements; yielding every 25 calls limited that observed count to 25.
This is **not native queue depth**: JS may be busy while native work has already
completed. Timer delay is not rendering FPS. Native exposure deduplication also
does not avoid the per-read bridge submission. Bounded/batched handoff deserves
investigation, but these stress tests establish neither a production backlog nor
an optimal batch size.

## Saved Evidence and Remaining Work

Baseline reports retain per-repetition summaries. Follow-ups additionally retain
per-call timings, synthetic HTTP bodies, memory/thermal snapshots, and manifests
with executable, JS bundle, lockfile, report, and changed-source hashes.

| Local artifact                        | SHA-256                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| `simulator-2026-09-28.json`           | `e989ddee2c53885403121e4518b73dd5c036cd5a44a83dbe0000224f6d15efc3` |
| `iphone16pro-2026-09-29T060521Z.json` | `7cce57366ef29141db68a6f946a26e5cae9e9d50be8c0504d6e58f4ca66b86bf` |

Follow-up manifests are `followups-2026-09-29-final/manifest.json` and
`followups-2026-09-29-reverse/manifest.json`. Their 11 report hashes and native
event-count gates were rechecked before publishing these follow-up changes.
Rejected diagnostic runs are retained locally but excluded from all tables.

Whole-process RSS includes RN, Hermes, native SDK state, and temporary buffers.
It is not isolated heap/cache size, a true allocation peak, or proof of a leak.
No additional physical-phone runs were used for these follow-ups. Android,
broader rule coverage, true cold startup, incremental shipping package size,
native queue depth, and device energy/flash/memory-pressure behavior remain open.
