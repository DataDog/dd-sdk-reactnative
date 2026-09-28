/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

import {evaluateRulesBasedConfiguration} from '@datadog/flagging-core';
import {configurationFromRulesBinary} from '@datadog/flagging-core/rules-based';
import {makeFixture} from './fixtures';

const logger = {debug() {}, info() {}, warn() {}, error() {}};

test('fixture setup works without Hermes text-encoding globals', () => {
  const globals = globalThis as any;
  const encoder = globals.TextEncoder;
  const decoder = globals.TextDecoder;
  try {
    globals.TextEncoder = undefined;
    globals.TextDecoder = undefined;
    jest.isolateModules(() => {
      const fixture = require('./fixtures').makeFixture(10);
      const configuration =
        require('@datadog/flagging-core/rules-based').configurationFromRulesBinary(
          fixture.bytes,
        );
      expect(Object.keys(configuration.rules.response.flags)).toHaveLength(10);
    });
  } finally {
    globals.TextEncoder = encoder;
    globals.TextDecoder = decoder;
  }
});

test('fixture covers static, context-sensitive targeting, numeric conditions and MD5 splits', () => {
  const configuration = configurationFromRulesBinary(makeFixture(10).bytes)
    .rules!.response;
  const evaluate = (flagKey: string, plan = 'paid', age = 25) =>
    evaluateRulesBasedConfiguration(
      configuration,
      'boolean',
      flagKey,
      false,
      {targetingKey: 'subject-0', plan, age},
      logger,
    );
  expect(evaluate('flag-0')).toMatchObject({
    value: true,
    reason: 'STATIC',
    variant: 'on',
  });
  expect(evaluate('flag-1')).toMatchObject({
    value: true,
    reason: 'TARGETING_MATCH',
  });
  expect(evaluate('flag-1', 'free')).toMatchObject({
    value: false,
    reason: 'DEFAULT',
  });
  expect(evaluate('flag-2', 'paid', 12)).toMatchObject({
    value: false,
    reason: 'DEFAULT',
  });
  expect(evaluate('flag-2')).toMatchObject({
    value: true,
    reason: 'TARGETING_MATCH',
  });
  expect(evaluate('flag-3')).toMatchObject({
    reason: 'SPLIT',
    flagMetadata: {doLog: true, __dd_split_serial_id: 3},
  });
});

test('configuration replacement changes results, not only object identity', () => {
  const original = configurationFromRulesBinary(makeFixture(10).bytes).rules!
    .response;
  const replacement = configurationFromRulesBinary(makeFixture(10, 1).bytes)
    .rules!.response;
  expect(
    evaluateRulesBasedConfiguration(
      original,
      'boolean',
      'flag-0',
      false,
      {},
      logger,
    ).value,
  ).toBe(true);
  expect(
    evaluateRulesBasedConfiguration(
      replacement,
      'boolean',
      'flag-0',
      false,
      {},
      logger,
    ).value,
  ).toBe(false);
});
