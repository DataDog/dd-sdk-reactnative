/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

import {createTrackingBuffer} from './trackingBuffer';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('flushes at the threshold and drains the remaining records without deduplication', async () => {
  const send = jest.fn(
    async (_records: {targetingKey: string; index: number}[]) => {},
  );
  const buffer = createTrackingBuffer(send, 25, 50);
  for (let i = 0; i < 52; i++)
    buffer.enqueue({targetingKey: `user-${i % 2}`, index: i});
  expect(send).toHaveBeenCalledTimes(2);
  expect(await buffer.drain()).toEqual({buffered: 0, inFlight: 0});
  expect(send.mock.calls.flatMap(([records]) => records)).toEqual(
    Array.from({length: 52}, (_, index) => ({
      targetingKey: `user-${index % 2}`,
      index,
    })),
  );
  expect(buffer.stats.batchSizes).toEqual([25, 25, 2]);
  expect(buffer.stats.maxBufferedRecords).toBe(25);
  expect(buffer.stats.maxRetainedRecords).toBe(52);
  expect(buffer.stats.acknowledgementMs).toHaveLength(52);
  expect(() => buffer.enqueue({targetingKey: 'later', index: 52})).toThrow(
    'closed',
  );
  jest.runAllTimers();
  expect(send).toHaveBeenCalledTimes(3);
});

test('flushes a partial batch after 50 ms without waiting for another evaluation', async () => {
  const send = jest.fn(async () => {});
  const buffer = createTrackingBuffer(send, 25, 50);
  buffer.enqueue('first');
  jest.advanceTimersByTime(40);
  buffer.enqueue('second');
  jest.advanceTimersByTime(9);
  expect(send).not.toHaveBeenCalled();
  jest.advanceTimersByTime(1);
  expect(send).toHaveBeenCalledWith(['first', 'second']);
  expect(buffer.stats.enqueueToSubmitMs).toEqual([50, 10]);
  await buffer.drain();
});

test('one-record control submits immediately and drain awaits the native acknowledgement', async () => {
  let acknowledge!: () => void;
  const send = jest.fn(
    () =>
      new Promise<void>(resolve => {
        acknowledge = resolve;
      }),
  );
  const buffer = createTrackingBuffer(send, 1, 50);
  buffer.enqueue('event');
  expect(send).toHaveBeenCalledWith(['event']);
  let finished = false;
  const drained = buffer.drain().then(() => {
    finished = true;
  });
  await Promise.resolve();
  expect(finished).toBe(false);
  acknowledge();
  await drained;
  expect(finished).toBe(true);
});

test.each([false, true])(
  'native failure invalidates the run (synchronous=%s)',
  async synchronous => {
    const buffer = createTrackingBuffer(
      () => {
        if (synchronous) throw new Error('rejected');
        return Promise.reject(new Error('rejected'));
      },
      1,
      50,
    );
    buffer.enqueue('event');
    await expect(buffer.drain()).rejects.toThrow('1 native batches failed');
  },
);

test.each([
  [0, 50],
  [26, 50],
  [1.5, 50],
  [25, -1],
  [25, NaN],
])('rejects invalid policy %s/%s', (size, delay) => {
  expect(() => createTrackingBuffer(async () => {}, size, delay)).toThrow(
    'Invalid batching policy',
  );
});
