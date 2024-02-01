import type { RumErrorEvent } from 'rum-events-format';

import { AssertionError } from '../assertionError';

export const buildRumErrorAssertions = (events: RumErrorEvent[]) => {
    return {
        toHaveErrorWith: ({
            message,
            source
        }: {
            message?: string;
            source?: RumErrorEvent['error']['source'];
        }) => {
            if (!message && !source) {
                throw new Error(
                    'toHaveErrorWith was called without a source or a message. Please specify at least one of them.'
                );
            }
            const errorMatching = events.find(error => {
                if (source && !error.error.source.match(source)) {
                    return false;
                }
                if (message && error.error.message !== message) {
                    return false;
                }
                return true;
            });
            if (!errorMatching) {
                throw new AssertionError(
                    'Could not find error matching source and message.',
                    `${source && `source: "${source}"`} ${
                        message && `message: "${message}"`
                    }`,
                    undefined,
                    events
                );
            }
        }
    };
};
