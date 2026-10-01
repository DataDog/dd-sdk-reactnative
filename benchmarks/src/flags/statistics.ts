/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

export function summarize(samples: number[]) {
  if (
    !samples.length ||
    samples.some(value => !Number.isFinite(value) || value < 0)
  ) {
    throw new Error('Expected nonnegative timing samples');
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const percentile = (p: number) => sorted[Math.ceil(p * sorted.length) - 1];
  return {
    count: samples.length,
    p50Us: percentile(0.5) * 1000,
    p95Us: percentile(0.95) * 1000,
    p99Us: percentile(0.99) * 1000,
    meanUs:
      (samples.reduce((sum, value) => sum + value, 0) / samples.length) * 1000,
    maxUs: sorted[sorted.length - 1] * 1000,
  };
}

export function assertEquivalent(
  actual: unknown,
  expected: unknown,
  label: string,
) {
  const canonical = (value: any): any => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map(key => [key, canonical(value[key])]),
      );
    }
    return value;
  };
  if (
    JSON.stringify(canonical(actual)) !== JSON.stringify(canonical(expected))
  ) {
    throw new Error(
      `Correctness gate failed: ${label}\n${JSON.stringify({
        actual,
        expected,
      })}`,
    );
  }
}
