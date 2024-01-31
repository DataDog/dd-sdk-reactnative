import type { DDEvent } from '../../../types/events';

import type { EventMatcherStrategy } from './eventMatcherStrategy';

export type Duration = {
    minMs: number;
    maxMs: number;
};

export const durationMatcherBuilder = <EventType extends DDEvent>(
    expected: Duration | undefined,
    getActualValueFromEvent: (event: EventType) => number | undefined
): EventMatcherStrategy<EventType> => {
    return {
        runMatcher: event => {
            if (expected !== undefined) {
                const actualDuration = getActualValueFromEvent(event);
                if (
                    actualDuration === undefined ||
                    actualDuration < expected.minMs ||
                    actualDuration > expected.maxMs
                ) {
                    return false;
                }
            }
            return true;
        },
        formatExpectedValueForErrorMessage: () => {
            if (expected === undefined) {
                return '';
            }
            return `min: ${expected.minMs} max: ${expected.maxMs}`;
        }
    };
};
