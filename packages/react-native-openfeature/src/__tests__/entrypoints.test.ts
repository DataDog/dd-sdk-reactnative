/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable global-require, @typescript-eslint/no-var-requires */

import * as DatadogSdk from '../../../core/src/index';
import packageJson from '../../package.json';
import * as OpenFeatureSdk from '../index';

jest.mock('../../../core/src/specs/NativeDdFlags', () => ({
    __esModule: true,
    getNativeDdFlags: jest.fn().mockReturnValue({
        enable: jest.fn(() => Promise.resolve()),
        setEvaluationContext: jest.fn(() => Promise.resolve({})),
        trackEvaluation: jest.fn(() => Promise.resolve())
    })
}));

// The rules parser loads Protobuf-ES. Only the `/rules-based` entry may load it.
jest.mock('@datadog/flagging-core/rules-based', () => {
    throw new Error('rules-based parser loaded');
});
jest.mock('@bufbuild/protobuf', () => {
    throw new Error('protobuf loaded');
});
jest.mock('@bufbuild/protobuf/wire', () => {
    throw new Error('protobuf wire loaded');
});
jest.mock('@bufbuild/protobuf/codegenv2', () => {
    throw new Error('protobuf codegen loaded');
});
jest.mock('@bufbuild/protobuf/wkt', () => {
    throw new Error('protobuf well-known types loaded');
});

describe('package entry points', () => {
    it('does not expose independent evaluation logging before native privacy support', () => {
        expect(OpenFeatureSdk).not.toHaveProperty(
            'createDatadogEvaluationLoggingHook'
        );
        expect(DatadogSdk).not.toHaveProperty('__ddTrackFlagEvaluationEvent');
    });

    it('keeps the rules-based parser out of the main entry', () => {
        expect(() =>
            jest.isolateModules(() => {
                const entry = jest.requireActual('../index');
                expect(typeof entry.getClientFingerprint).toBe('function');
                // Pin the real list: new capabilities need React Native decoding and tracking support.
                expect(JSON.parse(entry.getClientFingerprint())).toEqual({
                    version: 1,
                    sdk: {
                        name: 'react-native',
                        version: packageJson.version
                    },
                    capabilities: ['assignment-encoding-flag-key-256-v1']
                });
            })
        ).not.toThrow();
    });

    it('exposes portable, tracking and fingerprint helpers without exposing rules APIs', () => {
        jest.isolateModules(() => {
            const entry = require('../index');
            for (const name of [
                'configurationFromString',
                'configurationToString',
                'getPrecomputedContext',
                'getClientFingerprint',
                'createDatadogExposureLoggingHook',
                'createDatadogRumTrackingHook',
                'composeDatadogTrackingHooks'
            ]) {
                expect(entry[name]).toEqual(expect.any(Function));
            }
            expect(entry.DatadogCoreProvider).toBeUndefined();
            expect(entry.coreConfigurationFromString).toBeUndefined();
        });
    });

    it('imports and evaluates root v2 without TextEncoder or protobuf', async () => {
        const descriptor = Object.getOwnPropertyDescriptor(
            globalThis,
            'TextEncoder'
        );
        Object.defineProperty(globalThis, 'TextEncoder', {
            configurable: true,
            value: undefined
        });
        try {
            let initialized: Promise<void> | undefined;
            jest.isolateModules(() => {
                const { createHash } = require('crypto');
                const entry = require('../index');
                const key = 'checkout-\u00e9-\ud83d\ude80';
                const salt = '00112233445566778899aabbccddeeff';
                const hash = createHash('sha256')
                    .update('datadog.feature-flags.flag-key.v1\0')
                    .update(Buffer.from(salt, 'hex'))
                    .update(key)
                    .digest('hex');
                const wire = JSON.stringify({
                    version: 2,
                    precomputed: {
                        context: { targetingKey: 'user' },
                        response: JSON.stringify({
                            data: {
                                attributes: {
                                    createdAt: '2026-01-01',
                                    obfuscated: true,
                                    obfuscation: {
                                        scheme: 'flag-key-sha256-v1',
                                        salt
                                    },
                                    flags: {
                                        [hash]: {
                                            allocationKey: 'allocation',
                                            variationKey: 'on',
                                            variationType: 'boolean',
                                            variationValue: true,
                                            reason: 'STATIC',
                                            doLog: true,
                                            serialId: 42
                                        }
                                    }
                                }
                            }
                        })
                    }
                });
                const configuration = entry.configurationFromString(wire);
                expect(configuration.precomputed).toBeDefined();
                expect(
                    JSON.parse(entry.configurationToString(configuration))
                        .version
                ).toBe(2);
                expect(entry.getPrecomputedContext(configuration)).toEqual({
                    targetingKey: 'user'
                });
                const provider = new entry.DatadogOfflineOpenFeatureProvider({
                    clientName: 'no-text-encoder'
                });
                provider.setConfiguration(configuration);
                initialized = provider.initialize({});
                expect(
                    provider.resolveBooleanEvaluation(key, false, {}, console)
                ).toMatchObject({
                    value: true,
                    variant: 'on'
                });
            });
            await initialized;
        } finally {
            if (descriptor) {
                Object.defineProperty(globalThis, 'TextEncoder', descriptor);
            } else {
                Reflect.deleteProperty(globalThis, 'TextEncoder');
            }
        }
    });

    it('loads the rules-based parser from the rules-based entry', () => {
        expect(() =>
            jest.isolateModules(() => require('../rules-based'))
        ).toThrow('rules-based parser loaded');
    });
});
