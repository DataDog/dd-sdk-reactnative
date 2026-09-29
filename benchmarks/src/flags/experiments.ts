/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

import {fromJsonString} from '@bufbuild/protobuf';
import {base64Decode, base64Encode} from '@bufbuild/protobuf/wire';
import {evaluateRulesBasedConfiguration} from '@datadog/flagging-core';
import {configurationFromRulesBinary} from '@datadog/flagging-core/rules-based';
import {Platform, TurboModuleRegistry} from 'react-native';
import type {TurboModule} from 'react-native';
import {comparable, makeFixture, requests} from './fixtures';
import {asyncCall, sync} from './runner';
import {assertEquivalent, summarize} from './statistics';
import {FlagsConfigurationSchema} from './ufc_pb';

const logger = {debug() {}, info() {}, warn() {}, error() {}};
const pause = (ms = 0) => new Promise<void>(resolve => setTimeout(resolve, ms));
interface TrackingBridge extends TurboModule {
  trackEvaluation(
    client: string,
    key: string,
    flag: Object,
    targetingKey: string,
    attributes: Object,
  ): Promise<void>;
}
const evaluate = (configuration: any, context: any) =>
  evaluateRulesBasedConfiguration(
    configuration,
    'boolean',
    'flag-0',
    false,
    context,
    logger,
  );

export function experimentMode(): string {
  return sync({op: 'experimentSettings'}).mode;
}

// Outstanding acknowledgements are not native queue depth or completion of disk writes/uploads.
export async function measureTrackingBurst(
  read: (index: number) => any,
  track: ((result: any, index: number) => Promise<void>) | undefined,
  count: number,
  yieldEvery: number,
) {
  const samplesMs: number[] = [];
  const acknowledgementsMs: number[] = [];
  let pending = 0;
  let maxPending = 0;
  let checksum = 0;
  const promises: Promise<void>[] = [];
  const failures: unknown[] = [];
  const scheduled = performance.now();
  const timer = new Promise<number>(resolve =>
    setTimeout(() => resolve(performance.now() - scheduled), 0),
  );
  const start = performance.now();
  for (let i = 0; i < count; i++) {
    const begin = performance.now();
    const result = read(i);
    if (track) {
      pending++;
      maxPending = Math.max(maxPending, pending);
      // Attach a rejection handler immediately; surface failures after the timed loop.
      promises.push(
        track(result, i).then(
          () => {
            pending--;
            acknowledgementsMs.push(performance.now() - begin);
          },
          error => {
            pending--;
            failures.push(error);
          },
        ),
      );
    }
    samplesMs.push(performance.now() - begin);
    checksum += result.value === true ? 1 : 0;
    if (yieldEvery && (i + 1) % yieldEvery === 0) await pause();
  }
  const dispatchMs = performance.now() - start;
  await Promise.all(promises);
  if (failures.length)
    throw new Error(`${failures.length} native tracking calls failed`);
  return {
    caller: summarize(samplesMs),
    samplesMs,
    acknowledgement: acknowledgementsMs.length
      ? summarize(acknowledgementsMs)
      : null,
    acknowledgementsMs,
    dispatchMs,
    allAcknowledgedMs: performance.now() - start,
    maxPendingAcknowledgements: maxPending,
    pendingAtEnd: pending,
    timerDelayMs: await timer,
    bridgeCalls: promises.length,
    checksum,
  };
}

