/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

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

describe('DatadogFlags', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        BufferSingleton.onInitialization();
    });

    describe('Initialization', () => {
        it('should print an error if retrieving the client before the feature is enabled', async () => {
            DatadogFlags.getClient();

            expect(InternalLog.log).toHaveBeenCalledWith(
                'DatadogFlags.getClient() called before DatadogFlags have been initialized. Flag evaluations will resolve to default values.',
                SdkVerbosity.ERROR
            );
        });

        it('should print an error if retrieving the client if the feature was not enabled on purpose', async () => {
            await DatadogFlags.enable({ enabled: false });
            DatadogFlags.getClient();

            expect(InternalLog.log).toHaveBeenCalledWith(
                'DatadogFlags.getClient() called before DatadogFlags have been initialized. Flag evaluations will resolve to default values.',
                SdkVerbosity.ERROR
            );
        });

        it('should not print an error if retrieving the client after the feature is enabled', async () => {
            await DatadogFlags.enable({ enabled: true });
            DatadogFlags.getClient();

            expect(InternalLog.log).not.toHaveBeenCalled();
        });
    });
});
