/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

// Eagerly initialize core's UTF-8 fallback before Metro lazily loads our schema on Hermes.
import '@datadog/flagging-core/rules-based';
import {fromJson, toBinary, toJsonString} from '@bufbuild/protobuf';
import {FlagsConfigurationSchema} from './ufc_pb';

// Synthetic, ASCII-only client configurations. No credentials, network, or customer data.
export function makeFixture(flagCount: number, revision = 0) {
  if (!Number.isInteger(flagCount) || flagCount < 4)
    throw new Error('At least four flags required');
  const flags: Record<string, any> = {};
  for (let i = 0; i < flagCount; i++) {
    const kind = i % 4;
    flags[`flag-${i}`] = {
      variationType: 'VARIATION_TYPE_BOOLEAN',
      variations: [
        {keyStringIndex: 0, booleanValue: revision === 0},
        {keyStringIndex: 1, booleanValue: revision !== 0},
      ],
      allocations: [
        {
          key: `allocation-${i}`,
          ...(kind === 1 ? {targetingConditionIndex: 0} : {}),
          ...(kind === 2 ? {targetingConditionIndex: 2} : {}),
          logExposureEvent: true,
          partitionKey:
            kind === 3
              ? [
                  {
                    shardMd5: {
                      salt: `salt-${i}-`,
                      attributeIndex: 0,
                      totalShards: '10000',
                    },
                  },
                ]
              : [],
          splits:
            kind === 3
              ? [
                  {
                    ranges: [{from: '0', to: '5000'}],
                    variationIndex: 0,
                    serialId: i,
                    reason: 'REASON_SPLIT',
                  },
                  {
                    ranges: [{from: '5000', to: '10000'}],
                    variationIndex: 1,
                    serialId: i,
                    reason: 'REASON_SPLIT',
                  },
                ]
              : [
                  {
                    variationIndex: 0,
                    serialId: i,
                    reason:
                      kind === 0 ? 'REASON_STATIC' : 'REASON_TARGETING_MATCH',
                  },
                ],
        },
        {
          key: `fallback-${i}`,
          splits: [{variationIndex: 1, reason: 'REASON_DEFAULT'}],
        },
      ],
    };
  }
  const response = fromJson(FlagsConfigurationSchema, {
    environmentName: 'synthetic-benchmark',
    strings: ['on', 'off', 'plan', 'paid', 'age'],
    attributes: [
      {targetingKey: {}},
      {attributePath: {segments: [{objectKeyStringIndex: 2}]}},
      {attributePath: {segments: [{objectKeyStringIndex: 4}]}},
    ],
    conditions: [
      {stringMembership: {attributeIndex: 1, stringIndexes: [3]}},
      {
        numeric: {
          attributeIndex: 2,
          comparator: 'NUMERIC_COMPARATOR_GREATER_THAN_OR_EQUAL',
          comparand: 18,
        },
      },
      {all: {conditionIndexes: [0, 1]}},
    ],
    flags,
  });
  return {
    bytes: toBinary(FlagsConfigurationSchema, response),
    json: toJsonString(FlagsConfigurationSchema, response),
  };
}

export const requests = Array.from({length: 64}, (_, i) => ({
  op: 'evaluate',
  flagKey: `flag-${i % 4}`,
  type: 'boolean',
  defaultValue: false,
  context: {
    targetingKey: `subject-${Math.floor(i / 4)}`,
    plan: i % 3 ? 'paid' : 'free',
    age: i % 5 ? 25 : 12,
  },
}));

export function comparable(result: any) {
  const {__dd_eval_timestamp_ms: _timestamp, ...flagMetadata} =
    result.flagMetadata ?? {};
  return {...result, flagMetadata};
}
