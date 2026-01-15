/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../SdkVerbosity';
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

    it('should always call the native enable method with enabled set to true', async () => {
        await DdFlags.enable();

        expect(NativeModules.DdFlags.enable).toHaveBeenCalledWith({
            enabled: true
        });
    });

    it('should call the native enable method with the correct configuration', async () => {
        await DdFlags.enable({
            customExposureEndpoint: 'https://example.com',
            customFlagsEndpoint: 'https://example.com',
            trackExposures: false,
            rumIntegrationEnabled: false
        });

        expect(NativeModules.DdFlags.enable).toHaveBeenCalledWith({
            enabled: true,
            customExposureEndpoint: 'https://example.com',
            customFlagsEndpoint: 'https://example.com',
            trackExposures: false,
            rumIntegrationEnabled: false
        });
    });

    it('should print an error when trying to retrieve a client before DdFlags.enable() was called', async () => {
        DdFlags.getClient();

        expect(InternalLog.log).toHaveBeenCalledWith(
            '`DdFlags.getClient()` called before Datadog Flags feature have been enabled. Client will fall back to serving default flag values.',
            SdkVerbosity.ERROR
        );
    });
});
