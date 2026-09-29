/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

import {measureTrackingBurst, runExperiment} from './experiments';
import {sync} from './runner';
import {Platform} from 'react-native';

jest.mock('react-native', () => ({
  Platform: {OS: 'ios'},
  TurboModuleRegistry: {get: jest.fn()},
}));
jest.mock('./runner', () => ({sync: jest.fn(), asyncCall: jest.fn()}));

beforeEach(() => {
  (Platform as any).OS = 'ios';
  (globalThis as any).__DEV__ = false;
  (sync as jest.Mock).mockReset();
});

test('no-tracking baseline does not enqueue native work', async () => {
  const result = await measureTrackingBurst(
    () => ({value: true}),
    undefined,
    10,
    0,
  );
  expect(result.bridgeCalls).toBe(0);
  expect(result.maxPendingAcknowledgements).toBe(0);
  expect(result.acknowledgement).toBeNull();
  expect(result.checksum).toBe(10);
});

test('nonblocking calls are all acknowledged and bounded by explicit yields', async () => {
  const track = jest.fn(async () => {});
  const result = await measureTrackingBurst(
    () => ({value: true}),
    track,
    10,
    2,
  );
  expect(track).toHaveBeenCalledTimes(10);
  expect(result.maxPendingAcknowledgements).toBe(2);
  expect(result.pendingAtEnd).toBe(0);
  expect(result.acknowledgement?.count).toBe(10);
});

test('native rejections invalidate the report even across yields', async () => {
  await expect(
    measureTrackingBurst(
      () => ({value: true}),
      async () => {
        throw new Error('not initialized');
      },
      5,
      1,
    ),
  ).rejects.toThrow('5 native tracking calls failed');
});

test('follow-ups cannot run on a physical phone', async () => {
  (globalThis as any).__DEV__ = false;
  (sync as jest.Mock).mockReturnValue({simulator: false});
  await expect(runExperiment(() => {})).rejects.toThrow('Release simulator');
});

test('Android follow-ups reject a physical device', async () => {
  (Platform as any).OS = 'android';
  (sync as jest.Mock).mockReturnValue({simulator: false, nativeDebug: false});
  await expect(runExperiment(() => {})).rejects.toThrow(
    'Release simulator or emulator',
  );
});

test('Android tracking cannot silently run without its native setup', async () => {
  (Platform as any).OS = 'android';
  (sync as jest.Mock).mockImplementation(request =>
    request.op === 'metadata'
      ? {simulator: true, nativeDebug: false}
      : {mode: 'both'},
  );
  await expect(runExperiment(() => {})).rejects.toThrow(
    'only hydration is enabled',
  );
});
