/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

import {TurboModuleRegistry} from 'react-native';
import type {TurboModule} from 'react-native';
import {evaluateRulesBasedConfiguration} from '@datadog/flagging-core';
import {configurationFromRulesBinary} from '@datadog/flagging-core/rules-based';
import NativeFlagsBenchmark from '../specs/NativeFlagsBenchmark';
import {makeFixture} from './fixtures';
import {asyncCall, sync} from './runner';
import {summarize} from './statistics';
import {createTrackingBuffer} from './trackingBuffer';

interface TrackingBridge extends TurboModule {
  trackEvaluation(
    client: string,
    key: string,
    flag: Object,
    targetingKey: string,
    attributes: Object,
  ): Promise<void>;
}
export const batchingModes = [
  'batching-none',
  'batching-current',
  'batching-control',
  'batching-buffered',
];
const pause = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));
const logger = {debug() {}, info() {}, warn() {}, error() {}};
const workloads = [
  {name: '10hz', count: 20, group: 1, intervalMs: 100},
  {name: '100hz', count: 200, group: 1, intervalMs: 10},
  {name: 'screen-burst', count: 200, group: 20, intervalMs: 250},
  {name: 'stress-burst', count: 500, group: 500, intervalMs: 0},
];

export async function runBatchingExperiment(
  mode: string,
  progress: (text: string) => void,
) {
  if (!batchingModes.includes(mode)) throw new Error('Invalid batching mode');
  const bridge = TurboModuleRegistry.get<TrackingBridge>('DdFlags');
  if (!bridge || !NativeFlagsBenchmark?.trackBatch)
    throw new Error('Missing real tracking bridges');
  const configuration = configurationFromRulesBinary(makeFixture(100).bytes)
    .rules?.response;
  const evaluate = (context: any) =>
    evaluateRulesBasedConfiguration(
      configuration,
      'boolean',
      'flag-0',
      false,
      context,
      logger,
    );
  const rows: any[] = [];
  const enabled = mode !== 'batching-none';
  const cases = workloads.flatMap(workload =>
    ['repeated', 'changing'].map(pattern => ({...workload, pattern})),
  );
  const runBegan = performance.now();
  for (let repetition = 0; repetition < 3; repetition++) {
    for (let offset = 0; offset < cases.length; offset++) {
      const workload = cases[(offset + repetition) % cases.length];
      const {name, count, group, intervalMs, pattern} = workload;
      const client = `${mode}-${repetition}-${name}-${pattern}`;
      const contexts = Array.from({length: count}, (_, index) => ({
        targetingKey: `${client}-${pattern === 'repeated' ? 0 : index}`,
        plan: 'paid',
        age: 25,
      }));
      const record = (result: any, context: any) => ({
        client,
        key: 'flag-0',
        targetingKey: context.targetingKey,
        attributes: {plan: context.plan, age: context.age},
        flag: {
          key: 'flag-0',
          value: result.value,
          reason: result.reason,
          allocationKey: result.flagMetadata.allocationKey,
          variationKey: result.variant,
          doLog: result.flagMetadata.doLog,
        },
      });
      type Record = ReturnType<typeof record>;
      const send = (records: Record[]) =>
        mode === 'batching-current'
          ? bridge.trackEvaluation(
              records[0].client,
              records[0].key,
              records[0].flag,
              records[0].targetingKey,
              records[0].attributes,
            )
          : NativeFlagsBenchmark!.trackBatch(records);
      if (enabled) {
        const warmup = record(evaluate(contexts[0]), {
          ...contexts[0],
          targetingKey: `${client}-warmup`,
        });
        warmup.flag.doLog = false;
        await send([warmup]);
      }
      const buffer = createTrackingBuffer(
        send,
        mode === 'batching-buffered' ? 25 : 1,
        50,
      );
      const callerMs: number[] = [];
      const timerDelayMs: number[] = [];
      let lastTick = performance.now();
      const heartbeat = setInterval(() => {
        const now = performance.now();
        timerDelayMs.push(Math.max(0, now - lastTick - 16));
        lastTick = now;
      }, 16);
      progress(`${mode}; ${name}; ${pattern}; repetition ${repetition + 1}`);
      const before = sync({op: 'experimentSnapshot'});
      const beganAt = Date.now();
      const began = performance.now();
      let checksum = 0;
      let drained;
      let callerLoopMs;
      let allAcknowledgedMs;
      try {
        for (let index = 0; index < count; index++) {
          if (index && index % group === 0 && intervalMs) {
            const delay =
              began + (index / group) * intervalMs - performance.now();
            // RN timers can fire once per frame. Catch up without adding another yield.
            if (delay > 0) await pause(delay);
          }
          const start = performance.now();
          const result = evaluate(contexts[index]);
          if (enabled) buffer.enqueue(record(result, contexts[index]));
          callerMs.push(performance.now() - start);
          checksum += result.value === true ? 1 : 0;
        }
        callerLoopMs = performance.now() - began;
        drained = await buffer.drain();
        allAcknowledgedMs = performance.now() - began;
        // Include a timer observation after an uninterrupted burst, not only before it.
        await pause(20);
      } finally {
        clearInterval(heartbeat);
      }
      if (checksum !== count || drained.buffered || drained.inFlight)
        throw new Error('Invalid batching result');
      const after = sync({op: 'experimentSnapshot'});
      rows.push({
        repetition,
        workload: name,
        pattern,
        count,
        group,
        intervalMs,
        client,
        beganAt,
        endedAt: Date.now(),
        callerLoopMs,
        allAcknowledgedMs,
        caller: summarize(callerMs),
        callerMs,
        timerDelay: summarize(timerDelayMs),
        timerDelayMs,
        checksum,
        drained,
        ...buffer.stats,
        residentBeforeBytes: before.residentBytes,
        residentAfterBytes: after.residentBytes,
      });
    }
  }
  await pause(1500);
  const sink = await asyncCall({op: 'experimentFlush'});
  return {
    rows,
    sink,
    totalMs: performance.now() - runBegan,
    policy: {
      maxBatch: mode === 'batching-buffered' ? 25 : 1,
      maxWaitMs: mode === 'batching-buffered' ? 50 : 0,
      nativeDeduplication: true,
      nativeAggregation: true,
    },
    expected: {
      exposures: enabled ? 2772 : 0,
      evaluationCount: enabled ? 5544 : 0,
    },
  };
}
