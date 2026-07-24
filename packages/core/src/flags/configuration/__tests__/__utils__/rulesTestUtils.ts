/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://github.com/DataDog).
 * Copyright 2016-Present Datadog, Inc.
 */

import { OperatorType } from '@datadog/flagging-core';
import type { UniversalFlagConfigurationV1 } from '@datadog/flagging-core';

import type {
    RulesEngine,
    RulesEvaluationDetails,
    RulesEvaluationRequest,
    RulesValueType
} from '../../rules';

export const buildRulesConfiguration = (): UniversalFlagConfigurationV1 => ({
    createdAt: '2026-07-23T12:00:00.000Z',
    format: 'SERVER',
    environment: { name: 'test' },
    flags: {
        'dynamic-flag': {
            key: 'dynamic-flag',
            enabled: true,
            variationType: 'BOOLEAN',
            variations: {
                enabled: { key: 'enabled', value: true },
                disabled: { key: 'disabled', value: false }
            },
            allocations: [
                {
                    key: 'allocation-1',
                    rules: [
                        {
                            conditions: [
                                {
                                    operator: OperatorType.ONE_OF,
                                    attribute: 'country',
                                    value: ['US']
                                }
                            ]
                        }
                    ],
                    splits: [
                        {
                            variationKey: 'enabled',
                            serialId: 7,
                            extraLogging: { experiment: 'checkout' },
                            shards: [
                                {
                                    salt: 'test-salt',
                                    ranges: [{ start: 0, end: 100 }],
                                    totalShards: 100
                                }
                            ]
                        }
                    ],
                    doLog: false
                }
            ]
        }
    }
});

type FakeRulesEvaluation = RulesEvaluationDetails<unknown>;

export interface FakeRulesEngine extends RulesEngine {
    evaluate: jest.Mock<
        FakeRulesEvaluation,
        [RulesEvaluationRequest<RulesValueType>]
    >;
}

// TODO(FFL-2837): Remove this fake after the upstream rules wire and engine
// contract are published and the state-matrix tests can use canonical vectors.
export const createFakeRulesEngine = (
    result: FakeRulesEvaluation
): FakeRulesEngine => {
    return {
        evaluate: jest.fn(() => result)
    } as FakeRulesEngine;
};
