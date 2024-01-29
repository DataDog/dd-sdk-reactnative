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
        },
        toHaveLogWith: ({
            status,
            message
        }: {
            status?: string;
            message?: string;
        }) => {
            if (!status && !message) {
                throw new Error(
                    'toHaveLogWith was called without a status or a message. Please specify at least one of them.'
                );
            }
            const logMatching = events.find(log => {
                if (message && !log.message.match(message)) {
                    return false;
                }
                if (status && log.status !== status) {
                    return false;
                }
                return true;
            });
            if (!logMatching) {
                throw new AssertionError(
                    'Could not find log matching status and message.',
                    `${status && `status: "${status}"`} ${
                        message && `message: "${message}"`
                    }`,
                    undefined,
                    events
                );
            }
        }
    };
};
