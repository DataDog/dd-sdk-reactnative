/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ParsedFlagsConfiguration } from '../types';
import { configurationFromString, configurationToString } from '../wire';

import { buildRulesWire, RULES_RESPONSE } from './__utils__/rulesTestUtils';

const RULES_RESPONSE_WITH_UNKNOWN_FIELD =
    'EgRwcm9kGigKDGJyb3dzZXItZmxhZxIYEAQaAigBIhAKCmFsbG9jYXRpb24iAiADKgJvbqAGBw==';

const buildResponse = () => ({
    data: {
        id: '2',
        type: 'precomputed-assignments',
        attributes: {
            obfuscated: false,
            createdAt: '2026-07-06T23:01:56.822171460Z',
            format: 'PRECOMPUTED',
            environment: { name: 'Staging' },
            flags: {
                'a-flag': {
                    variationType: 'boolean',
                    variationValue: true,
                    variationKey: 'true',
                    allocationKey: 'alloc-1',
                    reason: 'STATIC',
                    doLog: false
                }
            }
        }
    }
});

const buildWire = (overrides: Record<string, unknown> = {}) =>
    JSON.stringify({
        version: 1,
        precomputed: {
            response: JSON.stringify(buildResponse()),
            context: { targetingKey: 'user-1', country: 'US' },
            fetchedAt: 1748449320785
        },
        ...overrides
    });

describe('configurationFromString', () => {
    it('parses a valid v1 wire with a precomputed branch', () => {
        const config = configurationFromString(buildWire());

        expect(config.precomputed?.context).toEqual({
            targetingKey: 'user-1',
            country: 'US'
        });
        expect(
            config.precomputed?.response.data.attributes.flags['a-flag']
                .variationValue
        ).toBe(true);
    });

    it.each([JSON.stringify({ version: 2 }), 'not json'])(
        'preserves a configuration error for invalid input',
        wire => {
            expect(configurationFromString(wire)).toEqual({
                configurationError: 'Invalid flags configuration wire format'
            });
        }
    );

    it('does not treat a raw protobuf response as a portable wire', () => {
        expect(configurationFromString(RULES_RESPONSE)).toEqual({
            configurationError: 'Invalid flags configuration wire format'
        });
    });

    it('preserves a precomputed error for invalid response JSON', () => {
        const wire = JSON.stringify({
            version: 1,
            precomputed: { response: '{ not json' }
        });

        expect(configurationFromString(wire)).toEqual({
            precomputedError:
                'Precomputed configuration response is not valid JSON'
        });
    });

    it('returns a config with no capability when none is present', () => {
        expect(configurationFromString(JSON.stringify({ version: 1 }))).toEqual(
            {}
        );
    });
});

describe('configurationToString', () => {
    it('round-trips a precomputed configuration', () => {
        const original = configurationFromString(buildWire());

        expect(
            configurationFromString(configurationToString(original))
        ).toEqual(original);
    });

    it('serializes an empty configuration to a v1 wire', () => {
        const empty: ParsedFlagsConfiguration = {};

        expect(configurationToString(empty)).toBe(
            JSON.stringify({ version: 1 })
        );
    });

    it.each([false, true])(
        'round-trips rules with precomputed=%s',
        includePrecomputed => {
            const rules = configurationFromString(buildRulesWire());
            const original: ParsedFlagsConfiguration = {
                ...(includePrecomputed
                    ? configurationFromString(buildWire())
                    : {}),
                rules: rules.rules
            };

            expect(
                configurationFromString(configurationToString(original))
            ).toEqual(original);
        }
    );

    it('preserves unknown protobuf fields', () => {
        const original = configurationFromString(
            buildRulesWire(RULES_RESPONSE_WITH_UNKNOWN_FIELD)
        );
        const restored = configurationFromString(
            configurationToString(original)
        );

        expect(restored.rules?.response.$unknown).toHaveLength(1);
        expect(restored.rules?.response.$unknown?.[0]).toMatchObject({
            no: 100,
            wireType: 0
        });
        expect(
            Array.from(restored.rules?.response.$unknown?.[0]?.data ?? [])
        ).toEqual([7]);
    });

    it('keeps a valid sibling when the other capability is malformed', () => {
        const precomputed = JSON.parse(buildWire()).precomputed;
        const parsed = configurationFromString(
            JSON.stringify({
                version: 1,
                precomputed,
                rules: { response: 'not base64' }
            })
        );

        expect(parsed.precomputed).toBeDefined();
        expect(parsed.rules).toBeUndefined();
        expect(parsed.rulesError).toBe(
            'Rules configuration response could not be decoded'
        );
    });

    it('parses both capabilities from one wire', () => {
        const precomputed = JSON.parse(buildWire()).precomputed;
        const parsed = configurationFromString(
            JSON.stringify({
                version: 1,
                precomputed,
                rules: { response: RULES_RESPONSE }
            })
        );

        expect(parsed.precomputed).toBeDefined();
        expect(parsed.rules?.response.flags['browser-flag']).toBeDefined();
    });
});
