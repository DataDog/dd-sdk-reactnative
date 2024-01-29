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
        },
        toHaveSpanWith: ({
            name,
            duration
        }: {
            name?: string;
            duration?: { minMs: number; maxMs: number };
        }) => {
            if (!name && !duration) {
                throw new Error(
                    'toHaveSpanWith was called without a name or a duration. Please specify at least one of them.'
                );
            }
            const spanMatching = events.find(trace => {
                return !!trace.spans.find(span => {
                    if (name && !span.name.match(name)) {
                        return false;
                    }
                    if (duration) {
                        const durationMs = span.duration / 1_000_000;
                        if (
                            durationMs > duration.maxMs ||
                            durationMs < duration.minMs
                        ) {
                            return false;
                        }
                    }
                    return true;
                });
            });
            if (!spanMatching) {
                throw new AssertionError(
                    'Could not find trace with a span matching name and duration.',
                    `${name && `name: "${name}"`} ${
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
