import type { RumViewEvent } from 'rum-events-format';

import { AssertionError } from '../assertionError';

export const buildRumViewAssertions = (events: RumViewEvent[]) => {
    return {
        toHaveViewWith: ({ name }: { name?: string }) => {
            if (!name) {
                throw new Error(
                    'toHaveViewWith was called without a name. Please specify one.'
                );
            }
            const viewMatching = events.find(view => {
                if (name && view.view.name !== name) {
                    return false;
                }
                return true;
            });
            if (!viewMatching) {
                throw new AssertionError(
                    'Could not find view update matching name.',
                    `${name && `name: "${name}"`}`,
                    undefined,
                    events
                );
            }
        }
    };
};
