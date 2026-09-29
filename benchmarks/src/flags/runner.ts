/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

import {fromBinary, fromJsonString, toJsonString} from '@bufbuild/protobuf';
import {base64Encode} from '@bufbuild/protobuf/wire';
import {evaluateRulesBasedConfiguration} from '@datadog/flagging-core';
import {configurationFromRulesBinary} from '@datadog/flagging-core/rules-based';
import {Platform} from 'react-native';
import NativeFlagsBenchmark from '../specs/NativeFlagsBenchmark';
import {comparable, makeFixture, requests} from './fixtures';
import {assertEquivalent, summarize} from './statistics';
import {FlagsConfigurationSchema} from './ufc_pb';

const logger = {debug() {}, info() {}, warn() {}, error() {}};
type Request = Record<string, any>;
export const sync = (request: Request): any => {
  if (!NativeFlagsBenchmark)
    throw new Error('Build the iOS benchmark module first');
  const result: any = NativeFlagsBenchmark.runSync(request);
  if (result.benchmarkError) throw new Error(result.benchmarkError);
  return result;
};
export const asyncCall = async (request: Request): Promise<any> => {
  if (!NativeFlagsBenchmark)
    throw new Error('Build the iOS benchmark module first');
  const result: any = await NativeFlagsBenchmark.runAsync(request);
  if (result.benchmarkError) throw new Error(result.benchmarkError);
  return result;
};
const pause = () => new Promise<void>(resolve => setTimeout(resolve, 0));

