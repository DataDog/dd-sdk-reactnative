import type { LogEvent } from '../types/events';

import { AssertionError } from './assertionError';

export const buildLogsAssertions = (events: LogEvent[]) => {
    return {
        toHaveLength: (expectedLength: number) => {
            if (events.length !== expectedLength) {
                throw new AssertionError(
                    'Logs events length did not match.',
                    expectedLength.toString(),
                    events.length.toString(),
                    events
                );
            }
        }
    };
};
