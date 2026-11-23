/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { ErrorCode } from '@openfeature/web-sdk';

import type { FlagsConfigurationWire } from '../index';
import * as root from '../index';
import type { FlagsConfigurationWire as RulesWire } from '../rules-based';
import * as rules from '../rules-based';

import {
    matchingContext,
    precomputedConfiguration,
    rulesConfiguration
} from './__utils__/coreConfiguration';
import {
    encodedConfiguration,
    encodedFlagKey
} from './__utils__/encodedConfiguration';

jest.mock('../../../core/src/specs/NativeDdFlags', () => ({
    __esModule: true,
    getNativeDdFlags: jest.fn().mockReturnValue({
        enable: jest.fn(() => Promise.resolve()),
        setEvaluationContext: jest.fn(() => Promise.resolve({})),
        trackEvaluation: jest.fn(() => Promise.resolve())
    })
}));

const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

describe.each([
    ['root', root],
    ['rules-based', rules]
] as const)('%s portable configuration helpers', (_name, entry) => {
    it.each([
        [1, precomputedConfiguration],
        [2, encodedConfiguration]
    ] as const)(
        'round-trips v%i with context and retrieval metadata',
        (version, make) => {
            const configuration = make();
            Object.assign(configuration.precomputed, {
                fetchedAt: 123456,
                etag: 'snapshot-etag'
            });
            const wire: FlagsConfigurationWire = entry.configurationToString(
                configuration
            );
            const compatibleWire: RulesWire = wire;
            expect(JSON.parse(wire).version).toBe(version);
            const parsed = entry.configurationFromString(compatibleWire);
            expect(parsed).toEqual(configuration);
            expect(entry.getPrecomputedContext(parsed)).toEqual(
                matchingContext
            );
            expect(entry.configurationToString(parsed)).toBe(wire);
        }
    );

    it('returns a deeply detached context and leaves provider state unchanged', () => {
        const configuration = precomputedConfiguration();
        configuration.precomputed.context = {
            ...configuration.precomputed.context,
            nested: { values: ['original'] },
            date: new Date('2026-01-01T00:00:00Z')
        };
        const provider = new rules.DatadogCoreProvider();
        provider.setConfiguration(configuration);
        const context = entry.getPrecomputedContext(configuration);
        if (!context) {
            throw new Error('Missing fixture context');
        }
        context.targetingKey = 'changed';
        (context.nested as { values: string[] }).values.push('changed');
        (context.date as Date).setUTCFullYear(2030);
        expect(
            entry.getPrecomputedContext(provider.getConfiguration() ?? {})
        ).toEqual({
            ...matchingContext,
            nested: { values: ['original'] },
            date: new Date('2026-01-01T00:00:00Z')
        });
        expect(entry.getPrecomputedContext({})).toBeUndefined();
        expect(
            entry.getPrecomputedContext(rulesConfiguration())
        ).toBeUndefined();
    });

    it.each(['{', 'null', '{"version":3}', '{"version":2,"precomputed":{}}'])(
        'reports malformed or unknown wire: %s',
        wire => {
            const parsed = entry.configurationFromString(wire);
            expect(parsed.precomputed).toBeUndefined();
            expect(
                parsed.configurationError ?? parsed.precomputedError
            ).toEqual(expect.any(String));
        }
    );

    it.each(['missing createdAt', 'null targetingKey'])(
        'validates hand-built plaintext envelopes and contexts: %s',
        invalidField => {
            const configuration = precomputedConfiguration();
            if (invalidField === 'missing createdAt') {
                Object.assign(
                    configuration.precomputed.response.data.attributes,
                    {
                        createdAt: undefined
                    }
                );
            } else {
                Object.assign(configuration.precomputed, {
                    context: { targetingKey: null }
                });
            }

            const parsed = entry.configurationFromString(
                entry.configurationToString(configuration)
            );
            expect(parsed.precomputed).toBeUndefined();
            expect(parsed.precomputedError).toEqual(expect.any(String));
        }
    );

    it('isolates a plaintext object flag with a primitive value', async () => {
        const configuration = precomputedConfiguration();
        configuration.precomputed.response.data.attributes.flags[
            'object-flag'
        ].variationValue = 42;
        const parsed = entry.configurationFromString(
            entry.configurationToString(configuration)
        );
        expect(parsed.precomputed?.flagErrors?.['object-flag']).toEqual(
            expect.any(String)
        );
        const provider = new rules.DatadogCoreProvider();
        provider.setConfiguration(parsed);
        await provider.initialize(matchingContext);
        expect(
            provider.resolveObjectEvaluation(
                'object-flag',
                {},
                matchingContext,
                logger
            )
        ).toMatchObject({ value: {}, errorCode: ErrorCode.PARSE_ERROR });
        expect(
            provider.resolveBooleanEvaluation(
                'boolean-flag',
                false,
                matchingContext,
                logger
            ).value
        ).toBe(true);
    });

    it.each([
        { obfuscated: true, obfuscation: undefined },
        { obfuscated: true, obfuscation: { scheme: 'unknown', salt: '00' } },
        {
            obfuscated: true,
            obfuscation: { scheme: 'flag-key-sha256-v1', salt: 'invalid' }
        },
        { obfuscated: false, obfuscation: { scheme: 'unknown' } }
    ])('rejects malformed/unknown encoding: %j', encoding => {
        const configuration = encodedConfiguration();
        Object.assign(
            configuration.precomputed.response.data.attributes,
            encoding
        );
        const parsed = entry.configurationFromString(
            entry.configurationToString(configuration)
        );
        expect(parsed.precomputed).toBeUndefined();
        expect(parsed.precomputedError).toEqual(expect.any(String));
    });
});

