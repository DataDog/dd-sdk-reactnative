/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../config/types/SdkVerbosity';
import { DdFlags } from '../DdFlags';
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
});
