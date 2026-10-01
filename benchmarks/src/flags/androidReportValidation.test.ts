/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

const {validateReport} = require('../../scripts/run-flags-android.cjs');

function androidReport() {
  return {
    correctness: 'passed',
    metadata: {
      platform: 'android',
      simulator: true,
      debug: false,
      nativeDebug: false,
      hermes: true,
      newArchitecture: true,
      smoke: true,
    },
    rows: [
      ...Array.from({length: 6}, (_, index) => ({
        mode: `mode-${index}`,
        warmRead: {count: 100},
      })),
      ...Array.from({length: 3}, () => ({mode: 'control'})),
    ],
  };
}

test('accepts a complete Release Android emulator smoke report', () => {
  expect(validateReport(androidReport(), 'smoke')).toEqual({
    placementRows: 6,
    timedReads: 600,
  });
});

test.each(['simulator', 'hermes', 'newArchitecture'])(
  'rejects missing %s prerequisite',
  field => {
    const report = androidReport();
    (report.metadata as any)[field] = false;
    expect(() => validateReport(report, 'smoke')).toThrow();
  },
);

test.each(['debug', 'nativeDebug'])('rejects %s builds', field => {
  const report = androidReport();
  (report.metadata as any)[field] = true;
  expect(() => validateReport(report, 'smoke')).toThrow();
});

test('rejects incomplete placements, failed parity and iOS reports', () => {
  const report = androidReport();
  report.rows.pop();
  expect(() => validateReport(report, 'smoke')).toThrow();
  expect(() =>
    validateReport({...androidReport(), correctness: 'failed'}, 'smoke'),
  ).toThrow();
  const ios = androidReport();
  ios.metadata.platform = 'ios';
  expect(() => validateReport(ios, 'smoke')).toThrow();
});

function trackingReport(mode: string) {
  const exposures = ['exposures', 'both'].includes(mode) ? 3006 : 0;
  const evaluationCount = ['evaluations', 'both'].includes(mode) ? 6012 : 0;
  const request = (endpoint: string, body: string) => ({
    url: `http://127.0.0.1:1234/${endpoint}`,
    bodyBase64: Buffer.from(body).toString('base64'),
  });
  return {
    ...androidReport(),
    mode,
    rows: Array.from({length: 12}, () => ({
      caller: {count: 500},
      checksum: 500,
      pendingAtEnd: 0,
      bridgeCalls: mode === 'none' ? 0 : 500,
    })),
    expected: {exposures, evaluationCount},
    sink: {
      initialization: {clientType: 'DatadogFlagsClient'},
      requests: [
        ...(exposures
          ? [
              request(
                'exposures',
                '{"flag":{"key":"flag-0"}}\n'.repeat(exposures),
              ),
            ]
          : []),
        ...(evaluationCount
          ? [
              request(
                'evaluations',
                JSON.stringify({
                  flag: {key: 'flag-0'},
                  evaluation_count: evaluationCount,
                }) + '\n',
              ),
            ]
          : []),
      ],
    },
  };
}

test.each(['none', 'bridge-only', 'exposures', 'evaluations', 'both'])(
  'checks real native event totals for Android %s mode',
  mode => {
    const report = trackingReport(mode);
    expect(validateReport(report, mode)).toMatchObject(report.expected);
  },
);

test('rejects missing Android tracking initialization, incorrect mode and missing uploads', () => {
  const report = trackingReport('both');
  report.sink.initialization.clientType = 'NoOpFlagsClient';
  expect(() => validateReport(report, 'both')).toThrow();
  expect(() => validateReport(trackingReport('both'), 'exposures')).toThrow();
  const missing = trackingReport('both');
  missing.sink.requests.pop();
  expect(() => validateReport(missing, 'both')).toThrow('native aggregation');
});

test('rejects self-reported totals that hide missing native events', () => {
  const report = trackingReport('none');
  report.mode = 'both';
  expect(() => validateReport(report, 'both')).toThrow();
});

test('accepts compressed Android NDJSON without losing records', () => {
  const {gzipSync} = require('node:zlib');
  const report = trackingReport('evaluations');
  report.sink.requests[0] = {
    ...report.sink.requests[0],
    contentEncoding: 'gzip',
    bodyBase64: gzipSync(
      Array.from({length: 2}, () =>
        JSON.stringify({
          flag: {key: 'flag-0'},
          evaluation_count: 3006,
        }),
      ).join('\n'),
    ).toString('base64'),
  } as any;
  expect(validateReport(report, 'evaluations')).toMatchObject({
    evaluationCount: 6012,
    evaluationRecords: 2,
  });
});