describe('rules-based portable configuration', () => {
    it('keeps the parser alias and tracking factories identical across entries', () => {
        expect(rules.coreConfigurationFromString).toBe(
            rules.configurationFromString
        );
        for (const factory of [
            'createDatadogExposureLoggingHook',
            'fetchPrecomputedConfiguration',
            'createDatadogEvaluationLoggingHook',
            'createDatadogRumTrackingHook',
            'composeDatadogTrackingHooks'
        ] as const) {
            expect(rules[factory]).toBe(root[factory]);
        }
    });

    it.each([precomputedConfiguration, encodedConfiguration])(
        'round-trips mixed configurations, while the root helpers stay precomputed-only',
        async make => {
            const configuration = { ...rulesConfiguration(), ...make() };
            const wire = rules.configurationToString(configuration);
            const parsed = rules.configurationFromString(wire);
            expect(parsed.rules?.etag).toBe('rules-etag');
            expect(rules.configurationToString(parsed)).toBe(wire);
            expect(root.configurationFromString(wire).rules).toBeUndefined();
            expect(
                JSON.parse(root.configurationToString(parsed)).rules
            ).toBeUndefined();

            const provider = new rules.DatadogCoreProvider();
            provider.setConfiguration(parsed);
            await provider.initialize(matchingContext);
            expect(
                provider.resolveBooleanEvaluation(
                    'boolean-flag',
                    false,
                    matchingContext,
                    logger
                ).value
            ).toBe(true);
            const changed = { targetingKey: 'other', country: 'CA' };
            provider.onContextChange(matchingContext, changed);
            expect(
                provider.resolveBooleanEvaluation(
                    'test-flag',
                    true,
                    changed,
                    logger
                )
            ).toMatchObject({ value: false, variant: 'off' });
        }
    );

    it('evaluates v2 through the full core provider with original assignment metadata', async () => {
        const provider = new rules.DatadogCoreProvider();
        provider.setConfiguration(
            rules.configurationFromString(
                rules.configurationToString(encodedConfiguration())
            )
        );
        await provider.initialize(matchingContext);
        expect(
            provider.resolveBooleanEvaluation(
                encodedFlagKey,
                false,
                matchingContext,
                logger
            )
        ).toMatchObject({
            value: true,
            variant: 'on',
            flagMetadata: {
                allocationKey: 'allocation',
                doLog: true,
                __dd_split_serial_id: 42
            }
        });
    });
});
