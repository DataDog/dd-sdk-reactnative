/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

import {assertEquivalent, summarize} from './statistics';

test('reports nearest-rank percentiles in microseconds without mutating input', () => {
  const samples = [4, 1, 3, 2];
  expect(summarize(samples)).toEqual({
    count: 4,
    p50Us: 2000,
    p95Us: 4000,
    p99Us: 4000,
    meanUs: 2500,
    maxUs: 4000,
  });
  expect(samples).toEqual([4, 1, 3, 2]);
});

test('rejects empty, invalid and negative timings', () => {
  for (const samples of [[], [NaN], [-1], [Infinity]])
    expect(() => summarize(samples)).toThrow();
});

test('compares values and metadata regardless of key order', () => {
  assertEquivalent(
    {value: true, metadata: {a: 1, b: 2}},
    {metadata: {b: 2, a: 1}, value: true},
    'same',
  );
  expect(() =>
    assertEquivalent({value: true}, {value: false}, 'different'),
  ).toThrow('different');
});
