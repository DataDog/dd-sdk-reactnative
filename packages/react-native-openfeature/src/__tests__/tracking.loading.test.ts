/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    createDatadogExposureLoggingHook,
    createDatadogRumTrackingHook
} from '../tracking';

jest.mock('@datadog/mobile-react-native', () => {
    throw new Error('Native SDK could not be loaded');
});

describe('tracking hooks with a failing lazy SDK import', () => {
    afterEach(() => jest.restoreAllMocks());

    it.each([createDatadogExposureLoggingHook, createDatadogRumTrackingHook])(
        'contains an SDK import failure for %p',
        async create => {
            const warn = jest
                .spyOn(console, 'warn')
                .mockImplementation(() => {});
            const tracking = create();

            await expect(tracking.initialize()).resolves.toBeUndefined();
            await expect(tracking.initialize()).resolves.toBeUndefined();
            await expect(tracking.shutdown()).resolves.toBeUndefined();
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn).toHaveBeenCalledWith(
                expect.stringContaining('Tracking hook disabled')
            );
        }
    );
});
