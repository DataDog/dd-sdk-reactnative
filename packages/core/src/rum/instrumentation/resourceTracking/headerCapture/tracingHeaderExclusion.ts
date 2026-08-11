/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    SAMPLING_PRIORITY_HEADER_KEY,
    ORIGIN_HEADER_KEY,
    TRACE_ID_HEADER_KEY,
    PARENT_ID_HEADER_KEY,
    TAGS_HEADER_KEY,
    TRACECONTEXT_HEADER_KEY,
    TRACESTATE_HEADER_KEY,
    BAGGAGE_HEADER_KEY,
    B3_HEADER_KEY,
    B3_MULTI_TRACE_ID_HEADER_KEY,
    B3_MULTI_SPAN_ID_HEADER_KEY,
    B3_MULTI_SAMPLED_HEADER_KEY
} from '../distributedTracing/headers';

/**
 * Set of all SDK-injected distributed tracing header names, lowercased.
 *
 * Built once at module load time from the canonical header constants in
 * `distributedTracing/headers.ts`. The B3 multi-headers have mixed case
 * (e.g. `X-B3-TraceId`), so all values are lowercased for uniform lookup.
 */
const TRACING_HEADERS: Set<string> = new Set(
    [
        SAMPLING_PRIORITY_HEADER_KEY,
        ORIGIN_HEADER_KEY,
        TRACE_ID_HEADER_KEY,
        PARENT_ID_HEADER_KEY,
        TAGS_HEADER_KEY,
        TRACECONTEXT_HEADER_KEY,
        TRACESTATE_HEADER_KEY,
        BAGGAGE_HEADER_KEY,
        B3_HEADER_KEY,
        B3_MULTI_TRACE_ID_HEADER_KEY,
        B3_MULTI_SPAN_ID_HEADER_KEY,
        B3_MULTI_SAMPLED_HEADER_KEY
    ].map(h => h.toLowerCase())
);

/**
 * Checks whether a header name is an SDK-injected distributed tracing header.
 * Tracing headers must never be captured because they are SDK internals,
 * not application-level headers.
 *
 * Uses an explicit list (not prefix matching) — `x-datadog-customer-id`
 * would NOT be excluded.
 *
 * @param headerName - The header name to check (lowercased internally for lookup).
 * @returns `true` if the header is a tracing header and must be excluded.
 */
export const isTracingHeader = (headerName: string): boolean => {
    return TRACING_HEADERS.has(headerName.toLowerCase());
};
