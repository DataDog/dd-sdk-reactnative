import type { RumActionEvent } from 'rum-events-format';

import { exactStringMatcherBuilder } from '../utils/eventMatcherStrategies/exactStringMatcher';
import { partialStringMatcherBuilder } from '../utils/eventMatcherStrategies/partialStringMatcher';
import { findEventsWithMatchers } from '../utils';

export const buildRumActionAssertions = (events: RumActionEvent[]) => {
    return {
        toHaveActionWith: ({
            target,
            type
        }: {
            target?: string;
            type?: RumActionEvent['action']['type'];
        }) => {
            if (!target && !type) {
                throw new Error(
                    'toHaveActionWith was called without a target or a type. Please specify at least one of them.'
                );
            }

            findEventsWithMatchers(events, {
                fieldMatchers: {
                    target: partialStringMatcherBuilder(
                        target,
                        action => action.action.target?.name
                    ),
                    type: exactStringMatcherBuilder(
                        type,
                        action => action.action.type
                    )
                },
                eventName: 'action'
            });
        }
    };
};
