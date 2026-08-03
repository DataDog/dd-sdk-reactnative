/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../config/types/SdkVerbosity';
import { DdFlags } from '../DdFlags';
import { buildRulesConfiguration } from '../configuration/__tests__/__utils__/rulesTestUtils';
import {
    flaggingCoreRulesEngine,
    getNoopRulesLogger
} from '../configuration/rules';
import type {
    RulesEvaluationDetails,
    RulesEvaluationRequest,
    RulesValueType
} from '../configuration/rules';
import { configurationFromString } from '../configuration';

jest.spyOn(NativeModules.DdFlags, 'setEvaluationContext').mockResolvedValue({
    'test-boolean-flag': {
        key: 'test-boolean-flag',
        value: true,
        allocationKey: '',
        variationKey: 'true',
        reason: 'STATIC',
        doLog: true,
        // Internal fields for Android.
        variationType: '',
        variationValue: '',
        extraLogging: {}
    },
    'test-string-flag': {
        key: 'test-string-flag',
        value: 'hello world',
        allocationKey: '',
        variationKey: 'Hello World',
        reason: 'STATIC',
        doLog: true,
        // Internal fields for Android.
        variationType: '',
        variationValue: '',
        extraLogging: {}
    },
    'test-number-flag': {
        key: 'test-number-flag',
        value: 42,
        allocationKey: '',
        variationKey: '42',
        reason: 'STATIC',
        doLog: true,
        // Internal fields for Android.
        variationType: '',
        variationValue: '',
        extraLogging: {}
    },
    'test-object-flag': {
        key: 'test-object-flag',
        value: { greeting: 'Greeting from the native side!' },
        allocationKey: '',
        variationKey: 'Native Greeting',
        reason: 'STATIC',
        doLog: true,
        // Internal fields for Android.
        variationType: '',
        variationValue: '',
        extraLogging: {}
    }
});

jest.mock('../../InternalLog', () => {
    return {
        InternalLog: { log: jest.fn() },
        DATADOG_MESSAGE_PREFIX: 'DATADOG:'
    };
});

