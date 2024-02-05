/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { buildTraceAssertions } from '../trace';

const generateTraceAssertions = (length: number) => {
    return buildTraceAssertions(
        Array(length)
            .fill(0)
            .map((_, index) => ({
                spans: [
                    {
                        name: `span number ${index}`,
                        service: '',
                        duration: 100_000_000 * index,
                        type: '',
                        trace_id: '',
                        span_id: '',
                        parent_id: ''
                    }
                ],
                env: ''
            }))
    );
};

describe('trace assertions', () => {
    describe('toHaveLength', () => {
        it('does not throw if the events have the correct length', () => {
            const trace = generateTraceAssertions(3);
            expect(() => trace.toHaveLength(3)).not.toThrow();
        });
        it('throws a meaningful error if the events do not have the correct length', () => {
            const trace = generateTraceAssertions(3);
            expect(() => trace.toHaveLength(2)).toThrow(
                'Trace events length did not match.'
            );
        });
    });

    describe('toHaveSpanWith', () => {
        it('does not throw if it contains a span with correct name and duration', () => {
            const trace = generateTraceAssertions(3);
            expect(() =>
                trace.toHaveSpanWith({
                    name: 'span number 1',
                    duration: {
                        minMs: 90,
                        maxMs: 110
                    }
                })
            ).not.toThrow();
        });
        it('does not throw if it contains a span with correct name when no duration is specified', () => {
            const trace = generateTraceAssertions(3);
            expect(() =>
                trace.toHaveSpanWith({
                    name: 'span number 1'
                })
            ).not.toThrow();
        });
        it('does not throw if it contains a span with correct duration when no name is specified', () => {
            const trace = generateTraceAssertions(3);
            expect(() =>
                trace.toHaveSpanWith({
                    duration: {
                        minMs: 90,
                        maxMs: 110
                    }
                })
            ).not.toThrow();
        });

        it('throws if it does not contain a span with correct duration and name', () => {
            const trace = generateTraceAssertions(3);
            expect(() =>
                trace.toHaveSpanWith({
                    name: 'span number 1',
                    duration: {
                        minMs: 110,
                        maxMs: 120
                    }
                })
            ).toThrow();
            expect(() =>
                trace.toHaveSpanWith({
                    name: 'span number 2',
                    duration: {
                        minMs: 90,
                        maxMs: 120
                    }
                })
            ).toThrow();
        });
        it('throws if it does not contain a span with correct name when no duration is specified', () => {
            const trace = generateTraceAssertions(3);
            expect(() =>
                trace.toHaveSpanWith({
                    name: 'span number 7'
                })
            ).toThrow();
        });
        it('throws if it does not contain a span with correct duration when no name is specified', () => {
            const trace = generateTraceAssertions(3);
            expect(() =>
                trace.toHaveSpanWith({
                    duration: {
                        minMs: 700,
                        maxMs: 900
                    }
                })
            ).toThrow();
        });

        it('throws if no name and no duration were provided', () => {
            const trace = generateTraceAssertions(3);
            expect(() => trace.toHaveSpanWith({})).toThrow();
        });
    });
});
