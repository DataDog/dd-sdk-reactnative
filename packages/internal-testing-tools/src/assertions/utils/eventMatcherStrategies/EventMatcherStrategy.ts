import type { DDEvent } from '../../../types/events';

export type EventMatcherStrategy<EventType extends DDEvent> = {
    runMatcher: (event: EventType) => boolean;
    formatExpectedValueForErrorMessage: () => string;
};
