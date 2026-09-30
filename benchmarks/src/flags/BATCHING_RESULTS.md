# RN Tracking Delivery Comparison

Measured September 29, 2026. This experiment compares one native call per
evaluation with JS-buffered calls on both bridges. Native exposure deduplication,
evaluation aggregation, storage and upload stay unchanged. It does not compare
native tracking with a JS-only logger.

The existing bridge makes one `trackEvaluation` call per evaluation, including
when both loggers are enabled. This does not measure independently registered
hooks, which could submit separate calls. Repeat the measurements with the final
hook implementation.

## Recommendation

Keep native ownership of tracking for code reuse and maintenance. These results
do not establish that native logging is faster or more reliable than a JS logger.
Use asynchronous per-evaluation delivery as the initial proposal, and keep the
internal delivery method replaceable. Batching is a useful optimization for
larger bursts, not a performance requirement demonstrated at every rate.

Do not claim batching has negligible benefits. It reduced the median total JS
loop time for 500 changing-context evaluations from 14.65/15.37 ms to 9.59/5.76 ms
on iOS, and from 22.15/21.75 ms to 7.26/7.43 ms on Android, in forward/reverse
passes. It also reduced measured JS work at 100 evaluations/second. The absolute
savings there were about 6.5/10.5 ms per second on iOS and 4.0/7.5 ms per second
on Android. These are estimates from measured work per evaluation, not CPU
utilization or frame-rate measurements.

At 10 evaluations/second, buffering still made one bridge call per evaluation.
It provided no consistent reduction against the one-record control after
including deferred work. Records waited about 66 ms before submission with our
50 ms timer target. A production buffer would add backgrounding, consent,
shutdown, failure, queue-limit and timestamp requirements. Favor the simpler
delivery path initially unless expected application workloads justify that work.

## Setup and Correctness

- Release ARM64, Hermes, RN 0.78.2 with the new architecture, core 3.1.1.
- iPhone 17 Pro simulator, iOS 26.2; native DatadogFlags 3.16.0.
- Android API 35 ARM64 emulator, four cores and 4 GB RAM; native Flags 3.13.1.
- The same M3 Max host ran one simulator at a time, without concurrent builds.
  Neither run used a physical phone. Absolute timings are not comparable across
  platforms, native SDK versions or workloads.
- All modes use the same 100-flag synthetic configuration, decoded before
  timing. The timed reads evaluate one boolean flag. Contexts either repeat or
  change on every read.
- Modes: no tracking; existing `DdFlags.trackEvaluation`; prototype batch
  bridge with one record; prototype batch bridge with up to 25 records or a
  50 ms timer. The one-record control isolates wrapper differences.
- Workloads: 20 evaluations at 10/second; 200 at 100/second; ten bursts of 20
  spaced 250 ms apart; and one uninterrupted burst of 500. Each has three
  rotated repetitions. These rates are illustrative, not customer telemetry.
- Each mode starts a fresh process. Both mode orders were tested. All 16 runs
  passed: 88,320 timed reads, plus native-client warmups outside timing.
- Each tracking run delivered exactly 2,772 exposures and 5,544 represented
  evaluations, including 24 exposure-disabled warmups. The validator checks
  every targeting key. Baselines sent no events. All pending calls and partial
  batches were drained. There were no rejected native calls.
- Native uploads use a loopback collector, small/frequent uploads, a one-second
  aggregation interval, and disabled RUM. iOS sent 121 requests per tracking
  run; Android sent 24. These differences come from the native implementations,
  not evidence that JS batching reduces network requests.

## Measured JS Work

Tables show changing contexts. Each cell is **forward / reverse** mean
microseconds per evaluation, pooled only across the three repetitions of that
workload and pass. Work includes evaluation, record construction, submission
inside the caller, and deferred flush work outside the caller. It excludes
asynchronous acknowledgement handlers and RN internals, so it is not a CPU
profile. The summary JSON also retains repeated-context results and individual
caller p50/p99, queue wait, acknowledgements, timer delay and memory snapshots.
The pacing and instrumentation differ from the earlier evaluator-only tests;
do not compare their absolute evaluation latencies with this table.

### iOS Simulator

| Workload | No tracking | Existing bridge | One-record control | Buffered |
| --- | ---: | ---: | ---: | ---: |
| 10/second | 112.5 / 124.7 | 349.7 / 377.4 | 305.6 / 254.3 | 330.5 / 270.2 |
| 100/second | 63.7 / 64.9 | 186.7 / 208.9 | 190.2 / 189.3 | 121.8 / 104.0 |
| 20-call bursts | 30.3 / 31.0 | 82.2 / 89.0 | 76.9 / 74.2 | 57.8 / 46.8 |
| 500-call burst | 11.1 / 12.8 | 30.0 / 30.1 | 26.6 / 24.2 | 18.0 / 11.5 |

