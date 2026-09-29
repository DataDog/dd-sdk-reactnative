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
