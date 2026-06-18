/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../config/types/SdkVerbosity';
import { DdFlags } from '../DdFlags';

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
    },
    'test-flag-with-alloc-key': {
        key: 'test-flag-with-alloc-key',
        value: true,
        allocationKey: 'alloc-abc',
        variationKey: 'true',
        reason: 'TARGETED',
        doLog: true,
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

        it('should populate allocationKey in details', async () => {
            const flagsClient = DdFlags.getClient();
            await flagsClient.setEvaluationContext({
                targetingKey: 'test-user-1',
                attributes: { country: 'US' }
            });

            const details = flagsClient.getBooleanDetails(
                'test-flag-with-alloc-key',
                false
            );

            expect(details.allocationKey).toBe('alloc-abc');
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
});
