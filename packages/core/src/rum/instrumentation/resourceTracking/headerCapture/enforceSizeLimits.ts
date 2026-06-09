/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../../../InternalLog';
import { SdkVerbosity } from '../../../../config/types';
import { utf8ByteLength } from '../../../../utils/stringUtils';

const TAG = '[DatadogRUM][HeaderCapture]';

/** Maximum UTF-8 byte length for any single header value. */

export const MAX_HEADER_VALUE_BYTES = 128;

/** Maximum combined header count (request + response). */
export const MAX_HEADER_COUNT = 100;

/** Maximum total UTF-8 bytes across all header names and values. */
export const MAX_TOTAL_BYTES = 2048;

/**
 * Truncates a string so its UTF-8 byte length does not exceed maxBytes.
 * Slices by character and re-checks, because multi-byte chars mean
 * character count < byte count.
 */
const truncateToBytes = (str: string, maxBytes: number): string => {
    if (utf8ByteLength(str) <= maxBytes) {
        return str;
    }
    let result = str;
    while (result.length > 0 && utf8ByteLength(result) > maxBytes) {
        result = result.slice(0, result.length - 1);
    }
    return result;
};

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
 * on captured header records. All limits are in UTF-8 bytes.
 *
 * Processing order:
 * 1. Short-circuit if both inputs undefined
 * 2. Truncate each value to MAX_HEADER_VALUE_BYTES
 * 3. Cap combined count to MAX_HEADER_COUNT (request priority)
 * 4. Drop headers from end until total bytes <= MAX_TOTAL_BYTES
 * 5. Return undefined (not {}) for empty records
 *
 * Pure function with no stateful side effects (emits DEBUG logs when limits are hit).
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

    // Step 2: Truncate values to MAX_HEADER_VALUE_BYTES (UTF-8 bytes)
    const reqEntries = requestHeaders
        ? Object.entries(requestHeaders).map(([name, value]): [
              string,
              string
          ] => {
              const truncated = truncateToBytes(value, MAX_HEADER_VALUE_BYTES);
              if (truncated.length < value.length) {
                  InternalLog.log(
                      `${TAG} Truncated request header "${name}" value from ${utf8ByteLength(
                          value
                      )} to ${MAX_HEADER_VALUE_BYTES} bytes`,
                      SdkVerbosity.DEBUG
                  );
              }
              return [name, truncated];
          })
        : [];

    const resEntries = responseHeaders
        ? Object.entries(responseHeaders).map(([name, value]): [
              string,
              string
          ] => {
              const truncated = truncateToBytes(value, MAX_HEADER_VALUE_BYTES);
              if (truncated.length < value.length) {
                  InternalLog.log(
                      `${TAG} Truncated response header "${name}" value from ${utf8ByteLength(
                          value
                      )} to ${MAX_HEADER_VALUE_BYTES} bytes`,
                      SdkVerbosity.DEBUG
                  );
              }
              return [name, truncated];
          })
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
        InternalLog.log(
            `${TAG} Header count cap hit (${totalCount} > ${MAX_HEADER_COUNT}): keeping ${cappedReqEntries.length} request + ${cappedResEntries.length} response headers`,
            SdkVerbosity.DEBUG
        );
    }

    // Step 4: Total byte budget -- drop from end (response first, then request)
    let totalBytes = 0;
    for (const [name, value] of cappedReqEntries) {
        totalBytes += utf8ByteLength(name) + utf8ByteLength(value);
    }
    for (const [name, value] of cappedResEntries) {
        totalBytes += utf8ByteLength(name) + utf8ByteLength(value);
    }

    if (totalBytes > MAX_TOTAL_BYTES) {
        InternalLog.log(
            `${TAG} Total byte budget exceeded (${totalBytes} > ${MAX_TOTAL_BYTES}): dropping headers from end`,
            SdkVerbosity.DEBUG
        );
        // Drop response headers from end first
        while (cappedResEntries.length > 0 && totalBytes > MAX_TOTAL_BYTES) {
            const entry = cappedResEntries.pop();
            if (entry === undefined) {
                break;
            }
            InternalLog.log(
                `${TAG} Dropped response header "${entry[0]}" to fit byte budget`,
                SdkVerbosity.DEBUG
            );
            totalBytes -= utf8ByteLength(entry[0]) + utf8ByteLength(entry[1]);
        }
        // Then drop request headers from end
        while (cappedReqEntries.length > 0 && totalBytes > MAX_TOTAL_BYTES) {
            const entry = cappedReqEntries.pop();
            if (entry === undefined) {
                break;
            }
            InternalLog.log(
                `${TAG} Dropped request header "${entry[0]}" to fit byte budget`,
                SdkVerbosity.DEBUG
            );
            totalBytes -= utf8ByteLength(entry[0]) + utf8ByteLength(entry[1]);
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
