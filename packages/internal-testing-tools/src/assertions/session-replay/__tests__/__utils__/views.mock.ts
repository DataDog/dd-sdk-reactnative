/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { RumViewEvent } from 'rum-events-format';

export const mockRumViewForSessionReplay = ({
    name,
    id
}: {
    name: string;
    id: string;
}): RumViewEvent => {
    return {
        type: 'view',
        view: {
            name,
            id
        }
    } as RumViewEvent;
};
