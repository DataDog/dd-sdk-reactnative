/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { isTracingHeader } from '../tracingHeaderExclusion';

describe('isTracingHeader', () => {
    describe('MUST EXCLUDE all 12 tracing headers (returns true)', () => {
        const tracingHeaders = [
            'x-datadog-sampling-priority',
            'x-datadog-origin',
            'x-datadog-trace-id',
            'x-datadog-parent-id',
            'x-datadog-tags',
            'traceparent',
            'tracestate',
            'baggage',
            'b3',
            'x-b3-traceid',
            'x-b3-spanid',
            'x-b3-sampled'
        ];

        it.each(tracingHeaders)('excludes "%s"', (headerName: string) => {
            expect(isTracingHeader(headerName)).toBe(true);
        });
    });

    describe('case-insensitive matching', () => {
        it('excludes X-Datadog-Trace-Id (mixed case)', () => {
            expect(isTracingHeader('X-Datadog-Trace-Id')).toBe(true);
        });

        it('excludes Traceparent (capitalized)', () => {
            expect(isTracingHeader('Traceparent')).toBe(true);
        });

        it('excludes X-B3-TraceId (original constant casing)', () => {
            expect(isTracingHeader('X-B3-TraceId')).toBe(true);
        });
    });

    describe('MUST ALLOW non-tracing headers (returns false)', () => {
        it('allows content-type', () => {
            expect(isTracingHeader('content-type')).toBe(false);
        });

        it('allows x-custom-header', () => {
            expect(isTracingHeader('x-custom-header')).toBe(false);
        });

        it('allows x-datadog-customer-id (not a tracing header - explicit list, not prefix match)', () => {
            expect(isTracingHeader('x-datadog-customer-id')).toBe(false);
        });
    });
});
