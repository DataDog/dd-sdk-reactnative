/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../SdkVerbosity';
import { BufferSingleton } from '../../sdk/DatadogProvider/Buffer/BufferSingleton';
import { DatadogFlags } from '../DatadogFlags';

jest.mock('../../InternalLog', () => {
    return {
        InternalLog: {
            log: jest.fn()
        },
        DATADOG_MESSAGE_PREFIX: 'DATADOG:'
    };
});

describe('FlagsClient', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        BufferSingleton.onInitialization();

        await DatadogFlags.enable({ enabled: true });
    });

    describe('setEvaluationContext', () => {
        it('should set the evaluation context', async () => {
            const flagsClient = DatadogFlags.getClient();
            await flagsClient.setEvaluationContext({
                targetingKey: 'test-user-1',
                attributes: {
                    country: 'US'
                }
            });

            expect(
                NativeModules.DdFlags.setEvaluationContext
            ).toHaveBeenCalledWith('default', 'test-user-1', { country: 'US' });
        });

        it('should print an error if there is an error', async () => {
            NativeModules.DdFlags.setEvaluationContext.mockRejectedValue(
                new Error('NETWORK_ERROR')
            );

            const flagsClient = DatadogFlags.getClient();
            await flagsClient.setEvaluationContext({
                targetingKey: 'test-user-1',
                attributes: {
                    country: 'US'
                }
            });

            expect(InternalLog.log).toHaveBeenCalledWith(
                'Error setting flag evaluation context: NETWORK_ERROR',
                SdkVerbosity.ERROR
            );
        });
    });

    describe('getBooleanDetails', () => {
        it('should fail the validation if the default value is not valid', async () => {
            const flagsClient = DatadogFlags.getClient();
            const details = await flagsClient.getBooleanDetails(
                'test-boolean-flag',
                // @ts-expect-error - we want to test the validation
                'true'
            );

            expect(details).toMatchObject({
                value: 'true', // The default value is passed through.
                error: 'TYPE_MISMATCH',
                reason: null,
                variant: null
            });
        });

        it('should fetch the boolean details from native side', async () => {
            const flagsClient = DatadogFlags.getClient();
            const details = await flagsClient.getBooleanDetails(
                'test-boolean-flag',
                true
            );

            expect(details).toMatchObject({
                value: true,
                variant: 'true',
                reason: 'STATIC',
                error: null
            });
        });
    });

    describe('getStringDetails', () => {
        it('should fail the validation if the default value is not valid', async () => {
            const flagsClient = DatadogFlags.getClient();
            const details = await flagsClient.getStringDetails(
                'test-string-flag',
                // @ts-expect-error - we want to test the validation
                true
            );

            expect(details).toMatchObject({
                value: true, // The default value is passed through.
                error: 'TYPE_MISMATCH',
                reason: null,
                variant: null
            });
        });

        it('should fetch the string details from native side', async () => {
            const flagsClient = DatadogFlags.getClient();
            const details = await flagsClient.getStringDetails(
                'test-string-flag',
                'hello world'
            );

            expect(details).toMatchObject({
                value: 'hello world',
                variant: 'hello world',
                reason: 'STATIC',
                error: null
            });
        });
    });

    describe('getNumberDetails', () => {
        it('should fail the validation if the default value is not valid', async () => {
            const flagsClient = DatadogFlags.getClient();
            const details = await flagsClient.getNumberDetails(
                'test-number-flag',
                // @ts-expect-error - we want to test the validation
                'hello world'
            );

            expect(details).toMatchObject({
                value: 'hello world', // The default value is passed through.
                error: 'TYPE_MISMATCH',
                reason: null,
                variant: null
            });
        });

        it('should fetch the number details from native side', async () => {
            const flagsClient = DatadogFlags.getClient();
            const details = await flagsClient.getNumberDetails(
                'test-number-flag',
                6
            );

            expect(details).toMatchObject({
                value: 6,
                variant: '6',
                reason: 'STATIC',
                error: null
            });
        });
    });

    describe('getObjectDetails', () => {
        it('should fail the validation if the default value is not valid', async () => {
            const flagsClient = DatadogFlags.getClient();
            const details = await flagsClient.getObjectDetails(
                'test-object-flag',
                // @ts-expect-error - we want to test the validation
                'hello world'
            );

            expect(details).toMatchObject({
                value: 'hello world', // The default value is passed through.
                error: 'TYPE_MISMATCH',
                reason: null,
                variant: null
            });
        });

        it('should fetch the object details from native side', async () => {
            const flagsClient = DatadogFlags.getClient();
            const details = await flagsClient.getObjectDetails(
                'test-object-flag',
                { hello: 'world' }
            );

            expect(details).toMatchObject({
                value: { hello: 'world' },
                variant: 'hello world',
                reason: 'STATIC',
                error: null
            });
        });
    });
});
