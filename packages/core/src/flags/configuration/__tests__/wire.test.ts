/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ParsedFlagsConfiguration } from '../types';
import { configurationFromString, configurationToString } from '../wire';

import { buildRulesConfiguration } from './__utils__/rulesTestUtils';

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
                    doLog: false,
                    extraLogging: {}
                },
                'num-flag': {
                    variationType: 'number',
                    variationValue: 1.5,
                    variationKey: '1.5',
                    allocationKey: 'alloc-2',
                    reason: 'STATIC',
                    doLog: true,
                    extraLogging: {}
                },
                'obj-flag': {
                    variationType: 'object',
                    variationValue: { nested: { a: 1 }, list: [1, 2] },
                    variationKey: 'obj',
                    allocationKey: 'alloc-3',
                    reason: 'TARGETING_MATCH',
                    doLog: false,
                    extraLogging: { extra: 'x' }
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

        expect(config.precomputed).toBeDefined();
        expect(config.precomputed?.context).toEqual({
            targetingKey: 'user-1',
            country: 'US'
        });
        expect(config.precomputed?.fetchedAt).toBe(1748449320785);
        // The inner `response` string is parsed into an object.
        expect(
            config.precomputed?.response.data.attributes.flags['a-flag']
                .variationValue
        ).toBe(true);
    });

    it('returns an empty config for an unsupported version', () => {
        const wire = JSON.stringify({
            version: 2,
            precomputed: { response: JSON.stringify(buildResponse()) }
        });

        expect(configurationFromString(wire)).toEqual({});
    });

    it('returns an empty config for invalid JSON', () => {
        expect(configurationFromString('not json')).toEqual({});
    });

    it('does not treat a raw protobuf response as a portable wire', () => {
        // A service or distribution layer must put one base64 encoding of
        // these bytes in a version 1 `rules.response` JSON envelope.
        const rawProtobufAsBase64 = 'CgR0ZXN0';

        expect(configurationFromString(rawProtobufAsBase64)).toEqual({});
    });

    it('does not treat the legacy UFC JSON response as a portable wire', () => {
        const legacyServiceResponse = JSON.stringify(buildRulesConfiguration());

        expect(configurationFromString(legacyServiceResponse)).toEqual({});
    });

    it('returns an empty config when the inner response is invalid JSON', () => {
        const wire = JSON.stringify({
            version: 1,
            precomputed: { response: '{ not json' }
        });

        expect(configurationFromString(wire)).toEqual({});
    });

    it('returns a config with no precomputed branch when none is present', () => {
        const wire = JSON.stringify({ version: 1 });

        expect(configurationFromString(wire)).toEqual({});
    });
});

describe('configurationToString round-trip', () => {
    it('round-trips a precomputed configuration', () => {
        const original = configurationFromString(buildWire());

        const restored = configurationFromString(
            configurationToString(original)
        );

        expect(restored).toEqual(original);
    });

    it('serializes an empty configuration to a v1 wire', () => {
        const empty: ParsedFlagsConfiguration = {};

        expect(configurationToString(empty)).toBe(
            JSON.stringify({ version: 1 })
        );
    });
});

describe('temporary rules configuration wire compatibility', () => {
    it('parses a legacy rules configuration', () => {
        const rulesBased = {
            response: buildRulesConfiguration(),
            fetchedAt: 123,
            etag: 'rules-etag'
        };
        const wire = JSON.stringify({
            version: 1,
            rulesBased: {
                ...rulesBased,
                response: JSON.stringify(rulesBased.response)
            }
        });

        const parsed = configurationFromString(wire) as {
            rulesBased?: typeof rulesBased;
        };

        expect(parsed.rulesBased).toEqual(rulesBased);
    });

    it('does not serialize a rules configuration', () => {
        const configuration = {
            rulesBased: {
                response: buildRulesConfiguration()
            }
        };

        expect(() =>
            configurationToString(
                (configuration as unknown) as ParsedFlagsConfiguration
            )
        ).toThrow(
            'Rules configurations cannot be serialized to the wire format'
        );
    });

    it('keeps both branches in a mixed configuration', () => {
        const mixedWire = buildWire({
            rulesBased: {
                response: JSON.stringify(buildRulesConfiguration())
            }
        });

        const parsed = configurationFromString(mixedWire) as {
            precomputed?: unknown;
            rulesBased?: unknown;
        };

        expect(parsed.precomputed).toBeDefined();
        expect(parsed.rulesBased).toBeDefined();
    });

    it('keeps a valid precomputed branch when rules JSON is malformed', () => {
        const parsed = configurationFromString(
            buildWire({
                rulesBased: { response: '{' }
            })
        ) as {
            precomputed?: unknown;
            rulesBased?: unknown;
        };

        expect(parsed.precomputed).toBeDefined();
        expect(parsed.rulesBased).toBeUndefined();
    });
});
