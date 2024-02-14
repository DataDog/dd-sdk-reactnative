/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { Wireframe } from 'rum-events-format';

import type { DDEvent } from '../types/events';

export class AssertionError extends Error {
    constructor(
        message: string,
        expected: string,
        actual: string | undefined,
        events: DDEvent[] | Wireframe | Wireframe[]
    ) {
        if (actual !== undefined) {
            super(
                `${message}\nExpected: ${expected}\nActual: ${actual}\n\nEvents:\n${JSON.stringify(
                    events
                )}`
            );
        } else {
            super(
                `${message}\nExpected: ${expected}\nEvents:\n${JSON.stringify(
                    events
                )}`
            );
        }
        this.name = 'AssertionError';
    }
}
