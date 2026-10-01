/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {validateReport} = require('./run-flags-followups.cjs');

function files(directory) {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    if (entry.name === 'sources' || entry.name.startsWith('diagnostic'))
      return [];
    const name = path.join(directory, entry.name);
    return entry.isDirectory()
      ? files(name)
      : /^batching-.*\.json$/.test(entry.name)
      ? [name]
      : [];
  });
}

function stats(samples) {
  if (!samples.length) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = samples.reduce((a, b) => a + b, 0);
  return {
    count: samples.length,
    mean: sum / samples.length,
    sum,
    p50: sorted[Math.ceil(samples.length * 0.5) - 1],
    p99: sorted[Math.ceil(samples.length * 0.99) - 1],
    max: sorted[sorted.length - 1],
  };
}

function summarize(root) {
  return files(root)
    .sort()
    .map(file => {
      const bytes = fs.readFileSync(file);
      const report = JSON.parse(bytes);
      const validation = validateReport(report);
      const manifestPath = path.join(path.dirname(file), 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath));
      const digest = createHash('sha256').update(bytes).digest('hex');
      const expected =
        manifest.reportSha256 ||
        manifest.reports.find(item => item.filename === path.basename(file))
          ?.sha256;
      assert.equal(digest, expected, 'Report hash does not match its manifest');
      const groups = new Map();
      for (const row of report.rows) {
        const key = `${row.workload}/${row.pattern}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
      }
      return {
        file: path.relative(root, file),
        platform: report.metadata.platform,
        mode: report.mode,
        validation,
        reportSha256: digest,
        rows: [...groups].map(([workload, rows]) => {
          assert.equal(rows.length, 3);
          const samples = key => rows.flatMap(row => row[key]);
          const caller = stats(samples('callerMs'));
          const deferred = stats(samples('offCallerFlushMs'));
          return {
            workload,
            callerMs: caller,
            offCallerFlushMs: deferred,
            // Does not include asynchronous acknowledgement handlers or RN internals.
            timedJSWorkMsPerEvaluation:
              (caller.sum + (deferred?.sum || 0)) / caller.count,
            bridgeCalls: rows.map(row => row.bridgeCalls),
            batchSizes: stats(samples('batchSizes')),
            enqueueToSubmitMs: stats(samples('enqueueToSubmitMs')),
            acknowledgementMs: stats(samples('acknowledgementMs')),
            timerDelayMs: stats(samples('timerDelayMs')),
            maxBufferedRecords: Math.max(
              ...rows.map(row => row.maxBufferedRecords),
            ),
            maxRetainedRecords: Math.max(
              ...rows.map(row => row.maxRetainedRecords),
            ),
            callerLoopMs: rows.map(row => row.callerLoopMs),
            observedRatePerSecond: rows.map(row =>
              row.group === 1 && row.intervalMs > 0
                ? (1000 * (row.count - 1)) / row.callerLoopMs
                : null,
            ),
            allAcknowledgedMs: rows.map(row => row.allAcknowledgedMs),
            residentDeltaBytes: rows.map(
              row => row.residentAfterBytes - row.residentBeforeBytes,
            ),
          };
        }),
      };
    });
}

module.exports = {summarize};
if (require.main === module) {
  assert(
    process.argv[2],
    'Usage: node summarize-flags-batching.cjs <results-directory>',
  );
  console.log(JSON.stringify(summarize(process.argv[2]), null, 2));
}