async function tracking(mode: string, progress: (text: string) => void) {
  const bridge =
    mode === 'none'
      ? undefined
      : TurboModuleRegistry.get<TrackingBridge>('DdFlags');
  if (mode !== 'none' && !bridge)
    throw new Error('Missing production DdFlags bridge');
  const configuration = configurationFromRulesBinary(makeFixture(100).bytes)
    .rules?.response;
  const rows: any[] = [];
  const count = 500;
  for (let repetition = 0; repetition < 3; repetition++) {
    const cases = [
      {pattern: 'repeated', yieldEvery: 0},
      {pattern: 'changing', yieldEvery: 0},
      {pattern: 'repeated', yieldEvery: 25},
      {pattern: 'changing', yieldEvery: 25},
    ];
    for (let offset = 0; offset < cases.length; offset++) {
      const {pattern, yieldEvery} = cases[(offset + repetition) % cases.length];
      const client = `benchmark-${repetition}-${pattern}-${yieldEvery}`;
      const contexts = Array.from({length: count}, (_, i) => ({
        targetingKey: `${client}-${pattern === 'repeated' ? 0 : i}`,
        plan: 'paid',
        age: 25,
      }));
      const rawFlag = (result: any) => ({
        key: 'flag-0',
        value: result.value,
        reason: result.reason,
        allocationKey: result.flagMetadata.allocationKey,
        variationKey: result.variant,
        doLog: result.flagMetadata.doLog,
      });
      const reference = evaluate(configuration, contexts[0]);
      if (reference.value !== true || !reference.flagMetadata?.doLog)
        throw new Error('Invalid tracking fixture');
      // Create the native client before timing. This adds one evaluation, but no exposure.
      if (bridge)
        await bridge.trackEvaluation(
          client,
          'flag-0',
          {...rawFlag(reference), doLog: false},
          `${client}-warmup`,
          {},
        );
      progress(
        `Tracking ${mode}; ${pattern}; yield ${yieldEvery}; repetition ${
          repetition + 1
        }`,
      );
      await pause(100);
      const before = sync({op: 'experimentSnapshot'});
      const row = await measureTrackingBurst(
        i => evaluate(configuration, contexts[i]),
        bridge
          ? (result, i) =>
              bridge.trackEvaluation(
                client,
                'flag-0',
                rawFlag(result),
                contexts[i].targetingKey,
                {plan: 'paid', age: 25},
              )
          : undefined,
        count,
        yieldEvery,
      );
      if (row.checksum !== count)
        throw new Error('Tracking changed evaluation results');
      // A logical JSON-size proxy only: RN object transfer does not use this JSON wire encoding.
      const logicalArgumentBytes = bridge
        ? contexts.reduce(
            (total, context) =>
              total +
              JSON.stringify([
                client,
                'flag-0',
                rawFlag(reference),
                context.targetingKey,
                {plan: 'paid', age: 25},
              ]).length,
            0,
          )
        : 0;
      const after = sync({op: 'experimentSnapshot'});
      rows.push({
        repetition,
        pattern,
        yieldEvery,
        count,
        client,
        ...row,
        logicalArgumentBytes,
        residentBeforeBytes: before.residentBytes,
        residentAfterBytes: after.residentBytes,
        thermalBefore: before.thermalState,
        thermalAfter: after.thermalState,
      });
    }
  }
  // Let the production 1-second aggregation timer fire, then drain SDK storage to the loopback sink.
  await pause(1500);
  const sink = await asyncCall({op: 'experimentFlush'});
  return {
    rows,
    sink,
    expected: {
      exposures: ['exposures', 'both'].includes(mode) ? 3 * 2 * (1 + count) : 0,
      evaluationCount: ['evaluations', 'both'].includes(mode)
        ? rows.length * (count + 1)
        : 0,
    },
  };
}

