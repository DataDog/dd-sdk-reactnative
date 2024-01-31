import type { RumLongTaskEvent } from 'rum-events-format';

import { durationMatcherBuilder } from '../utils/eventMatcherStrategies/durationMatcher';
import type { EventMatcherStrategy } from '../utils/eventMatcherStrategies/eventMatcherStrategy';
import { findEventsWithMatchers } from '../utils';

const longTaskThreadMatcher = (
    expected: 'js' | 'main' | undefined
): EventMatcherStrategy<RumLongTaskEvent> => {
    return {
        runMatcher: event => {
            if (expected !== undefined) {
                // Disabling ts as trying to safely access attributes won't crash the app
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const thread = event.context?.['long_task']?.['target'];
                switch (expected) {
                    case 'js': {
                        if (thread !== 'javascript') {
                            return false;
                        }
                        break;
                    }
                    case 'main': {
                        if (thread === 'javascript') {
                            return false;
                        }
                        break;
                    }
                    default:
                        break;
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

export const buildRumLongTaskAssertions = (events: RumLongTaskEvent[]) => {
    return {
        toHaveLongTaskWith: ({
            duration,
            thread
        }: {
            duration?: { minMs: number; maxMs: number };
            thread?: 'js' | 'main';
        }) => {
            if (!duration && !thread) {
                throw new Error(
                    'toHaveLongTaskWith was called without a duration or a thread. Please specify at least one of them.'
                );
            }

            findEventsWithMatchers(events, {
                fieldMatchers: {
                    thread: longTaskThreadMatcher(thread),
                    duration: durationMatcherBuilder(
                        duration,
                        longTask => longTask.long_task.duration / 1_000_000
                    )
                },
                eventName: 'action'
            });
        }
    };
};