export async function runBenchmarks(
  progress: (text: string) => void,
  smoke = false,
) {
  if (Platform.OS !== 'ios')
    throw new Error('This prototype implements the iOS comparison only');
  const samples = smoke ? 100 : 10000;
  const warmup = smoke ? 20 : 1000;
  const setupSamples = smoke ? 3 : 100;
  const repetitions = smoke ? 1 : 5;
  const rows: any[] = [];
  let checksum = 0;
  const consume = (result: any) => {
    checksum += result?.value === true ? 1 : 0;
  };

  for (const flagCount of smoke ? [10] : [10, 100, 1000]) {
    const fixture = makeFixture(flagCount);
    const replacement = makeFixture(flagCount, 1);
    // Both runtimes start setup with their own in-memory copy of identical protobuf bytes.
    sync({op: 'preload', base64: base64Encode(fixture.bytes)});
    let js: any = configurationFromRulesBinary(fixture.bytes).rules?.response;
    const evaluateJS = (request: Request) =>
      evaluateRulesBasedConfiguration(
        js,
        'boolean',
        request.flagKey,
        false,
        request.context,
        logger,
      );
    const expected = requests.map(request => comparable(evaluateJS(request)));
    if (
      expected.some(result => result.reason === 'ERROR' || result.errorCode)
    ) {
      throw new Error('The reference evaluator rejected a benchmark fixture');
    }
    const modes = [
      {
        name: 'JS decode / JS evaluate',
        install: () => {
          js = configurationFromRulesBinary(fixture.bytes).rules?.response;
        },
        call: evaluateJS,
        asynchronous: false,
      },
      {
        name: 'Native decode / JS evaluate (ProtoJSON handoff)',
        install: () => {
          js = fromJsonString(
            FlagsConfigurationSchema,
            sync({op: 'binaryToJson'}).json,
          );
        },
        call: evaluateJS,
        asynchronous: false,
      },
      {
        name: 'JS decode / native evaluate sync (ProtoJSON handoff)',
        install: () => {
          const decoded = fromBinary(FlagsConfigurationSchema, fixture.bytes);
          sync({
            op: 'installJson',
            json: toJsonString(FlagsConfigurationSchema, decoded),
          });
        },
        call: sync,
        asynchronous: false,
      },
      {
        name: 'Native decode / native evaluate sync',
        install: () => sync({op: 'installBinary'}),
        call: sync,
        asynchronous: false,
      },
      {
        name: 'JS decode / native evaluate async (ProtoJSON handoff)',
        install: () => {
          const decoded = fromBinary(FlagsConfigurationSchema, fixture.bytes);
          sync({
            op: 'installJson',
            json: toJsonString(FlagsConfigurationSchema, decoded),
          });
        },
        call: asyncCall,
        asynchronous: true,
      },
      {
        name: 'Native decode / native evaluate async',
        install: () => sync({op: 'installBinary'}),
        call: asyncCall,
        asynchronous: true,
      },
    ];
    for (let repetition = 0; repetition < repetitions; repetition++) {
      // Rotate order to reduce systematic warm-cache/thermal ordering bias.
      for (let offset = 0; offset < modes.length; offset++) {
        const mode = modes[(offset + repetition) % modes.length];
        progress(
          `${flagCount} flags; run ${repetition + 1}/${repetitions}; ${
            mode.name
          }`,
        );
        await pause();
        mode.install();
        for (let i = 0; i < requests.length; i++) {
          assertEquivalent(
            comparable(await mode.call(requests[i])),
            expected[i],
            `${mode.name}: context ${i}`,
          );
        }
        // Same context again after other contexts: no stale assignment state.
        for (let i = 0; i < 4; i++) {
          assertEquivalent(
            comparable(await mode.call(requests[i])),
            expected[i],
            `context A -> B -> A: workload ${i}`,
          );
        }
        const install: number[] = [];
        const firstRead: number[] = [];
        for (let i = 0; i < setupSamples; i++) {
          const start = performance.now();
          mode.install();
          install.push(performance.now() - start);
          const firstStart = performance.now();
          const value = mode.asynchronous
            ? await mode.call(requests[0])
            : mode.call(requests[0]);
          firstRead.push(performance.now() - firstStart);
          consume(value);
        }
        for (let i = 0; i < warmup; i++)
          await mode.call(requests[i % requests.length]);
        const timings: number[] = [];
        const byWorkload: number[][] = [[], [], [], []];
        // A queued timer observes the uninterrupted caller's blocking, not rendering FPS.
        const scheduled = performance.now();
        const timerDelay = new Promise<number>(resolve =>
          setTimeout(() => resolve(performance.now() - scheduled), 0),
        );
        const batchStart = performance.now();
        for (let i = 0; i < samples; i++) {
          const request = requests[i % requests.length];
          const start = performance.now();
          const value = mode.asynchronous
            ? await mode.call(request)
            : mode.call(request);
          const elapsed = performance.now() - start;
          timings.push(elapsed);
          byWorkload[i % 4].push(elapsed);
          consume(value);
        }
        const batchMs = performance.now() - batchStart;
        rows.push({
          flagCount,
          payloadBytes: fixture.bytes.length,
          repetition,
          mode: mode.name,
          install: summarize(install),
          firstRead: summarize(firstRead),
          warmRead: summarize(timings),
          warmByWorkload: Object.fromEntries(
            ['static', 'membership', 'compound-numeric', 'md5-split'].map(
              (name, i) => [name, summarize(byWorkload[i])],
            ),
          ),
          callsPerSecond: (samples / batchMs) * 1000,
          queuedTimerDelayMs: await timerDelay,
        });
      }
    }

    // Decoder controls use the same bytes and report native time inside the module.
    const decode: number[] = [];
    for (let i = 0; i < setupSamples; i++) {
      const start = performance.now();
      const result = fromBinary(FlagsConfigurationSchema, fixture.bytes);
      decode.push(performance.now() - start);
      if (Object.keys(result.flags).length !== flagCount)
        throw new Error('Incomplete JS decode');
    }
    const native = sync({
      op: 'controls',
      requests,
      iterations: samples,
      warmup,
      decodeIterations: setupSamples,
    });
    const expectedChecksum = Array.from(
      {length: samples},
      (_, i) => expected[i % expected.length],
    ).filter(result => result.value === true).length;
    assertEquivalent(
      native.checksum,
      expectedChecksum,
      'native-direct checksum',
    );
    assertEquivalent(native.flagCount, flagCount, 'native decoder flag count');
    assertEquivalent(
      native.directEvaluation.count,
      samples,
      'native-direct sample count',
    );
    rows.push({
      flagCount,
      mode: 'decoder and native-direct controls',
      jsDecode: summarize(decode),
      native,
    });

    // Configuration replacement correctness is mandatory before trusting any timing rows.
    js = configurationFromRulesBinary(replacement.bytes).rules?.response;
    sync({op: 'installJson', json: replacement.json});
    for (const request of requests)
      assertEquivalent(
        comparable(sync(request)),
        comparable(evaluateJS(request)),
        'replacement',
      );
    sync({op: 'preload', base64: base64Encode(replacement.bytes)});
    sync({op: 'installBinary'});
    for (const request of requests)
      assertEquivalent(
        comparable(sync(request)),
        comparable(evaluateJS(request)),
        'binary replacement',
      );
  }

  const sample = sync(requests[0]);
  for (const asynchronous of [false, true]) {
    const timings: number[] = [];
    const request = {...requests[0], op: 'echo', result: sample};
    for (let i = 0; i < warmup; i++)
      await (asynchronous ? asyncCall(request) : sync(request));
    for (let i = 0; i < samples; i++) {
      const start = performance.now();
      const value = asynchronous ? await asyncCall(request) : sync(request);
      timings.push(performance.now() - start);
      consume(value);
    }
    rows.push({
      mode: `echo ${asynchronous ? 'async' : 'sync'}`,
      timing: summarize(timings),
    });
  }
  const clock: number[] = [];
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    clock.push(performance.now() - start);
  }
  return {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    correctness: 'passed',
    checksum,
    metadata: {
      ...sync({op: 'metadata'}),
      debug: __DEV__,
      hermes: !!(globalThis as any).HermesInternal,
      turboModuleProxy: !!(globalThis as any).__turboModuleProxy,
      reactNative: Platform.constants.reactNativeVersion,
      flaggingCore: '3.1.1',
      protobufES: '2.15.0',
      samples,
      warmup,
      setupSamples,
      repetitions,
      smoke,
    },
    clock: summarize(clock),
    rows,
    limitations: [
      'Synthetic boolean workloads; not full evaluator conformance',
      'No tracking, network or disk I/O',
      'ProtoJSON crossed paths are one possible handoff, not a lower bound',
      'Do not infer a winner from debug, simulator, single-run, or host results',
    ],
  };
}

export function saveReport(json: string) {
  return sync({op: 'saveReport', json}).path as string;
}
