/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { configurationFromString } from '@datadog/flagging-core/rules-based';
import type {
    PrecomputedConfiguration,
    RulesConfiguration
} from '@datadog/flagging-core';

// From openfeature-js-client/packages/browser/test/data/rules-v1-wire.json.
// Targets country=US with a logged allocation and otherwise uses an unlogged fallback split.
export const rulesWire = JSON.stringify({
    version: 1,
    rules: {
        etag: 'rules-etag',
        response:
            'CgQIABAAEgRwcm9kGm0KCXRlc3QtZmxhZxJgCAAQBBoECAAoASIsCgphbGxvY2F0aW9uEAAaDBIKCgRzYWx0EAEYZCIMCgQIABBkEAAYByABKAEiJgoIZmFsbGJhY2saDBIKCgRzYWx0EAEYZCIMCgQIABBkEAAYByACIgYSBAoCCAMiAgoAKgJvbioDb2ZmKgJVUyoHY291bnRyeTIEXlVTJDoJCgExCgEyCgEzSgYqBAgAEAJQAA=='
    }
});

export const rulesConfiguration = (): { rules: RulesConfiguration } => {
    const configuration = configurationFromString(rulesWire);
    if (!configuration.rules) {
        throw new Error('Invalid rules fixture');
    }
    return { rules: configuration.rules };
};

export const matchingContext = { targetingKey: 'user-1', country: 'US' };

export const precomputedConfiguration = (): {
    precomputed: PrecomputedConfiguration;
} => ({
    precomputed: {
        context: matchingContext,
        response: {
            data: {
                attributes: {
                    createdAt: '2026-07-06T23:01:56.822Z',
                    flags: {
                        'boolean-flag': {
                            allocationKey: 'allocation',
                            variationKey: 'on',
                            variationType: 'boolean',
                            variationValue: true,
                            reason: 'TARGETING_MATCH',
                            doLog: true
                        },
                        'string-flag': {
                            allocationKey: 'allocation',
                            variationKey: 'greeting',
                            variationType: 'string',
                            variationValue: 'hello',
                            reason: 'STATIC',
                            doLog: false
                        },
                        'number-flag': {
                            allocationKey: 'allocation',
                            variationKey: 'amount',
                            variationType: 'number',
                            variationValue: 3.14,
                            reason: 'STATIC',
                            doLog: false
                        },
                        'object-flag': {
                            allocationKey: 'allocation',
                            variationKey: 'settings',
                            variationType: 'object',
                            variationValue: {
                                nested: { enabled: true },
                                list: [1, 2]
                            },
                            reason: 'STATIC',
                            doLog: false
                        }
                    }
                }
            }
        }
    }
});
