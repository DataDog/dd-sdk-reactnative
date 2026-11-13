/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    patchCoreRumResourceTracking,
    trackInternalResource
} from '../src/InternalResourceTracking';

describe('InternalResourceTracking', () => {
    it('suppresses SDK-owned resources by exact URL and resource key', async () => {
        const startResource = jest.fn().mockResolvedValue(undefined);
        const stopResource = jest.fn().mockResolvedValue(undefined);
        const rum = { startResource, stopResource };
        patchCoreRumResourceTracking(rum);

        const url = 'https://proxy.example.com/upload';
        const stopTracking = trackInternalResource(url);

        await rum.startResource('sdk-resource', 'POST', url);
        await rum.stopResource('sdk-resource', 202, 'xhr');
        await rum.startResource(
            'customer-resource',
            'GET',
            'https://api.example.com/data'
        );
        await rum.stopResource('customer-resource', 200, 'xhr');

        stopTracking();

        expect(startResource).toHaveBeenCalledTimes(1);
        expect(startResource).toHaveBeenCalledWith(
            'customer-resource',
            'GET',
            'https://api.example.com/data',
            undefined,
            undefined
        );
        expect(stopResource).toHaveBeenCalledTimes(1);
        expect(stopResource).toHaveBeenCalledWith(
            'customer-resource',
            200,
            'xhr',
            undefined,
            undefined,
            undefined,
            undefined
        );
    });

    it('forwards the same URL after the SDK upload completes', async () => {
        const startResource = jest.fn().mockResolvedValue(undefined);
        const rum = {
            startResource,
            stopResource: jest.fn().mockResolvedValue(undefined)
        };
        patchCoreRumResourceTracking(rum);

        const url = 'https://browser-intake-datadoghq.com/api/v2/rum';
        const stopTracking = trackInternalResource(url);
        stopTracking();

        await rum.startResource('customer-resource', 'POST', url);

        expect(startResource).toHaveBeenCalled();
    });
});
