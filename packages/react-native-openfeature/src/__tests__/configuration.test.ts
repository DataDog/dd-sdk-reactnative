/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ParsedFlagsConfiguration } from '@datadog/mobile-react-native';
import type { EvaluationContext } from '@openfeature/web-sdk';

import { getPrecomputedContext } from '../configuration';

const configurationWithContext = (
    context?: EvaluationContext
): ParsedFlagsConfiguration => {
    return {
        precomputed: {
            response: {
                data: {
                    attributes: {
                        createdAt: '2026-08-05T00:00:00.000Z',
                        flags: {}
                    }
                }
            },
            ...(context === undefined ? {} : { context })
        }
    };
};

describe('getPrecomputedContext', () => {
    it('returns the context from a precomputed configuration', () => {
        const configuration = configurationWithContext({
            targetingKey: 'user-1',
            country: 'US'
        });

        expect(getPrecomputedContext(configuration)).toEqual({
            targetingKey: 'user-1',
            country: 'US'
        });
    });

    it('preserves an explicit empty context and an empty targeting key', () => {
        expect(getPrecomputedContext(configurationWithContext({}))).toEqual({});
        expect(
            getPrecomputedContext(
                configurationWithContext({ targetingKey: '' })
            )
        ).toEqual({ targetingKey: '' });
    });

    it('returns a deep copy of the context', () => {
        const date = new Date('2026-08-05T00:00:00.000Z');
        const configuration = configurationWithContext({
            targetingKey: 'user-1',
            profile: {
                groups: ['beta', { name: 'mobile' }],
                enrolledAt: date
            }
        });

        const first = getPrecomputedContext(configuration) as EvaluationContext;
        const firstProfile = first.profile as {
            groups: Array<string | { name: string }>;
            enrolledAt: Date;
        };
        firstProfile.groups[1] = { name: 'changed' };
        firstProfile.enrolledAt.setUTCFullYear(2030);

        const second = getPrecomputedContext(configuration);
        expect(second).toEqual({
            targetingKey: 'user-1',
            profile: {
                groups: ['beta', { name: 'mobile' }],
                enrolledAt: date
            }
        });
        expect(second).not.toBe(first);
        expect((second?.profile as { groups: unknown[] }).groups).not.toBe(
            firstProfile.groups
        );
        expect((second?.profile as { enrolledAt: Date }).enrolledAt).not.toBe(
            date
        );
    });

    it.each([
        ['an empty configuration', {}],
        ['a rules-only configuration', { rulesBased: { response: {} } }],
        [
            'an invalid precomputed branch with valid rules',
            {
                precomputedError: new Error('invalid precomputed branch'),
                rulesBased: { response: {} }
            }
        ]
    ])('returns undefined for %s', (_name, configuration) => {
        expect(
            getPrecomputedContext(configuration as ParsedFlagsConfiguration)
        ).toBeUndefined();
    });

    it('returns undefined for context-agnostic precomputed configuration', () => {
        expect(
            getPrecomputedContext(configurationWithContext())
        ).toBeUndefined();
    });

    it('returns the precomputed context from a mixed configuration', () => {
        const configuration = {
            ...configurationWithContext({ targetingKey: 'user-1' }),
            rulesBased: { response: {} }
        } as ParsedFlagsConfiguration;

        expect(getPrecomputedContext(configuration)).toEqual({
            targetingKey: 'user-1'
        });
    });
});
