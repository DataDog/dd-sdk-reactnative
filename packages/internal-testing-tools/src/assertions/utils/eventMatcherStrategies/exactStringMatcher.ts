import type { DDEvent } from '../../../types/events';

import type { EventMatcherStrategy } from './eventMatcherStrategy';

export const exactStringMatcherBuilder = <EventType extends DDEvent>(
    expected: string | undefined,
    getActualValueFromEvent: (event: EventType) => string | undefined
): EventMatcherStrategy<EventType> => {
    return {
        runMatcher: event => {
            if (expected !== undefined) {
                if (getActualValueFromEvent(event) !== expected) {
                    return false;
                }
            }
            return true;
        },
        formatExpectedValueForErrorMessage: () => {
            if (expected === undefined) {
                return '';
            }
            return expected;
        }
    };
};
