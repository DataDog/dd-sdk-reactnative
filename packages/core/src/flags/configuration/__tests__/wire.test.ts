/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ParsedFlagsConfiguration } from '../types';
import { configurationFromString, configurationToString } from '../wire';

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

    it('does not populate a precomputed branch from a server-only wire (MVP)', () => {
        const wire = JSON.stringify({
            version: 1,
            server: { response: '{}' }
        });

        const config = configurationFromString(wire);
        expect(config.precomputed).toBeUndefined();
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