### Android Emulator

| Workload | No tracking | Existing bridge | One-record control | Buffered |
| --- | ---: | ---: | ---: | ---: |
| 10/second | 96.7 / 93.1 | 277.2 / 262.1 | 292.2 / 224.3 | 291.7 / 287.5 |
| 100/second | 43.5 / 41.3 | 132.5 / 152.5 | 146.7 / 147.7 | 92.8 / 78.0 |
| 20-call bursts | 14.6 / 15.4 | 62.7 / 60.4 | 71.7 / 73.5 | 36.3 / 32.6 |
| 500-call burst | 8.0 / 8.3 | 41.0 / 41.8 | 32.4 / 35.5 | 15.1 / 15.7 |

Buffering saved about 0.49/0.84 ms of measured JS work per 20 evaluations on
iOS, and 0.53/0.56 ms on Android. This includes deferred work; it is not a
measurement of an entire rendered screen or a proven frame-rate improvement.

Repeated contexts also benefited in the 500-call stress burst. Median loop time
fell from 19.53/17.85 to 11.24/6.27 ms on iOS, and from 24.62/18.01 to
11.10/7.00 ms on Android. The observed 100/second rates across all modes and
contexts were 99.50-99.68 on iOS and 99.42-99.85 on Android.

## Submission and Tail Costs

For changing contexts, both platforms showed these bridge-call counts per case:

| Workload | Existing bridge / control | Buffered | Buffered median wait before submission |
| --- | ---: | ---: | --- |
| 20 reads at 10/second | 20 | 20 | About 66 ms |
| 200 reads at 100/second | 200 | 29-30 | About 34-35 ms |
| Ten 20-call bursts | 200 | 10 | About 66 ms |
| One 500-call burst | 500 | 20 | About 0.07-0.11 ms |

RN timers can run later than requested. Fixed-schedule pacing catches up after
late timers; observed rates are retained in the summary. The buffer's 50 ms
setting is not a delivery deadline. The final partial batch is drained at the
end of each case, so its wait can be shorter than the timer target.

Batching moves some work to a timer and concentrates other work into the call
that fills a batch. On iOS's 500-call workload, caller p99 increased from
44.4/45.1 microseconds with the existing bridge to 234.0/152.2 with buffering,
even though the whole burst completed sooner. On Android, the corresponding
p99 values were 272.6/335.8 and 199.7/201.9 microseconds. Do not infer individual
call tails from average or whole-burst improvements.

The 16 ms timer probe showed no consistent improvement across rates and both
orders. Its baseline already includes RN scheduling delays, and uninterrupted
bursts have very few timer samples. It is not a frame-rate test. One iOS
100/second existing-bridge pass had a 91 ms maximum delay that did not repeat in
the reverse pass; do not treat that outlier as an established tracking cost.

The buffer held at most 25 unsent records, but all 500 records could remain
retained until acknowledgements were processed during the uninterrupted burst,
in both per-record and buffered modes. This is not a native queue-depth
measurement or a bound on the total delivery backlog. RSS includes the whole
app, native clients, sample arrays and SDK buffers; no isolated memory saving
was established.

## Limitations and Evidence

The prototype always drains before stopping. It does not test backgrounding,
crashes, consent changes, failed writes, bridge teardown or persistent retry.
Native code currently assigns event timestamps when records arrive; delaying
the call can delay those timestamps. A production design must preserve the
original evaluation time and context. No shipping hook API was implemented or
changed, and neither RUM nor a JS-only logger was benchmarked.

Evidence is retained in `mobile-flags-benchmark-results/batching-2026-09-29/`:
`ios/forward`, `ios/reverse`, `android/forward`, `android/reverse`, and
`summary-statistics.json`. Reports contain raw samples and captured synthetic
requests. Manifests preserve report/binary hashes and changed-source copies.
All 16 report hashes and per-target output checks passed during summarization.
The code and [recorded evidence](evidence/README.md) are included in this prototype
branch. The archive contains the successful reports and measured source snapshots.

Excluded diagnostics remain under `ios/diagnostic*`. One exposed the validator's
incorrect exposure field name. The first full pass exposed pacing capped near
60/second by an unconditional timer yield. Both were fixed before the final
passes. The pacing fix has a regression test with frame-quantized timers.

Validation: 57 RN harness tests, targeted TypeScript, both Release builds and
the real-bridge runs passed. See [README.md](./README.md#per-evaluation-calls-versus-js-batching)
for reproduction commands. No additional physical-device test was performed.
