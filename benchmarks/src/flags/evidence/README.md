# Recorded Benchmark Evidence

These are the September 28-29, 2026 measurements, not new runs after the CI fixes.
The archive contains 43 successful reports and 374 source snapshots. It includes
the iOS simulator and supplementary iPhone baseline, saved-configuration tests,
Android placement tests, native tracking, and all 16 batching runs.

Read the [iOS results](../RESULTS.md), [Android results](../ANDROID_RESULTS.md),
and [batching comparison](../BATCHING_RESULTS.md) before interpreting the samples.
Use the [benchmark setup instructions](../README.md) to repeat the experiments.
The companion native prototypes are [iOS #3239](https://github.com/DataDog/dd-sdk-ios/pull/3239)
and [Android #3931](https://github.com/DataDog/dd-sdk-android/pull/3931).

## Verify and Inspect

From this directory:

```sh
shasum -a 256 -c SHA256SUMS
export EVIDENCE_DIR="$(mktemp -d)"
tar -xzf mobile-flags-2026-09-29.tar.gz -C "$EVIDENCE_DIR"
(cd "$EVIDENCE_DIR" && shasum -a 256 -c SHA256SUMS)
```

`INDEX.json` lists each exported file and its SHA-256. Each run's `manifest.json`
records report hashes, the baseline commits, changed-source hashes, and binary
hashes. Source snapshots are relative to those commits. They identify measured
code even when a run preceded its commit. Later documentation, validator, and
CI fixes are not new performance measurements.

Report files are unchanged. They preserve per-repetition results, the individual
samples collected by each experiment, and synthetic loopback request bodies.
Placement reports summarize reads; they do not contain every read's duration.
Manifests omit device identifiers and full Android system-property dumps.
The index retains each original manifest hash as provenance, not as the checksum
of its filtered export. Measured environment details remain in the reports and
results documents. Source documentation snapshots, build logs, binaries, and
failed diagnostic runs are excluded. No customer configuration or credentials
were used in these experiments.

To verify event counts, each targeting key, and hashes for all 16 batching runs,
run from the repository root after extraction:

```sh
node benchmarks/scripts/summarize-flags-batching.cjs \
  "$EVIDENCE_DIR/batching-2026-09-29"
```

This reprocesses saved data. It does not run a simulator or send network requests.
The archive also includes summary JSON for Android placement, Android tracking,
and batching. The results documents explain the different summary methods.
