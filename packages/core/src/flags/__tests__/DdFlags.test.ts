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
            assignmentRequestTimeoutMs: 2500,
            assignmentRequestRetryCount: 3,
            trackExposures: false,
            rumIntegrationEnabled: false
        });

        expect(NativeModules.DdFlags.enable).toHaveBeenCalledWith({
            enabled: true,
            customExposureEndpoint: 'https://example.com',
            customFlagsEndpoint: 'https://example.com',
            assignmentRequestTimeoutMs: 2500,
            assignmentRequestRetryCount: 3,
            trackExposures: false,
            rumIntegrationEnabled: false
        });
    });

    it('should preserve an omitted assignment request timeout', async () => {
        await DdFlags.enable({ assignmentRequestRetryCount: 2 });

        expect(NativeModules.DdFlags.enable).toHaveBeenCalledWith({
            enabled: true,
            assignmentRequestRetryCount: 2
        });
    });

    it('should forward zero values that disable assignment request limits', async () => {
        await DdFlags.enable({
            assignmentRequestTimeoutMs: 0,
            assignmentRequestRetryCount: 0
        });

        expect(NativeModules.DdFlags.enable).toHaveBeenCalledWith({
            enabled: true,
            assignmentRequestTimeoutMs: 0,
            assignmentRequestRetryCount: 0
        });
    });

    it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
        'should reject invalid assignmentRequestTimeoutMs value %s',
        async assignmentRequestTimeoutMs => {
            await expect(
                DdFlags.enable({ assignmentRequestTimeoutMs })
            ).rejects.toThrow(
                '`assignmentRequestTimeoutMs` must be a non-negative integer.'
            );

            expect(NativeModules.DdFlags.enable).not.toHaveBeenCalled();
        }
    );

    it.each([-1, 11, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
        'should reject invalid assignmentRequestRetryCount value %s',
        async assignmentRequestRetryCount => {
            await expect(
                DdFlags.enable({ assignmentRequestRetryCount })
            ).rejects.toThrow(
                '`assignmentRequestRetryCount` must be an integer between 0 and 10.'
            );

            expect(NativeModules.DdFlags.enable).not.toHaveBeenCalled();
        }
    );

    it('should print an error when trying to retrieve a client before DdFlags.enable() has been called', async () => {
        DdFlags.getClient();

        expect(InternalLog.log).toHaveBeenCalledWith(
            '`DdFlags.getClient()` called before Datadog Flags feature have been enabled. Client will fall back to serving default flag values.',
            SdkVerbosity.ERROR
        );
    });
});
