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

    describe('setConfiguration', () => {
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
            context?: Record<string, unknown>
        ) =>
            configurationFromString(
                JSON.stringify({
                    version: 1,
                    precomputed: {
                        response: JSON.stringify({
                            data: { attributes: { obfuscated: false, flags } }
                        }),
                        context
                    }
                })
            );

        it('serves flags from the configuration without a native fetch', () => {
            const flagsClient = DdFlags.getClient();

            flagsClient.setConfiguration(
                buildConfig(offlineFlags, {
                    targetingKey: 'user-1',
                    country: 'US'
                })
            );

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

        it('ignores a differing explicit context, serving the snapshot and warning', async () => {
            const flagsClient = DdFlags.getClient();
            await flagsClient.setEvaluationContext({
                targetingKey: 'user-1',
                attributes: { country: 'US' }
            });

            flagsClient.setConfiguration(
                buildConfig(offlineFlags, {
                    targetingKey: 'user-2',
                    country: 'US'
                })
            );

            // Offline precomputed is single-subject: the differing context is ignored and
            // the snapshot is served for its embedded context, with a warning.
            expect(flagsClient.getBooleanValue('offline-bool', false)).toBe(
                true
            );
            expect(InternalLog.log).toHaveBeenCalledWith(
                expect.stringContaining('Ignoring the evaluation context'),
                expect.anything()
            );
        });

        it('returns PROVIDER_NOT_READY for an empty/invalid configuration', () => {
            const flagsClient = DdFlags.getClient();

            flagsClient.setConfiguration(configurationFromString('garbage'));

            expect(
                flagsClient.getBooleanDetails('offline-bool', false)
            ).toMatchObject({
                value: false,
                reason: 'ERROR',
                errorCode: 'PROVIDER_NOT_READY'
            });
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
    });

    describe('setEvaluationContextWithoutFetching', () => {
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

        const buildConfig = (context: Record<string, unknown>) =>
            configurationFromString(
                JSON.stringify({
                    version: 1,
                    precomputed: {
                        response: JSON.stringify({
                            data: {
                                attributes: {
                                    obfuscated: false,
                                    flags: offlineFlags
                                }
                            }
                        }),
                        context
                    }
                })
            );

        it('reconciles a loaded config against the context without fetching', () => {
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(
                buildConfig({ targetingKey: 'user-1', country: 'US' })
            );

            flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: 'user-1',
                attributes: { country: 'US' }
            });

            expect(flagsClient.getBooleanValue('offline-bool', false)).toBe(
                true
            );
            expect(
                NativeModules.DdFlags.setEvaluationContext
            ).not.toHaveBeenCalled();
        });

        it('ignores a differing context change, still serving without fetching', () => {
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(
                buildConfig({ targetingKey: 'user-1', country: 'US' })
            );

            flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: 'user-2',
                attributes: { country: 'US' }
            });

            // The differing context is ignored (offline never fetches) and the snapshot is
            // still served for its embedded context, with a warning.
            expect(flagsClient.getBooleanValue('offline-bool', false)).toBe(
                true
            );
            expect(InternalLog.log).toHaveBeenCalledWith(
                expect.stringContaining('Ignoring the evaluation context'),
                expect.anything()
            );
            expect(
                NativeModules.DdFlags.setEvaluationContext
            ).not.toHaveBeenCalled();
        });

        it('attributes exposures to the embedded context when a differing context is ignored', () => {
            const flagsClient = DdFlags.getClient();
            flagsClient.setConfiguration(
                buildConfig({ targetingKey: 'user-1', country: 'US' })
            );

            flagsClient.setEvaluationContextWithoutFetching({
                targetingKey: 'user-2',
                attributes: { country: 'US' }
            });

            flagsClient.getBooleanValue('offline-bool', false);

            // The exposure is attributed to the snapshot's embedded context (user-1), not
            // the ignored runtime context (user-2).
            expect(NativeModules.DdFlags.trackEvaluation).toHaveBeenCalledWith(
                expect.any(String),
                'offline-bool',
                expect.any(Object),
                'user-1',
                expect.objectContaining({ country: 'US' })
            );
        });
    });
});
