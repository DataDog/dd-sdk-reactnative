/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

const {validateReport} = require('../../scripts/run-flags-followups.cjs');
const {
  validateReport: validateAndroid,
} = require('../../scripts/run-flags-android.cjs');

function report(platform = 'ios', mode = 'batching-buffered') {
  const enabled = mode !== 'batching-none';
  const maxBatch = mode === 'batching-buffered' ? 25 : 1;
  const rows: any[] = [],
    exposures: any[] = [],
    evaluations: any[] = [];
  for (let repetition = 0; repetition < 3; repetition++) {
    for (const [workload, count] of Object.entries({
      '10hz': 20,
      '100hz': 200,
      'screen-burst': 200,
      'stress-burst': 500,
    })) {
      for (const pattern of ['repeated', 'changing']) {
        const client = `${mode}-${repetition}-${workload}-${pattern}`;
        const batchSizes = enabled
          ? Array.from({length: Math.ceil(count / maxBatch)}, (_, i) =>
              Math.min(maxBatch, count - i * maxBatch),
            )
          : [];
        rows.push({
          repetition,
          workload,
          pattern,
          client,
          count,
          checksum: count,
          caller: {count},
          callerMs: Array(count).fill(0.01),
          drained: {buffered: 0, inFlight: 0},
          batchSizes,
          bridgeCalls: batchSizes.length,
          submissionMs: Array(batchSizes.length).fill(0.01),
          offCallerFlushMs: [],
          acknowledgementMs: Array(enabled ? count : 0).fill(1),
          enqueueToSubmitMs: Array(enabled ? count : 0).fill(0),
          timerDelayMs: [0],
          maxBufferedRecords: maxBatch,
        });
        if (!enabled) continue;
        const event = (target: string, n: number) => ({
          flag: {key: 'flag-0'},
          targeting_key: target,
          evaluation_count: n,
        });
        evaluations.push(event(`${client}-warmup`, 1));
        for (let i = 0; i < (pattern === 'repeated' ? 1 : count); i++) {
          exposures.push({
            flag: {key: 'flag-0'},
            subject: {id: `${client}-${i}`},
          });
          evaluations.push(
            event(`${client}-${i}`, pattern === 'repeated' ? count : 1),
          );
        }
      }
    }
  }
  const request = (endpoint: string, body: string) => ({
    url: `http://127.0.0.1:1234/${endpoint}`,
    bodyBase64: Buffer.from(body).toString('base64'),
  });
  return {
    mode,
    correctness: 'passed',
    rows,
    metadata: {
      platform,
      simulator: true,
      debug: false,
      nativeDebug: false,
      hermes: true,
      newArchitecture: true,
    },
    policy: {
      maxBatch,
      maxWaitMs: maxBatch === 25 ? 50 : 0,
      nativeDeduplication: true,
      nativeAggregation: true,
    },
    expected: {
      exposures: enabled ? 2772 : 0,
      evaluationCount: enabled ? 5544 : 0,
    },
    sink: {
      initialization: {
        clientType:
          platform === 'android' ? 'DatadogFlagsClient' : 'FlagsClient',
      },
      requests: enabled
        ? [
            request(
              'exposures',
              exposures.map(event => JSON.stringify(event)).join('\n'),
            ),
            request(
              'evaluations',
              platform === 'android'
                ? evaluations.map(event => JSON.stringify(event)).join('\n')
                : JSON.stringify({flagEvaluations: evaluations}),
            ),
          ]
        : [],
    },
  };
}

test.each(['ios', 'android'])(
  'validates every %s mode and targeting key',
  platform => {
    for (const mode of [
      'batching-none',
      'batching-current',
      'batching-control',
      'batching-buffered',
    ]) {
      const input = report(platform, mode);
      expect(
        platform === 'android'
          ? validateAndroid(input, mode)
          : validateReport(input),
      ).toMatchObject(input.expected);
    }
  },
);

test('rejects a lost context even if total event counts match', () => {
  const input = report();
  const events = Buffer.from(input.sink.requests[0].bodyBase64, 'base64')
    .toString()
    .split('\n');
  events[0] = events[1];
  input.sink.requests[0].bodyBase64 = Buffer.from(events.join('\n')).toString(
    'base64',
  );
  expect(() => validateReport(input)).toThrow('each targeting key');
});

test('rejects unacknowledged, missing, duplicated or oversized batches', () => {
  const pending = report();
  pending.rows[0].drained.inFlight = 1;
  expect(() => validateReport(pending)).toThrow();
  const missing = report();
  missing.rows[0].acknowledgementMs.pop();
  expect(() => validateReport(missing)).toThrow();
  const duplicate = report();
  duplicate.rows[1] = duplicate.rows[0];
  expect(() => validateReport(duplicate)).toThrow('Duplicate workload');
  const oversized = report();
  oversized.rows[0].batchSizes[0] = 26;
  expect(() => validateReport(oversized)).toThrow();
});
