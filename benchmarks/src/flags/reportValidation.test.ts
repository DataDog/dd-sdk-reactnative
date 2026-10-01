/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

const {validateReport} = require('../../scripts/run-flags-followups.cjs');

function report() {
  return {
    correctness: 'passed',
    mode: 'both',
    metadata: {simulator: true, debug: false, nativeDebug: false},
    rows: Array.from({length: 12}, () => ({
      caller: {count: 500},
      checksum: 500,
      pendingAtEnd: 0,
      bridgeCalls: 500,
    })),
    expected: {exposures: 1, evaluationCount: 2},
    sink: {
      requests: [
        {
          url: 'http://127.0.0.1:1234/exposures',
          bodyBase64: Buffer.from('{"flag":{"key":"flag-0"}}\n').toString(
            'base64',
          ),
        },
        {
          url: 'http://127.0.0.1:1234/evaluations',
          bodyBase64: Buffer.from(
            '{"flagEvaluations":[{"flag":{"key":"flag-0"},"evaluation_count":2}]}',
          ).toString('base64'),
        },
      ],
    },
  };
}

test('validates decoded sink payloads, not just successful bridge promises', () => {
  expect(validateReport(report())).toMatchObject({
    exposures: 1,
    evaluationCount: 2,
    evaluationRecords: 1,
  });
});

test('rejects dropped or duplicated native events', () => {
  const input = report();
  input.sink.requests.pop();
  expect(() => validateReport(input)).toThrow('native aggregation');
  input.sink.requests.push(input.sink.requests[0]);
  expect(() => validateReport(input)).toThrow('native exposure');
});

test('rejects an unintended HTTP destination', () => {
  const input = report();
  input.sink.requests[0].url = 'https://example.com/exposures';
  expect(() => validateReport(input)).toThrow();
});
