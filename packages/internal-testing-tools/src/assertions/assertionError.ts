import type { DDEvent } from '../types/events';

export class AssertionError extends Error {
    constructor(
        message: string,
        expected: string,
        actual: string | undefined,
        events: DDEvent[]
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
