/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

import {TurboModuleRegistry} from 'react-native';
import NativeFlagsBenchmark from '../specs/NativeFlagsBenchmark';
import {batchingModes, runBatchingExperiment} from './batching';
import {asyncCall, sync} from './runner';

jest.mock('react-native', () => ({TurboModuleRegistry: {get: jest.fn()}}));
jest.mock('../specs/NativeFlagsBenchmark', () => ({
  __esModule: true,
  default: {trackBatch: jest.fn()},
}));
jest.mock('./runner', () => ({sync: jest.fn(), asyncCall: jest.fn()}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  (sync as jest.Mock).mockReturnValue({residentBytes: 100});
  (asyncCall as jest.Mock).mockResolvedValue({});
  (NativeFlagsBenchmark!.trackBatch as jest.Mock).mockResolvedValue(undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test.each(batchingModes)(
  '%s evaluates the same workloads and drains every record',
  async mode => {
    const current = jest.fn(async () => {});
    (TurboModuleRegistry.get as jest.Mock).mockReturnValue({
      trackEvaluation: current,
    });
    const promise = runBatchingExperiment(mode, () => {});
    await jest.advanceTimersByTimeAsync(60000);
    const report = await promise;
    expect(report.rows).toHaveLength(24);
    expect(report.rows.reduce((sum, row) => sum + row.count, 0)).toBe(5520);
    for (const row of report.rows) {
      expect(row.checksum).toBe(row.count);
      expect(row.drained).toEqual({buffered: 0, inFlight: 0});
    }
    expect(current).toHaveBeenCalledTimes(
      mode === 'batching-current' ? 5544 : 0,
    );
    const batches = (
      NativeFlagsBenchmark!.trackBatch as jest.Mock
    ).mock.calls.flatMap(([records]) => records);
    expect(batches).toHaveLength(
      ['batching-control', 'batching-buffered'].includes(mode) ? 5544 : 0,
    );
    expect(
      report.rows.reduce((sum, row) => sum + row.bridgeCalls, 0),
    ).toBeLessThanOrEqual(5520);
    expect(asyncCall).toHaveBeenCalledWith({op: 'experimentFlush'});
  },
);

test('100/second pacing catches up when RN timers are quantized to frames', async () => {
  const scheduledTimeout = global.setTimeout;
  jest
    .spyOn(global, 'setTimeout')
    .mockImplementation(((callback: () => void, delay: number) =>
      scheduledTimeout(
        callback,
        Math.max(16, Math.ceil(delay / 16) * 16),
      )) as any);
  (TurboModuleRegistry.get as jest.Mock).mockReturnValue({
    trackEvaluation: jest.fn(async () => {}),
  });
  const promise = runBatchingExperiment('batching-none', () => {});
  await jest.advanceTimersByTimeAsync(60000);
  const report = await promise;
  for (const row of report.rows.filter(row => row.workload === '100hz')) {
    expect(row.callerLoopMs).toBeGreaterThanOrEqual(1990);
    expect(row.callerLoopMs).toBeLessThanOrEqual(2010);
  }
});
