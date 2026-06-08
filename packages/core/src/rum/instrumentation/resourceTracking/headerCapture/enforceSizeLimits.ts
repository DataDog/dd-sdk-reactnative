/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/** Maximum character length (UTF-16 code units) for any single header value. */
export const MAX_HEADER_VALUE_BYTES = 128;

/** Maximum combined header count (request + response). */
export const MAX_HEADER_COUNT = 100;

/** Maximum total character count (UTF-16 code units) across all header names and values. */
export const MAX_TOTAL_BYTES = 2048;

/**
 * Converts a non-empty record to undefined-or-record.
 * Locked decision: no empty objects -- undefined or absent, not `{}`.
 */
const toUndefinedIfEmpty = (
    record: Record<string, string>
): Record<string, string> | undefined => {
    return Object.keys(record).length > 0 ? record : undefined;
};

/**
 * Enforces per-value truncation, header count cap, and total size budget
 * on captured header records.
 *
 * Processing order:
 * 1. Short-circuit if both inputs undefined
 * 2. Truncate each value to MAX_HEADER_VALUE_BYTES
 * 3. Cap combined count to MAX_HEADER_COUNT (request priority)
 * 4. Drop headers from end until total bytes <= MAX_TOTAL_BYTES
 * 5. Return undefined (not {}) for empty records
 *
 * Pure function -- no side effects, no logging.
 */
export const enforceSizeLimits = (
    requestHeaders: Record<string, string> | undefined,
    responseHeaders: Record<string, string> | undefined
): {
    requestHeaders: Record<string, string> | undefined;
    responseHeaders: Record<string, string> | undefined;
} => {
    // Step 1: Short-circuit
    if (requestHeaders === undefined && responseHeaders === undefined) {
        return { requestHeaders: undefined, responseHeaders: undefined };
    }

    // Step 2: Truncate values
    const reqEntries = requestHeaders
        ? Object.entries(requestHeaders).map(([name, value]): [
              string,
              string
          ] => [
              name,
              value.length > MAX_HEADER_VALUE_BYTES
                  ? value.slice(0, MAX_HEADER_VALUE_BYTES)
                  : value
          ])
        : [];

    const resEntries = responseHeaders
        ? Object.entries(responseHeaders).map(([name, value]): [
              string,
              string
          ] => [
              name,
              value.length > MAX_HEADER_VALUE_BYTES
                  ? value.slice(0, MAX_HEADER_VALUE_BYTES)
                  : value
          ])
        : [];

    // Step 3: Count cap -- request headers take priority
    const totalCount = reqEntries.length + resEntries.length;
    let cappedReqEntries = reqEntries;
    let cappedResEntries = resEntries;

    if (totalCount > MAX_HEADER_COUNT) {
        const reqSlots = Math.min(reqEntries.length, MAX_HEADER_COUNT);
        cappedReqEntries = reqEntries.slice(0, reqSlots);
        const remainingSlots = MAX_HEADER_COUNT - cappedReqEntries.length;
        cappedResEntries = resEntries.slice(0, remainingSlots);
    }

    // Step 4: Total size budget -- drop from end (response first, then request)
    let totalBytes = 0;
    for (const [name, value] of cappedReqEntries) {
        totalBytes += name.length + value.length;
    }
    for (const [name, value] of cappedResEntries) {
        totalBytes += name.length + value.length;
    }

    if (totalBytes > MAX_TOTAL_BYTES) {
        // Drop response headers from end first
        while (cappedResEntries.length > 0 && totalBytes > MAX_TOTAL_BYTES) {
            const [name, value] = cappedResEntries.pop()!;
            totalBytes -= name.length + value.length;
        }
        // Then drop request headers from end
        while (cappedReqEntries.length > 0 && totalBytes > MAX_TOTAL_BYTES) {
            const [name, value] = cappedReqEntries.pop()!;
            totalBytes -= name.length + value.length;
        }
    }

    // Step 5: Build result records
    const reqResult: Record<string, string> = {};
    for (const [name, value] of cappedReqEntries) {
        reqResult[name] = value;
    }

    const resResult: Record<string, string> = {};
    for (const [name, value] of cappedResEntries) {
        resResult[name] = value;
    }

    return {
        requestHeaders:
            requestHeaders !== undefined
                ? toUndefinedIfEmpty(reqResult)
                : undefined,
        responseHeaders:
            responseHeaders !== undefined
                ? toUndefinedIfEmpty(resResult)
                : undefined
    };
};
