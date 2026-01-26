/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../config/types/SdkVerbosity';
import { DdFlags } from '../DdFlags';

jest.mock('../../InternalLog', () => {
    return {
        InternalLog: {
            log: jest.fn()
        },
        DATADOG_MESSAGE_PREFIX: 'DATADOG:'
    };
});

describe('DdFlags', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset state of DdFlags instance.
        Object.assign(DdFlags, {
            isFeatureEnabled: false,
            clients: {}
        });
    });

    describe('Initialization', () => {
        it('should print an error if calling DdFlags.enable() for multiple times', async () => {
            await DdFlags.enable();
            await DdFlags.enable();
            await DdFlags.enable();

            expect(InternalLog.log).toHaveBeenCalledTimes(2);
            // We let the native part of the SDK handle this gracefully.
            expect(NativeModules.DdFlags.enable).toHaveBeenCalledTimes(3);
        });

        it('should print an error if retrieving the client before the feature is enabled', async () => {
            DdFlags.getClient();

            expect(InternalLog.log).toHaveBeenCalledWith(
                '`DdFlags.getClient()` called before Datadog Flags feature have been enabled. Client will fall back to serving default flag values.',
                SdkVerbosity.ERROR
            );
        });

        it('should not print an error if retrieving the client after the feature is enabled', async () => {
            await DdFlags.enable();
            DdFlags.getClient();

            expect(InternalLog.log).not.toHaveBeenCalled();
        });
    });
});
