/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

// Benchmark policy, not a proposed public API or a durable queue.
export function createTrackingBuffer<T>(
  send: (records: T[]) => Promise<void>,
  maxBatch: number,
  delayMs: number,
) {
  if (
    !Number.isInteger(maxBatch) ||
    maxBatch < 1 ||
    maxBatch > 25 ||
    !Number.isFinite(delayMs) ||
    delayMs < 0
  )
    throw new Error('Invalid batching policy');
  let buffer: {record: T; queuedAt: number}[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight = 0;
  let closed = false;
  const pending = new Set<Promise<void>>();
  const failures: unknown[] = [];
  const stats = {
    bridgeCalls: 0,
    batchSizes: [] as number[],
    enqueueToSubmitMs: [] as number[],
    acknowledgementMs: [] as number[],
    submissionMs: [] as number[],
    offCallerFlushMs: [] as number[],
    maxBufferedRecords: 0,
    maxRetainedRecords: 0,
  };
  function flush(fromCaller = false) {
    const entered = performance.now();
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (!buffer.length) return;
    const batch = buffer;
    buffer = [];
    const began = performance.now();
    stats.enqueueToSubmitMs.push(...batch.map(item => began - item.queuedAt));
    stats.batchSizes.push(batch.length);
    stats.bridgeCalls++;
    inFlight += batch.length;
    let request: Promise<void>;
    try {
      request = send(batch.map(item => item.record));
    } catch (error) {
      request = Promise.reject(error);
    }
    stats.submissionMs.push(performance.now() - began);
    const observed = request
      .then(
        () => {
          const now = performance.now();
          stats.acknowledgementMs.push(
            ...batch.map(item => now - item.queuedAt),
          );
        },
        error => {
          failures.push(error);
        },
      )
      .then(() => {
        inFlight -= batch.length;
        pending.delete(observed);
      });
    pending.add(observed);
    if (!fromCaller) stats.offCallerFlushMs.push(performance.now() - entered);
  }
  return {
    stats,
    enqueue(record: T) {
      if (closed) throw new Error('Tracking buffer is closed');
      buffer.push({record, queuedAt: performance.now()});
      stats.maxBufferedRecords = Math.max(
        stats.maxBufferedRecords,
        buffer.length,
      );
      stats.maxRetainedRecords = Math.max(
        stats.maxRetainedRecords,
        buffer.length + inFlight,
      );
      if (buffer.length >= maxBatch) flush(true);
      else if (timer === undefined) timer = setTimeout(() => flush(), delayMs);
    },
    async drain() {
      closed = true;
      flush();
      await Promise.all(pending);
      if (failures.length)
        throw new Error(`${failures.length} native batches failed`);
      return {buffered: buffer.length, inFlight};
    },
  };
}
