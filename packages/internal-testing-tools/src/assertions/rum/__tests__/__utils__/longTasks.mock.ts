/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { RumLongTaskEvent } from 'rum-events-format';

export const mockRumLongTask = ({
    duration,
    thread
}: {
    duration?: number;
    thread?: string;
}): RumLongTaskEvent => {
    return {
        type: 'long_task',
        long_task: {
            duration: duration || 0
        },
        context: {
            'long_task.target': thread
        },
        date: 0,
        application: {
            id: ''
        },
        session: {
            id: '',
            type: 'user'
        },
        view: {
            id: '',
            url: ''
        },
        _dd: {
            format_version: 2
        }
    } as RumLongTaskEvent;
};
