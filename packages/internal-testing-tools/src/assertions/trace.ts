import type { TraceEvent } from '../types/events';

import { AssertionError } from './assertionError';

export const buildTraceAssertions = (events: TraceEvent[]) => {
    return {
        toHaveLength: (expectedLength: number) => {
            if (events.length !== expectedLength) {
                throw new AssertionError(
                    'Trace events length did not match.',
                    expectedLength.toString(),
                    events.length.toString(),
                    events
                );
            }
        }
    };
};