async function hydration(progress: (text: string) => void) {
  const rows: any[] = [];
  const context = requests[0].context;
  for (const flagCount of [10, 100, 1000]) {
    const fixture = makeFixture(flagCount);
    sync({op: 'preload', base64: base64Encode(fixture.bytes)});
    sync({op: 'persistBinary'});
    const expected = comparable(
      evaluate(
        configurationFromRulesBinary(fixture.bytes).rules?.response,
        context,
      ),
    );
    const modes = [
      {
        name: 'native disk / base64 / JS decode + evaluate',
        op: 'readCachedBinary',
        finish: (result: any) =>
          evaluate(
            configurationFromRulesBinary(base64Decode(result.base64)).rules
              ?.response,
            context,
          ),
      },
      {
        name: 'native disk + decode / ProtoJSON / JS evaluate',
        op: 'readCachedJson',
        finish: (result: any) =>
          evaluate(
            fromJsonString(FlagsConfigurationSchema, result.json),
            context,
          ),
      },
      {
        name: 'native disk + decode + evaluate / result',
        op: 'evaluateCachedBinary',
        finish: (result: any) => result,
      },
    ];
    for (let repetition = 0; repetition < 3; repetition++) {
      for (let offset = 0; offset < modes.length; offset++) {
        const mode = modes[(offset + repetition) % modes.length];
        progress(
          `Hydration ${flagCount} flags; ${mode.name}; repetition ${
            repetition + 1
          }`,
        );
        const totalMs: number[] = [],
          handoffMs: number[] = [],
          jsFinishMs: number[] = [];
        const before = sync({op: 'experimentSnapshot'});
        let residentMaxSampledBytes = before.residentBytes;
        let handoffCharacters = 0;
        for (let i = 0; i < 30; i++) {
          await pause();
          const start = performance.now();
          const result = await asyncCall({...requests[0], op: mode.op});
          const handoff = performance.now();
          const evaluated = mode.finish(result);
          const finished = performance.now();
          totalMs.push(finished - start);
          handoffMs.push(handoff - start);
          jsFinishMs.push(finished - handoff);
          assertEquivalent(comparable(evaluated), expected, mode.name);
          handoffCharacters = JSON.stringify(result).length;
          residentMaxSampledBytes = Math.max(
            residentMaxSampledBytes,
            sync({op: 'experimentSnapshot'}).residentBytes,
          );
        }
        const after = sync({op: 'experimentSnapshot'});
        rows.push({
          flagCount,
          protobufBytes: fixture.bytes.length,
          mode: mode.name,
          repetition,
          total: summarize(totalMs),
          handoff: summarize(handoffMs),
          jsFinish: summarize(jsFinishMs),
          totalMs,
          handoffMs,
          jsFinishMs,
          handoffCharacters,
          residentBeforeBytes: before.residentBytes,
          residentAfterBytes: after.residentBytes,
          residentMaxSampledBytes,
          thermalBefore: before.thermalState,
          thermalAfter: after.thermalState,
        });
      }
    }
  }
  return {rows};
}

export async function runExperiment(progress: (text: string) => void) {
  const native = sync({op: 'metadata'});
  // These follow-ups deliberately run only on a simulator, never automatically on a personal phone.
  if (__DEV__ || !native.simulator || Platform.OS !== 'ios')
    throw new Error('Use an iOS Release simulator build');
  const mode = experimentMode();
  const settings = sync({op: 'experimentSettings'});
  if (
    mode !== 'hydration' &&
    settings.initialization?.clientType !== 'FlagsClient'
  ) {
    throw new Error(
      `Native tracking not initialized: ${JSON.stringify(settings)}`,
    );
  }
  if (
    ![
      'hydration',
      'none',
      'bridge-only',
      'exposures',
      'evaluations',
      'both',
    ].includes(mode)
  )
    throw new Error('Unknown experiment');
  const startedAt = new Date().toISOString();
  const result =
    mode === 'hydration'
      ? await hydration(progress)
      : await tracking(mode, progress);
  return {
    suite: 'mobile-flags-followups-v1',
    mode,
    startedAt,
    completedAt: new Date().toISOString(),
    correctness: 'passed',
    metadata: {
      ...native,
      final: sync({op: 'metadata'}),
      debug: __DEV__,
      hermes: !!(globalThis as any).HermesInternal,
      reactNative: Platform.constants.reactNativeVersion,
      flagsCore: '3.1.1',
      fileCache: 'warm; not cold app startup',
      sink: 'loopback HTTP collector; no external intake',
    },
    ...result,
  };
}
