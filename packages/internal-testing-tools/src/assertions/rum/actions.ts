import type { RumActionEvent } from 'rum-events-format';

import { AssertionError } from '../assertionError';

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
            const actionMatching = events.find(action => {
                if (target && !action.action.target?.name.match(target)) {
                    return false;
                }
                if (type && action.action.type !== type) {
                    return false;
                }
                return true;
            });
            if (!actionMatching) {
                throw new AssertionError(
                    'Could not find action matching target and type.',
                    `${target && `target: "${target}"`} ${
                        type && `type: "${type}"`
                    }`,
                    undefined,
                    events
                );
            }
        }
    };
};
