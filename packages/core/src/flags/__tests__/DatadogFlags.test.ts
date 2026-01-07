/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../SdkVerbosity';
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
        // Reset state of DatadogFlags instance.
        Object.assign(DatadogFlags, {
            isFeatureEnabled: false,
            clients: {}
        });
    });

    describe('Initialization', () => {
        it('should print an error if calling DatadogFlags.enable() for multiple times', async () => {
            await DatadogFlags.enable();
            await DatadogFlags.enable();
            await DatadogFlags.enable();

            expect(InternalLog.log).toHaveBeenCalledTimes(2);
            // We let the native part of the SDK handle this gracefully.
            expect(NativeModules.DdFlags.enable).toHaveBeenCalledTimes(3);
        });

        it('should print an error if retrieving the client before the feature is enabled', async () => {
            DatadogFlags.getClient();

            expect(InternalLog.log).toHaveBeenCalledWith(
                '`DatadogFlags.getClient()` called before Datadog Flags feature have been enabled. Client will fall back to serving default flag values.',
                SdkVerbosity.ERROR
            );
        });

        it('should not print an error if retrieving the client after the feature is enabled', async () => {
            await DatadogFlags.enable();
            DatadogFlags.getClient();

            expect(InternalLog.log).not.toHaveBeenCalled();
        });
    });
});
