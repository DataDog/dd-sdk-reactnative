/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { RumResourceEvent } from 'rum-events-format';

export const mockRumResource = ({
    method,
    url
}: {
    method?: RumResourceEvent['resource']['method'];
    url?: string;
}): RumResourceEvent => {
    return {
        type: 'resource',
        resource: {
            method: method || 'GET',
            url: url || 'https://datadoghq.com'
        }
    } as RumResourceEvent;
};
