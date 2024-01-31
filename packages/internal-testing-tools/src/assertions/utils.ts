import type { DDEvent } from '../types/events';

import { AssertionError } from './assertionError';
import type { EventMatcherStrategy } from './utils/eventMatcherStrategies/eventMatcherStrategy';

export const findEventsWithMatchers = <EventType extends DDEvent>(
    events: EventType[],
    {
        fieldMatchers,
        eventName
    }: {
        fieldMatchers: Record<string, EventMatcherStrategy<EventType>>;
        eventName: string;
    }
) => {
    const eventMatching = events.find(event => {
        const matchers = Object.values(fieldMatchers);

        // For-loop avoids running all matchers if first one returns false
        for (
            let matcherIndex = 0;
            matcherIndex < matchers.length;
            matcherIndex++
        ) {
            const matcher = matchers[matcherIndex];
            if (!matcher.runMatcher(event)) {
                return false;
            }
        }

        return true;
    });

    if (!eventMatching) {
        throw new AssertionError(
            `Could not find ${eventName} matching ${Object.keys(
                fieldMatchers
            ).join(', ')}.`,
            `${Object.entries(fieldMatchers).map(
                ([fieldName, matcher]) =>
                    `${fieldName}: ${matcher.formatExpectedValueForErrorMessage()}. `
            )}`,
            undefined,
            events
        );
    }
};
