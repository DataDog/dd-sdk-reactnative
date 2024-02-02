/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { RumLongTaskEvent } from 'rum-events-format';

import { AssertionError } from '../assertionError';

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
            const longTaskMatching = events.find(longTask => {
                switch (thread) {
                    case 'js': {
                        if (
                            // Disabling ts as trying to safely access attributes won't crash the app
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            longTask.context?.['long_task.target'] !==
                            'javascript'
                        ) {
                            return false;
                        }
                        break;
                    }
                    case 'main': {
                        if (
                            // Disabling ts as trying to safely access attributes won't crash the app
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            longTask.context?.['long_task.target'] ===
                            'javascript'
                        ) {
                            return false;
                        }
                        break;
                    }
                    default: {
                        break;
                    }
                }
                if (duration) {
                    const durationMs = longTask.long_task.duration / 1_000_000;
                    if (
                        durationMs > duration.maxMs ||
                        durationMs < duration.minMs
                    ) {
                        return false;
                    }
                }

                return true;
            });
            if (!longTaskMatching) {
                throw new AssertionError(
                    'Could not find error matching duration and thread.',
                    `${thread && `thread: "${thread}"`} ${
                        duration &&
                        `duration min: ${duration.minMs} duration max: ${duration.maxMs}`
                    }`,
                    undefined,
                    events
                );
            }
        }
    };
};