describe('FlagsClient', () => {
    beforeEach(async () => {
        jest.clearAllMocks();

        // Reset state of the global DdFlags instance.
        Object.assign(DdFlags, {
            isFeatureEnabled: false,
            clients: {}
        });

        await DdFlags.enable();
    });

    describe('setEvaluationContext', () => {
        it('should set the evaluation context', async () => {
            const flagsClient = DdFlags.getClient();
            await flagsClient.setEvaluationContext({
                targetingKey: 'test-user-1',
                attributes: { country: 'US' }
            });

            expect(
                NativeModules.DdFlags.setEvaluationContext
            ).toHaveBeenCalledWith('default', 'test-user-1', { country: 'US' });
        });

        it('should throw an error if there is an error setting the evaluation context', async () => {
            NativeModules.DdFlags.setEvaluationContext.mockRejectedValueOnce(
                new Error(
                    "A network error occurred while fetching feature flags for client 'default'."
                )
            );

            const flagsClient = DdFlags.getClient();

            await expect(
                flagsClient.setEvaluationContext({
                    targetingKey: 'test-user-1',
                    attributes: { country: 'US' }
                })
            ).rejects.toThrow(
                "A network error occurred while fetching feature flags for client 'default'."
            );

            expect(InternalLog.log).toHaveBeenCalledWith(
                "Error setting flag evaluation context: A network error occurred while fetching feature flags for client 'default'.",
                SdkVerbosity.WARN
            );
        });

        it('clears a prior offline error status on a successful fetch', async () => {
            const flagsClient = DdFlags.getClient();

            // An offline op with no configuration loaded leaves the client in an error status.
            flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: 'test-user-1',
                attributes: {}
            });
            expect(
                flagsClient.getBooleanDetails('test-boolean-flag', false)
            ).toMatchObject({ errorCode: 'PROVIDER_NOT_READY' });

            // A successful online fetch is authoritative and must serve the fetched flags rather
            // than keep returning coded defaults from the stale error status.
            await flagsClient.setEvaluationContext({
                targetingKey: 'test-user-1',
                attributes: {}
            });
            expect(
                flagsClient.getBooleanValue('test-boolean-flag', false)
            ).toBe(true);
        });
    });

    describe('getDetails', () => {
        it('should succesfully return flag details for flags', async () => {
            // Flag values are mocked in the __mocks__/react-native.ts file.
            const flagsClient = DdFlags.getClient();
            await flagsClient.setEvaluationContext({
                targetingKey: 'test-user-1',
                attributes: { country: 'US' }
            });

            const booleanDetails = flagsClient.getBooleanDetails(
                'test-boolean-flag',
                false
            );
            const stringDetails = flagsClient.getStringDetails(
                'test-string-flag',
                'Default value'
            );
            const numberDetails = flagsClient.getNumberDetails(
                'test-number-flag',
                -2
            );
            const objectDetails = flagsClient.getObjectDetails(
                'test-object-flag',
                { greeting: 'Default value' }
            );

            expect(booleanDetails).toMatchObject({
                value: true,
                variant: 'true',
                reason: 'STATIC'
            });
            expect(stringDetails).toMatchObject({
                value: 'hello world',
                variant: 'Hello World',
                reason: 'STATIC'
            });
            expect(numberDetails).toMatchObject({
                value: 42,
                variant: '42',
                reason: 'STATIC'
            });
            expect(objectDetails).toMatchObject({
                value: { greeting: 'Greeting from the native side!' },
                variant: 'Native Greeting',
                reason: 'STATIC'
            });
        });

        it('should return PROVIDER_NOT_READY if evaluation context is not set', () => {
            const flagsClient = DdFlags.getClient();
            // Skip `setEvaluationContext` call here.

            const details = flagsClient.getBooleanDetails(
                'test-boolean-flag',
                false
            );

            expect(details).toMatchObject({
                value: false,
                reason: 'ERROR',
                errorCode: 'PROVIDER_NOT_READY',
                errorMessage: expect.stringContaining(
                    'The evaluation context is not set'
                )
            });
        });

        it('should return FLAG_NOT_FOUND if flag is missing from context', async () => {
            const flagsClient = DdFlags.getClient();
            await flagsClient.setEvaluationContext({
                targetingKey: 'test-user-1',
                attributes: { country: 'US' }
            });

            // 'unknown-flag' is not defined in the __mocks__/react-native.ts
            const details = flagsClient.getBooleanDetails(
                'unknown-flag',
                false
            );

            expect(details).toMatchObject({
                value: false,
                reason: 'ERROR',
                errorCode: 'FLAG_NOT_FOUND'
            });
        });

        it('should return TYPE_MISMATCH when using wrong typed accessor method', async () => {
            // Flag values are mocked in the __mocks__/react-native.ts file.
            const flagsClient = DdFlags.getClient();
            await flagsClient.setEvaluationContext({
                targetingKey: 'test-user-1',
                attributes: { country: 'US' }
            });

            // Call getStringDetails on a boolean flag.
            const booleanFlagAsString = flagsClient.getStringDetails(
                'test-boolean-flag',
                'default'
            );
            // Call getBooleanDetails on a string flag.
            const stringFlagAsBoolean = flagsClient.getBooleanDetails(
                'test-string-flag',
                false
            );
            // Call getStringDetails on a number flag.
            const numberFlagAsString = flagsClient.getStringDetails(
                'test-number-flag',
                'default'
            );

            expect(booleanFlagAsString).toMatchObject({
                key: 'test-boolean-flag',
                value: 'default',
                errorCode: 'TYPE_MISMATCH',
                reason: 'ERROR',
                errorMessage: expect.stringContaining('boolean')
            });
            expect(stringFlagAsBoolean).toMatchObject({
                key: 'test-string-flag',
                value: false,
                errorCode: 'TYPE_MISMATCH',
                reason: 'ERROR',
                errorMessage: expect.stringContaining('string')
            });
            expect(numberFlagAsString).toMatchObject({
                key: 'test-number-flag',
                value: 'default',
                errorCode: 'TYPE_MISMATCH',
                reason: 'ERROR',
                errorMessage: expect.stringContaining('number')
            });
        });
    });

    describe('getValue', () => {
        it('should succesfully return flag values', async () => {
            // Flag values are mocked in the __mocks__/react-native.ts file.
            const flagsClient = DdFlags.getClient();
            await flagsClient.setEvaluationContext({
                targetingKey: 'test-user-1',
                attributes: { country: 'US' }
            });

            const booleanValue = flagsClient.getBooleanValue(
                'test-boolean-flag',
                false
            );
            const stringValue = flagsClient.getStringValue(
                'test-string-flag',
                'Default value'
            );
            const numberValue = flagsClient.getNumberValue(
                'test-number-flag',
                -2
            );
            const objectValue = flagsClient.getObjectValue('test-object-flag', {
                greeting: 'Default value'
            });

            expect(booleanValue).toBe(true);
            expect(stringValue).toBe('hello world');
            expect(numberValue).toBe(42);
            expect(objectValue).toStrictEqual({
                greeting: 'Greeting from the native side!'
            });
        });

        it('should return the default value when using wrong typed accessor method', async () => {
            // Flag values are mocked in the __mocks__/react-native.ts file.
            const flagsClient = DdFlags.getClient();
            await flagsClient.setEvaluationContext({
                targetingKey: 'test-user-1',
                attributes: { country: 'US' }
            });

            // Call getStringValue on a boolean flag.
            const booleanFlagAsString = flagsClient.getStringValue(
                'test-boolean-flag',
                'default'
            );
            // Call getBooleanValue on a string flag.
            const stringFlagAsBoolean = flagsClient.getBooleanValue(
                'test-string-flag',
                false
            );
            // Call getStringValue on a number flag.
            const numberFlagAsString = flagsClient.getStringValue(
                'test-number-flag',
                'default'
            );

            // The default value is returned due to TYPE_MISMATCH.
            expect(booleanFlagAsString).toBe('default');
            expect(stringFlagAsBoolean).toBe(false);
            expect(numberFlagAsString).toBe('default');
        });
    });

    const offlineFlags = {
        'offline-bool': {
            variationType: 'boolean',
            variationValue: true,
            variationKey: 'true',
            allocationKey: 'alloc-1',
            reason: 'STATIC',
            doLog: false,
            extraLogging: {}
        }
    };

    const buildConfig = (
        flags: Record<string, unknown>,
        context?: Record<string, unknown>,
        obfuscated = false
    ) =>
        configurationFromString(
            JSON.stringify({
                version: 1,
                precomputed: {
                    response: JSON.stringify({
                        data: { attributes: { obfuscated, flags } }
                    }),
                    context
                }
            })
        );

    // These builders exercise the temporary `rulesBased` shim from the complete
    // portable JSON envelope. They do not model the external UFC service transport.
    const buildRulesConfig = (
        rulesResponse: unknown = buildRulesConfiguration()
    ) =>
        configurationFromString(
            JSON.stringify({
                version: 1,
                rulesBased: {
                    response: JSON.stringify(rulesResponse)
                }
            })
        );

    const buildMixedConfig = (
        context: Record<string, unknown>,
        rulesResponse: unknown = buildRulesConfiguration(),
        precomputedResponse: unknown = {
            data: {
                attributes: {
                    obfuscated: false,
                    flags: offlineFlags
                }
            }
        }
    ) =>
        configurationFromString(
            JSON.stringify({
                version: 1,
                precomputed: {
                    response: JSON.stringify(precomputedResponse),
                    context
                },
                rulesBased: {
                    response: JSON.stringify(rulesResponse)
                }
            })
        );

    // Client tests use this fake to control non-assignment and error results
    // independently of flagging-core integration vectors.
    const installFakeRulesEngine = (
        implementation: (
            request: RulesEvaluationRequest<RulesValueType>
        ) => RulesEvaluationDetails<unknown>
    ) => {
        return jest
            .spyOn(flaggingCoreRulesEngine, 'evaluate')
            .mockImplementation(implementation as never);
    };

    describe('setConfiguration', () => {
        it('serves flags from the configuration without a native fetch', () => {
            const flagsClient = DdFlags.getClient();

            const result = flagsClient.setConfiguration(
                buildConfig(offlineFlags, {
                    targetingKey: 'user-1',
                    country: 'US'
                })
            );

            expect(result).toEqual({ status: 'ready' });
            expect(flagsClient.getBooleanValue('offline-bool', false)).toBe(
                true
            );
            expect(
                NativeModules.DdFlags.setEvaluationContext
            ).not.toHaveBeenCalled();
        });

        it('serves flags when an explicit matching context was set first', async () => {
            const flagsClient = DdFlags.getClient();
            await flagsClient.setEvaluationContext({
                targetingKey: 'user-1',
                attributes: { country: 'US' }
            });

            flagsClient.setConfiguration(
                buildConfig(offlineFlags, {
                    targetingKey: 'user-1',
                    country: 'US'
                })
            );

            expect(flagsClient.getBooleanValue('offline-bool', false)).toBe(
                true
            );
        });

        it('errors with INVALID_CONTEXT and serves defaults when an explicit context differs', async () => {
            const flagsClient = DdFlags.getClient();
            await flagsClient.setEvaluationContext({
                targetingKey: 'user-1',
                attributes: { country: 'US' }
            });

            const result = flagsClient.setConfiguration(
                buildConfig(offlineFlags, {
                    targetingKey: 'user-2',
                    country: 'US'
                })
            );

            // Offline precomputed is single-subject: a differing context cannot be served, so
            // it is an error and evaluation returns the coded default with INVALID_CONTEXT.
            expect(result).toEqual({
                status: 'error',
                errorCode: 'INVALID_CONTEXT'
            });
            expect(
                flagsClient.getBooleanDetails('offline-bool', false)
            ).toMatchObject({
                value: false,
                reason: 'ERROR',
                errorCode: 'INVALID_CONTEXT'
            });
            // No exposure is tracked while serving defaults.
            expect(
                NativeModules.DdFlags.trackEvaluation
            ).not.toHaveBeenCalled();
        });

        it('errors with GENERAL for an empty/unparseable configuration', () => {
            const flagsClient = DdFlags.getClient();

            const result = flagsClient.setConfiguration(
                configurationFromString('garbage')
            );

            expect(result).toEqual({ status: 'error', errorCode: 'GENERAL' });
            expect(
                flagsClient.getBooleanDetails('offline-bool', false)
            ).toMatchObject({
                value: false,
                reason: 'ERROR',
                errorCode: 'GENERAL'
            });
        });

        it('errors with GENERAL for an unsupported (obfuscated) configuration', () => {
            const flagsClient = DdFlags.getClient();

            const result = flagsClient.setConfiguration(
                buildConfig(offlineFlags, { targetingKey: 'user-1' }, true)
            );

            expect(result).toEqual({ status: 'error', errorCode: 'GENERAL' });
            expect(
                flagsClient.getBooleanDetails('offline-bool', false)
            ).toMatchObject({ errorCode: 'GENERAL' });
        });

        it('errors with GENERAL for a structurally malformed response envelope', () => {
            const flagsClient = DdFlags.getClient();

            // A wire whose precomputed response omits `data.attributes.flags` entirely.
            const wire = JSON.stringify({
                version: 1,
                precomputed: {
                    response: JSON.stringify({ data: { attributes: {} } }),
                    context: { targetingKey: 'user-1' }
                }
            });

            const result = flagsClient.setConfiguration(
                configurationFromString(wire)
            );

            expect(result).toEqual({ status: 'error', errorCode: 'GENERAL' });
            expect(
                flagsClient.getBooleanDetails('offline-bool', false)
            ).toMatchObject({ value: false, errorCode: 'GENERAL' });
        });

        it('serves a context-agnostic configuration (no embedded context)', () => {
            const flagsClient = DdFlags.getClient();

            flagsClient.setConfiguration(buildConfig(offlineFlags));

            expect(flagsClient.getBooleanValue('offline-bool', false)).toBe(
                true
            );
            expect(
                NativeModules.DdFlags.setEvaluationContext
            ).not.toHaveBeenCalled();
        });

        it('serves the coded default with TYPE_MISMATCH for a primitive-valued object flag', () => {
            const flagsClient = DdFlags.getClient();

            // The decoder accepts any JSON value for an `object` flag, but evaluation requires an
            // object. A primitive value (only possible from a malformed/hand-crafted wire, never a
            // real Datadog config) is therefore served the coded default with TYPE_MISMATCH.
            flagsClient.setConfiguration(
                buildConfig(
                    {
                        'json-primitive': {
                            variationType: 'object',
                            variationValue: 'not-an-object',
                            variationKey: 'primitive',
                            allocationKey: 'alloc-1',
                            reason: 'STATIC',
                            doLog: false,
                            extraLogging: {}
                        }
                    },
                    { targetingKey: 'user-1' }
                )
            );

            expect(
                flagsClient.getObjectDetails('json-primitive', {
                    fallback: true
                })
            ).toMatchObject({
                value: { fallback: true },
                reason: 'ERROR',
                errorCode: 'TYPE_MISMATCH'
            });
        });

        it('replaces a previously loaded configuration', () => {
            const flagsClient = DdFlags.getClient();

            flagsClient.setConfiguration(
                buildConfig(
                    { 'flag-a': offlineFlags['offline-bool'] },
                    { targetingKey: 'user-1' }
                )
            );
            expect(flagsClient.getBooleanValue('flag-a', false)).toBe(true);

            flagsClient.setConfiguration(
                buildConfig(
                    { 'flag-b': offlineFlags['offline-bool'] },
                    { targetingKey: 'user-1' }
                )
            );

            expect(
                flagsClient.getBooleanDetails('flag-a', false)
            ).toMatchObject({ errorCode: 'FLAG_NOT_FOUND' });
            expect(flagsClient.getBooleanValue('flag-b', false)).toBe(true);
        });

        it('replaces a snapshot for one subject with a snapshot for another (no external context)', () => {
            const flagsClient = DdFlags.getClient();

            // Load A for user-1 — no external context is set, so A's embedded context is adopted.
            expect(
                flagsClient.setConfiguration(
                    buildConfig(
                        { 'flag-a': offlineFlags['offline-bool'] },
                        { targetingKey: 'user-1' }
                    )
                )
            ).toEqual({ status: 'ready' });

            // Replace with B for a DIFFERENT subject. Because the app never set an external
            // context, this must adopt B's embedded context and stay ready — not error as a
            // mismatch against A's adopted context.
            expect(
                flagsClient.setConfiguration(
                    buildConfig(
                        { 'flag-b': offlineFlags['offline-bool'] },
                        { targetingKey: 'user-2' }
                    )
                )
            ).toEqual({ status: 'ready' });
            expect(flagsClient.getBooleanValue('flag-b', false)).toBe(true);
            expect(
                flagsClient.getBooleanDetails('flag-a', false)
            ).toMatchObject({ errorCode: 'FLAG_NOT_FOUND' });

            // The exposure must be attributed to B's embedded context (user-2), not A's — a
            // regression that updated the flags but kept A's context would misattribute here.
            expect(NativeModules.DdFlags.trackEvaluation).toHaveBeenCalledWith(
                'default',
                'flag-b',
                expect.any(Object),
                'user-2',
                {}
            );
        });

        it('adopts a subject-bound snapshot loaded after a context-agnostic one (no external context)', () => {
            const flagsClient = DdFlags.getClient();

            flagsClient.setConfiguration(buildConfig(offlineFlags));
            expect(flagsClient.getBooleanValue('offline-bool', false)).toBe(
                true
            );

            expect(
                flagsClient.setConfiguration(
                    buildConfig(
                        { 'flag-b': offlineFlags['offline-bool'] },
                        { targetingKey: 'user-2' }
                    )
                )
            ).toEqual({ status: 'ready' });
            expect(flagsClient.getBooleanValue('flag-b', false)).toBe(true);
        });

        it('does not resurrect a prior valid snapshot after an invalid replacement', () => {
            const flagsClient = DdFlags.getClient();

            // Valid A.
            flagsClient.setConfiguration(
                buildConfig(offlineFlags, { targetingKey: 'user-1' })
            );
            expect(flagsClient.getBooleanValue('offline-bool', false)).toBe(
                true
            );

            // Invalid replacement.
            expect(
                flagsClient.setConfiguration(configurationFromString('garbage'))
            ).toEqual({ status: 'error', errorCode: 'GENERAL' });

            // A later context change must NOT promote the invalid load back to ready.
            const afterContextChange = flagsClient.setEvaluationContextWithoutFetching(
                { targetingKey: 'user-1', attributes: {} }
            );
            expect(afterContextChange).toEqual({
                status: 'error',
                errorCode: 'GENERAL'
            });
            expect(
                flagsClient.getBooleanDetails('offline-bool', false)
            ).toMatchObject({ value: false, errorCode: 'GENERAL' });

            // A valid replacement recovers.
            expect(
                flagsClient.setConfiguration(
                    buildConfig(offlineFlags, { targetingKey: 'user-1' })
                )
            ).toEqual({ status: 'ready' });
            expect(flagsClient.getBooleanValue('offline-bool', false)).toBe(
                true
            );
        });

        it('is superseded by a later native fetch', async () => {
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(
                buildConfig(offlineFlags, {
                    targetingKey: 'user-1',
                    country: 'US'
                })
            );

            // A subsequent explicit context fetch replaces the offline configuration
            // with the native snapshot (mocked in __mocks__/react-native.ts + above).
            await flagsClient.setEvaluationContext({
                targetingKey: 'user-1',
                attributes: { country: 'US' }
            });

            expect(
                flagsClient.getBooleanDetails('offline-bool', false)
            ).toMatchObject({ errorCode: 'FLAG_NOT_FOUND' });
            expect(
                flagsClient.getBooleanValue('test-boolean-flag', false)
            ).toBe(true);
        });

        it('drops the offline overlay when entering online mode, serving defaults if the fetch fails', async () => {
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(
                buildConfig(offlineFlags, { targetingKey: 'user-1' })
            );
            expect(flagsClient.getBooleanValue('offline-bool', false)).toBe(
                true
            );

            NativeModules.DdFlags.setEvaluationContext.mockRejectedValueOnce(
                new Error('network down')
            );
            await expect(
                flagsClient.setEvaluationContext({
                    targetingKey: 'user-1',
                    attributes: {}
                })
            ).rejects.toThrow('network down');

            // Using one client for both modes is unsupported: the online fetch discards the offline
            // overlay up front and warns, so a failed fetch serves coded defaults rather than the
            // stale offline snapshot.
            expect(flagsClient.getBooleanValue('offline-bool', false)).toBe(
                false
            );
            expect(InternalLog.log).toHaveBeenCalledWith(
                expect.stringContaining('online fetch was requested'),
                expect.anything()
            );
        });
    });

    describe('setEvaluationContextWithoutFetching', () => {
        it('reconciles a loaded config against a matching context without fetching', () => {
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(
                buildConfig(offlineFlags, {
                    targetingKey: 'user-1',
                    country: 'US'
                })
            );

            const result = flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: 'user-1',
                attributes: { country: 'US' }
            });

            expect(result).toEqual({ status: 'ready' });
            expect(flagsClient.getBooleanValue('offline-bool', false)).toBe(
                true
            );
            expect(
                NativeModules.DdFlags.setEvaluationContext
            ).not.toHaveBeenCalled();
        });

        it('errors with INVALID_CONTEXT on a differing context change, serving defaults', () => {
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(
                buildConfig(offlineFlags, {
                    targetingKey: 'user-1',
                    country: 'US'
                })
            );

            const result = flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: 'user-2',
                attributes: { country: 'US' }
            });

            expect(result).toEqual({
                status: 'error',
                errorCode: 'INVALID_CONTEXT'
            });
            expect(
                flagsClient.getBooleanDetails('offline-bool', false)
            ).toMatchObject({ value: false, errorCode: 'INVALID_CONTEXT' });
            expect(
                NativeModules.DdFlags.setEvaluationContext
            ).not.toHaveBeenCalled();
            // Defaults are served, so no exposure is tracked.
            expect(
                NativeModules.DdFlags.trackEvaluation
            ).not.toHaveBeenCalled();
        });

        it('stores an empty context as an explicit override', () => {
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(
                buildConfig(offlineFlags, { targetingKey: 'user-1' })
            );

            const result = flagsClient.setEvaluationContextWithoutFetching({
                attributes: {}
            } as never);

            expect(result).toEqual({
                status: 'error',
                errorCode: 'INVALID_CONTEXT'
            });

            // Reloading the snapshot reconciles against the stored empty override. It does not
            // silently restore the snapshot's embedded user-1 context.
            expect(
                flagsClient.setConfiguration(
                    buildConfig(offlineFlags, { targetingKey: 'user-1' })
                )
            ).toEqual({
                status: 'error',
                errorCode: 'INVALID_CONTEXT'
            });
        });

        it('recovers to ready when a matching context is set after a mismatch', () => {
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(
                buildConfig(offlineFlags, { targetingKey: 'user-1' })
            );

            flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: 'user-2',
                attributes: {}
            });
            expect(
                flagsClient.getBooleanDetails('offline-bool', false)
            ).toMatchObject({ errorCode: 'INVALID_CONTEXT' });

            const recovered = flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: 'user-1',
                attributes: {}
            });

            expect(recovered).toEqual({ status: 'ready' });
            expect(flagsClient.getBooleanValue('offline-bool', false)).toBe(
                true
            );
        });

        it('returns PROVIDER_NOT_READY (not FLAG_NOT_FOUND) with no configuration loaded', () => {
            const flagsClient = DdFlags.getClient();

            const result = flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: 'user-1',
                attributes: {}
            });

            expect(result).toEqual({
                status: 'error',
                errorCode: 'PROVIDER_NOT_READY'
            });
            expect(
                flagsClient.getBooleanDetails('offline-bool', false)
            ).toMatchObject({
                value: false,
                reason: 'ERROR',
                errorCode: 'PROVIDER_NOT_READY'
            });
        });

        it('treats an empty-string targeting key as a real (anonymous) subject that must match', () => {
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(
                buildConfig(offlineFlags, { targetingKey: 'user-1' })
            );

            // An empty string is a distinct (anonymous) subject, not "no context": it must match the
            // snapshot's subject. Against a user-1 snapshot it does not, so this errors rather than
            // silently serving user-1's flags to an anonymous subject.
            const result = flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: '',
                attributes: {}
            });

            expect(result).toEqual({
                status: 'error',
                errorCode: 'INVALID_CONTEXT'
            });
        });
    });

    describe('resetEvaluationContextWithoutFetching', () => {
        it('re-adopts the embedded context, recovering from a mismatch', () => {
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(
                buildConfig(offlineFlags, { targetingKey: 'user-1' })
            );

            flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: 'user-2',
                attributes: {}
            });
            expect(
                flagsClient.getBooleanDetails('offline-bool', false)
            ).toMatchObject({ errorCode: 'INVALID_CONTEXT' });

            const result = flagsClient.resetEvaluationContextWithoutFetching();

            expect(result).toEqual({ status: 'ready' });
            expect(flagsClient.getBooleanValue('offline-bool', false)).toBe(
                true
            );
        });

        it('clears the override so a config loaded after reset adopts its embedded context', () => {
            const flagsClient = DdFlags.getClient();

            // No config yet, an external context is set, then cleared.
            flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: 'user-2',
                attributes: {}
            });
            flagsClient.resetEvaluationContextWithoutFetching();

            // Loading A now adopts A's embedded context (not the stale user-2 override).
            const result = flagsClient.setConfiguration(
                buildConfig(offlineFlags, { targetingKey: 'user-1' })
            );

            expect(result).toEqual({ status: 'ready' });
            expect(flagsClient.getBooleanValue('offline-bool', false)).toBe(
                true
            );
        });

        it('clears the override after an invalid load so a later valid load is ready', () => {
            const flagsClient = DdFlags.getClient();

            flagsClient.setConfiguration(configurationFromString('garbage'));
            flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: 'user-2',
                attributes: {}
            });
            flagsClient.resetEvaluationContextWithoutFetching();

            const result = flagsClient.setConfiguration(
                buildConfig(offlineFlags, { targetingKey: 'user-1' })
            );

            expect(result).toEqual({ status: 'ready' });
            expect(flagsClient.getBooleanValue('offline-bool', false)).toBe(
                true
            );
        });

        it('returns PROVIDER_NOT_READY with no configuration loaded', () => {
            const flagsClient = DdFlags.getClient();

            expect(
                flagsClient.resetEvaluationContextWithoutFetching()
            ).toEqual({ status: 'error', errorCode: 'PROVIDER_NOT_READY' });
        });
    });

    describe('dynamic offline rules', () => {
        it('loads rules and evaluates a new context without fetching', () => {
            const flagsClient = DdFlags.getClient();

            expect(flagsClient.setConfiguration(buildRulesConfig())).toEqual({
                status: 'ready'
            });

            expect(
                flagsClient.setEvaluationContextWithoutFetching({
                    targetingKey: 'user-1',
                    attributes: { country: 'US' }
                })
            ).toEqual({ status: 'ready' });
            expect(flagsClient.getBooleanValue('dynamic-flag', false)).toBe(
                true
            );

            expect(
                flagsClient.setEvaluationContextWithoutFetching({
                    targetingKey: 'user-2',
                    attributes: { country: 'CA' }
                })
            ).toEqual({ status: 'ready' });
            expect(flagsClient.getBooleanValue('dynamic-flag', false)).toBe(
                false
            );
            expect(
                NativeModules.DdFlags.setEvaluationContext
            ).not.toHaveBeenCalled();
        });

        it('does not replace a missing targeting key with an empty key', () => {
            const evaluate = installFakeRulesEngine(request => ({
                value: request.defaultValue,
                reason: 'DEFAULT',
                metadata: {}
            }));
            const flagsClient = DdFlags.getClient();

            flagsClient.setConfiguration(buildRulesConfig());
            flagsClient.getBooleanValue('dynamic-flag', false);

            expect(evaluate.mock.calls[0][0].context).toHaveProperty(
                'targetingKey',
                undefined
            );
        });

        it('uses matching precomputed data before rules data', () => {
            const evaluate = jest.spyOn(flaggingCoreRulesEngine, 'evaluate');
            const flagsClient = DdFlags.getClient();
            flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: 'user-1',
                attributes: {}
            });

            expect(
                flagsClient.setConfiguration(
                    buildMixedConfig({ targetingKey: 'user-1' })
                )
            ).toEqual({ status: 'ready' });
            expect(flagsClient.getBooleanValue('offline-bool', false)).toBe(
                true
            );
            expect(evaluate).not.toHaveBeenCalled();

            evaluate.mockRestore();
        });

        it('uses rules after a precomputed context mismatch', () => {
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(
                buildMixedConfig({ targetingKey: 'user-1' })
            );

            expect(
                flagsClient.setEvaluationContextWithoutFetching({
                    targetingKey: 'user-2',
                    attributes: { country: 'US' }
                })
            ).toEqual({ status: 'ready' });
            expect(flagsClient.getBooleanValue('dynamic-flag', false)).toBe(
                true
            );
            expect(
                flagsClient.getBooleanDetails('offline-bool', false)
            ).toMatchObject({ errorCode: 'FLAG_NOT_FOUND' });
        });

        it('keeps matching precomputed data when rules are invalid', () => {
            const flagsClient = DdFlags.getClient();
            flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: 'user-1',
                attributes: {}
            });

            expect(
                flagsClient.setConfiguration(
                    buildMixedConfig({ targetingKey: 'user-1' }, {})
                )
            ).toEqual({ status: 'ready' });
            expect(flagsClient.getBooleanValue('offline-bool', false)).toBe(
                true
            );
        });

        it('returns GENERAL when mismatched precomputed data falls through to invalid rules', () => {
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(
                buildMixedConfig({ targetingKey: 'user-1' }, {})
            );

            expect(
                flagsClient.setEvaluationContextWithoutFetching({
                    targetingKey: 'user-2',
                    attributes: {}
                })
            ).toEqual({ status: 'error', errorCode: 'GENERAL' });
            expect(
                flagsClient.getBooleanDetails('offline-bool', false)
            ).toMatchObject({ value: false, errorCode: 'GENERAL' });
        });

        it('keeps valid rules when the precomputed branch is invalid', () => {
            const flagsClient = DdFlags.getClient();

            expect(
                flagsClient.setConfiguration(
                    buildMixedConfig(
                        { targetingKey: 'user-1' },
                        buildRulesConfiguration(),
                        { data: { attributes: {} } }
                    )
                )
            ).toEqual({ status: 'ready' });
            flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: 'user-2',
                attributes: { country: 'US' }
            });

            expect(flagsClient.getBooleanValue('dynamic-flag', false)).toBe(
                true
            );
        });

        it('keeps valid rules instead of applying combined precomputedError precedence', () => {
            const configuration = buildRulesConfig() as ReturnType<
                typeof buildRulesConfig
            > & {
                precomputedError?: string;
            };
            configuration.precomputedError =
                'Invalid precomputed configuration wire entry';

            const flagsClient = DdFlags.getClient();

            expect(flagsClient.setConfiguration(configuration)).toEqual({
                status: 'ready'
            });
            flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: 'user-1',
                attributes: { country: 'US' }
            });
            expect(flagsClient.getBooleanValue('dynamic-flag', false)).toBe(
                true
            );
        });

        it('preserves a matching precomputed flag error before rules fallback', () => {
            const configuration = buildMixedConfig({
                targetingKey: 'user-1'
            }) as ReturnType<typeof buildMixedConfig> & {
                precomputed?: {
                    flagErrors?: Record<string, string>;
                };
            };
            if (!configuration.precomputed) {
                throw new Error('The fixture has no precomputed branch.');
            }
            configuration.precomputed.flagErrors = {
                'offline-bool': 'Invalid precomputed flag configuration'
            };
            const evaluate = jest.spyOn(flaggingCoreRulesEngine, 'evaluate');
            const flagsClient = DdFlags.getClient();

            expect(flagsClient.setConfiguration(configuration)).toEqual({
                status: 'ready'
            });
            expect(
                flagsClient.getBooleanDetails('offline-bool', false)
            ).toMatchObject({
                value: false,
                reason: 'ERROR',
                errorCode: 'PARSE_ERROR',
                errorMessage: 'Invalid precomputed flag configuration'
            });
            expect(evaluate).not.toHaveBeenCalled();
            expect(
                NativeModules.DdFlags.trackEvaluation
            ).not.toHaveBeenCalled();

            evaluate.mockRestore();
        });

        it('selects the path again for a per-resolution context', () => {
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(
                buildMixedConfig({ targetingKey: 'user-1' })
            );

            const details = flagsClient.getDetailsForContext(
                'dynamic-flag',
                false,
                'boolean',
                {
                    targetingKey: 'user-2',
                    attributes: { country: 'US' }
                },
                getNoopRulesLogger()
            );

            expect(details).toMatchObject({
                value: true,
                variant: 'enabled',
                allocationKey: 'allocation-1'
            });
        });

        it('tracks each real rules assignment even when doLog is false', () => {
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(buildRulesConfig());
            flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: 'user-1',
                attributes: { country: 'US' }
            });

            expect(flagsClient.getBooleanValue('dynamic-flag', false)).toBe(
                true
            );
            expect(NativeModules.DdFlags.trackEvaluation).toHaveBeenCalledWith(
                'default',
                'dynamic-flag',
                expect.objectContaining({
                    allocationKey: 'allocation-1',
                    variationKey: 'enabled',
                    variationType: 'boolean',
                    variationValue: 'true',
                    doLog: false,
                    extraLogging: {}
                }),
                'user-1',
                { country: 'US' }
            );
        });

        it.each([
            ['INTEGER', 42],
            ['NUMERIC', 1.5]
        ] as const)(
            'tracks %s assignments with number metadata',
            (variationType, variationValue) => {
                const configuration = buildRulesConfiguration();
                const flag = configuration.flags['dynamic-flag'];
                flag.variationType = variationType;
                flag.variations.enabled.value = variationValue;
                flag.variations.disabled.value = 0;

                const flagsClient = DdFlags.getClient();
                flagsClient.setConfiguration(buildRulesConfig(configuration));
                flagsClient.setEvaluationContextWithoutFetching({
                    targetingKey: 'user-1',
                    attributes: { country: 'US' }
                });

                expect(flagsClient.getNumberValue('dynamic-flag', 0)).toBe(
                    variationValue
                );
                expect(
                    NativeModules.DdFlags.trackEvaluation
                ).toHaveBeenCalledWith(
                    'default',
                    'dynamic-flag',
                    expect.objectContaining({
                        variationType: 'number',
                        variationValue: String(variationValue)
                    }),
                    'user-1',
                    { country: 'US' }
                );
            }
        );

        it('tracks a DEFAULT result that contains a real assignment', () => {
            const evaluate = installFakeRulesEngine(() => ({
                value: true,
                reason: 'DEFAULT',
                variant: 'default-variant',
                metadata: {
                    allocationKey: 'default-allocation',
                    variationType: 'boolean',
                    doLog: false
                }
            }));
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(buildRulesConfig());
            flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: 'user-1',
                attributes: {}
            });

            expect(flagsClient.getBooleanValue('dynamic-flag', false)).toBe(
                true
            );
            expect(NativeModules.DdFlags.trackEvaluation).toHaveBeenCalledWith(
                'default',
                'dynamic-flag',
                expect.objectContaining({
                    allocationKey: 'default-allocation',
                    variationKey: 'default-variant',
                    reason: 'DEFAULT'
                }),
                'user-1',
                {}
            );

            evaluate.mockRestore();
        });

        it('does not track an unmatched DEFAULT result', () => {
            const evaluate = installFakeRulesEngine(request => ({
                value: request.defaultValue,
                reason: 'DEFAULT',
                metadata: {}
            }));
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(buildRulesConfig());
            flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: 'user-1',
                attributes: {}
            });

            expect(flagsClient.getBooleanValue('dynamic-flag', false)).toBe(
                false
            );
            expect(
                NativeModules.DdFlags.trackEvaluation
            ).not.toHaveBeenCalled();

            evaluate.mockRestore();
        });

        it('preserves an upstream unsafe-integer PARSE_ERROR and does not track it', () => {
            const evaluate = installFakeRulesEngine(request => ({
                value: request.defaultValue,
                reason: 'ERROR',
                variant: 'invalid-variant',
                errorCode: 'PARSE_ERROR',
                errorMessage:
                    'Integer variation value cannot be represented safely as a JavaScript number',
                metadata: {
                    allocationKey: 'invalid-allocation',
                    variationType: 'number',
                    doLog: true
                }
            }));
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(buildRulesConfig());

            expect(
                flagsClient.getNumberDetails('dynamic-flag', 0)
            ).toMatchObject({
                value: 0,
                reason: 'ERROR',
                errorCode: 'PARSE_ERROR',
                errorMessage:
                    'Integer variation value cannot be represented safely as a JavaScript number'
            });
            expect(
                NativeModules.DdFlags.trackEvaluation
            ).not.toHaveBeenCalled();

            evaluate.mockRestore();
        });

        it('preserves an unsupported-feature-level PARSE_ERROR and does not track it', () => {
            const evaluate = installFakeRulesEngine(request => ({
                value: request.defaultValue,
                reason: 'ERROR',
                errorCode: 'PARSE_ERROR',
                errorMessage: 'Flag requires an unsupported feature level',
                metadata: {}
            }));
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(buildRulesConfig());

            expect(
                flagsClient.getBooleanDetails('dynamic-flag', false)
            ).toMatchObject({
                value: false,
                reason: 'ERROR',
                errorCode: 'PARSE_ERROR',
                errorMessage: 'Flag requires an unsupported feature level'
            });
            expect(
                NativeModules.DdFlags.trackEvaluation
            ).not.toHaveBeenCalled();

            evaluate.mockRestore();
        });

        it('maps an unknown engine error to GENERAL', () => {
            const evaluate = installFakeRulesEngine(request => ({
                value: request.defaultValue,
                reason: 'ERROR',
                errorCode: 'FUTURE_ERROR',
                metadata: {}
            }));
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(buildRulesConfig());

            expect(
                flagsClient.getBooleanDetails('dynamic-flag', false)
            ).toMatchObject({
                value: false,
                reason: 'ERROR',
                errorCode: 'GENERAL'
            });

            evaluate.mockRestore();
        });
    });
});
