/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { RUMResource } from '../../../../domain/interfaces/RumResource';

/**
 * This method returns a new object each time to avoid overriding the same object
 */
const getBasicResource = (): RUMResource => ({
    key: 'baseResourceKey',
    request: {
        method: 'GET',
        url: 'https://api.example.com/api/test',
        kind: 'xhr'
    },
    tracingAttributes: {
        tracingStrategy: 'DISCARD',
        samplingPriorityHeader: '0'
    },
    response: {
        statusCode: 200,
        size: 483
    },
    timings: {
        startTime: 1000,
        stopTime: 2000,
        responseStartTime: 1500
    }
});

export class ResourceMockFactory {
    getBasicResource = () => {
        return getBasicResource();
    };

    getCustomResource = (
        partialResource: Partial<RUMResource>
    ): RUMResource => {
        const baseResource = getBasicResource();
        return Object.assign(baseResource, partialResource);
    };
}
