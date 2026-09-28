/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

import {fromBinary, fromJsonString, toJsonString} from '@bufbuild/protobuf';
import {base64Decode} from '@bufbuild/protobuf/wire';
import {evaluateRulesBasedConfiguration} from '@datadog/flagging-core';
import NativeFlagsBenchmark from '../specs/NativeFlagsBenchmark';
import {runBenchmarks} from './runner';
import {FlagsConfigurationSchema} from './ufc_pb';

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    constants: {reactNativeVersion: {major: 0, minor: 78, patch: 2}},
  },
}));
jest.mock('../specs/NativeFlagsBenchmark', () => ({
  __esModule: true,
  default: {runSync: jest.fn(), runAsync: jest.fn()},
}));

const logger = {debug() {}, info() {}, warn() {}, error() {}};

beforeEach(() => {
  (globalThis as any).__DEV__ = false;
  let bytes: Uint8Array;
  let configuration: any;
  const run = (request: any) => {
    switch (request.op) {
      case 'preload':
        bytes = base64Decode(request.base64);
        return {};
      case 'installBinary':
        configuration = fromBinary(FlagsConfigurationSchema, bytes);
        return {};
      case 'binaryToJson':
        return {
          json: toJsonString(
            FlagsConfigurationSchema,
            fromBinary(FlagsConfigurationSchema, bytes),
          ),
        };
      case 'installJson':
        configuration = fromJsonString(FlagsConfigurationSchema, request.json);
        return {};
      case 'evaluate':
        return evaluateRulesBasedConfiguration(
          configuration,
          'boolean',
          request.flagKey,
          false,
          request.context,
          logger,
        );
      case 'echo':
        return request.result;
      case 'controls':
        return {
          mock: true,
          flagCount: Object.keys(configuration.flags).length,
          directEvaluation: {count: request.iterations},
          checksum: Array.from({length: request.iterations}, (_, i) =>
            run(request.requests[i % request.requests.length]),
          ).filter(result => result.value === true).length,
        };
      case 'metadata':
        return {mock: true};
      default:
        throw new Error(`Unexpected operation ${request.op}`);
    }
  };
  (NativeFlagsBenchmark!.runSync as jest.Mock).mockImplementation(run);
  (NativeFlagsBenchmark!.runAsync as jest.Mock).mockImplementation(
    async request => run(request),
  );
});

test('smoke orchestration exercises every placement and both transport controls', async () => {
  // This validates the harness using a JS stand-in, not the Swift implementation or bridge performance.
  const report = await runBenchmarks(() => {}, true);
  expect(report.correctness).toBe('passed');
  expect(report.rows).toHaveLength(9);
  expect(
    report.rows
      .filter(row => row.warmRead)
      .every(row => row.warmRead.count === 100),
  ).toBe(true);
  expect(report.metadata.smoke).toBe(true);
  expect(report.checksum).toBeGreaterThan(0);
});

test('refuses to produce a report if a native result differs', async () => {
  const original = (
    NativeFlagsBenchmark!.runSync as jest.Mock
  ).getMockImplementation()!;
  (NativeFlagsBenchmark!.runSync as jest.Mock).mockImplementation(request =>
    request.op === 'evaluate' ? {value: 'wrong'} : original(request),
  );
  await expect(runBenchmarks(() => {}, true)).rejects.toThrow(
    'Correctness gate failed',
  );
});

test('surfaces native setup errors instead of timing a no-op', async () => {
  (NativeFlagsBenchmark!.runSync as jest.Mock).mockReturnValue({
    benchmarkError: 'Prototype unavailable',
  });
  await expect(runBenchmarks(() => {}, true)).rejects.toThrow(
    'Prototype unavailable',
  );
});
