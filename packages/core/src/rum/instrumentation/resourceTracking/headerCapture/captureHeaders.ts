/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../../../InternalLog';
import { SdkVerbosity } from '../../../../config/types';

import { isHeaderAllowed } from './isHeaderAllowed';
import { parseResponseHeaders } from './parseResponseHeaders';
import type {
    CompiledHeaderCaptureConfig,
    CompiledHeaderCaptureRule
} from './types';

const TAG = '[DatadogRUM][HeaderCapture]';

/**
 * Default response header names captured in 'defaults' mode.
 * Lowercased for direct comparison with parseResponseHeaders output.
 */
export const DEFAULT_RESPONSE_HEADERS: Set<string> = new Set([
    'cache-control',
    'etag',
    'age',
    'expires',
    'content-type',
    'content-encoding',
    'content-length',
    'vary',
    'server-timing',
    'x-cache'
]);

/**
 * Default request header names captured in 'defaults' mode.
 * Lowercased for direct comparison with accumulated header names.
 */
export const DEFAULT_REQUEST_HEADERS: Set<string> = new Set([
    'cache-control',
    'content-type'
]);

/**
 * Canonical RFC Title-Case casing for default response headers.
 * Static map -- explicit lookup, no auto-capitalization.
 * Key: lowercased name, Value: Title-Case name.
 */
export const CANONICAL_RESPONSE_HEADERS: Map<string, string> = new Map([
    ['cache-control', 'Cache-Control'],
    ['etag', 'ETag'],
    ['age', 'Age'],
    ['expires', 'Expires'],
    ['content-type', 'Content-Type'],
    ['content-encoding', 'Content-Encoding'],
    ['content-length', 'Content-Length'],
    ['vary', 'Vary'],
    ['server-timing', 'Server-Timing'],
    ['x-cache', 'X-Cache']
]);

/**
 * Canonical RFC Title-Case casing for default request headers.
 * Key: lowercased name, Value: Title-Case name.
 */
export const CANONICAL_REQUEST_HEADERS: Map<string, string> = new Map([
    ['cache-control', 'Cache-Control'],
    ['content-type', 'Content-Type']
]);

/**
 * Filters a header record to only entries in the allowed set, applying
 * casing from the provided casing map.
 *
 * Output key resolution:
 * - If the input key has non-lowered casing (e.g. from setRequestHeader), use it as-is
 * - Otherwise, look up the casing map for config-provided casing
 * - Falls back to lowered name if neither provides casing
 *
 * This handles both directions:
 * - Response headers: input keys are lowered (from parseResponseHeaders), so casing map provides output casing
 * - Request headers: input keys preserve setRequestHeader casing, which takes priority
 *
 * Returns undefined if no entries survive filtering (locked decision: no empty objects).
 *
 * @internal
 */
const filterWithCasing = (
    headers: Record<string, string>,
    allowedSet: Set<string>,
    casingMap: Map<string, string>
): Record<string, string> | undefined => {
    const filtered: Record<string, string> = {};
    let hasEntries = false;

    for (const [name, value] of Object.entries(headers)) {
        const lowered = name.toLowerCase();
        if (allowedSet.has(lowered)) {
            // Use original key casing if different from lowered (request headers),
            // otherwise fall back to casing map, otherwise use lowered
            const outputKey =
                name !== lowered
                    ? name // original casing from accumulator
                    : casingMap.get(lowered) ?? lowered;
            filtered[outputKey] = value;
            hasEntries = true;
        }
    }

    return hasEntries ? filtered : undefined;
};

/**
 * Loops over compiled rules, finds all that match the given URL,
 * and merges their header name sets additively (union).
 *
 * Scoped-replaces-catch-all: if any rule with isScoped=true matches
 * the URL, all catch-all (isScoped=false) rules are ignored.
 * Multiple scoped rules matching the same URL merge additively.
 *
 * @param rules - The compiled rule array.
 * @param url   - The request URL to match against.
 * @param field - Which header set to merge ('requestHeaderNames' or 'responseHeaderNames').
 * @returns The merged Set of header names, or an empty Set if no rules match.
 */
const mergeMatchingHeaderNames = (
    rules: CompiledHeaderCaptureRule[],
    url: string,
    field: 'requestHeaderNames' | 'responseHeaderNames'
): Set<string> => {
    const scopedMatches: Set<string> = new Set();
    const catchAllMatches: Set<string> = new Set();
    let hasScopedMatch = false;

    for (const rule of rules) {
        if (rule.urlRegex.test(url)) {
            if (rule.isScoped) {
                hasScopedMatch = true;
                for (const name of rule[field]) {
                    scopedMatches.add(name);
                }
            } else {
                for (const name of rule[field]) {
                    catchAllMatches.add(name);
                }
            }
        }
    }

    return hasScopedMatch ? scopedMatches : catchAllMatches;
};

/**
 * Merges casing maps from all matching rules into a single Map.
 * Uses the same scoped-replaces-catch-all logic as mergeMatchingHeaderNames.
 *
 * Casing precedence:
 * - Scoped rules: first-declared wins (among custom rules, first casing is kept)
 * - Catch-all rules: last-declared wins (custom rules override defaults' casing
 *   since defaults is typically declared first in the config array)
 *
 * @param rules - The compiled rule array.
 * @param url   - The request URL to match against.
 * @param field - Which casing map to merge ('requestHeaderCasing' or 'responseHeaderCasing').
 * @returns The merged casing Map, or an empty Map if no rules match.
 */
const mergeCasingMaps = (
    rules: CompiledHeaderCaptureRule[],
    url: string,
    field: 'requestHeaderCasing' | 'responseHeaderCasing'
): Map<string, string> => {
    const scopedMap = new Map<string, string>();
    const catchAllMap = new Map<string, string>();
    let hasScopedMatch = false;

    for (const rule of rules) {
        if (rule.urlRegex.test(url)) {
            if (rule.isScoped) {
                hasScopedMatch = true;
                // First-declared wins for scoped rules
                for (const [lowered, original] of rule[field]) {
                    if (!scopedMap.has(lowered)) {
                        scopedMap.set(lowered, original);
                    }
                }
            } else {
                // Last-declared wins for catch-all rules
                // (ensures custom rules override defaults' casing)
                for (const [lowered, original] of rule[field]) {
                    catchAllMap.set(lowered, original);
                }
            }
        }
    }

    return hasScopedMatch ? scopedMap : catchAllMap;
};

/**
 * Accumulates a single request header into the capture store.
 * Applies security filtering at capture time (locked decision: sensitive
 * headers never stored in memory).
 *
 * Mutates the accumulator in place for performance — no allocation per call.
 * Last-value-wins semantics for duplicate header names.
 *
 * @param accumulator - Mutable record to store captured headers.
 * @param headerName  - The header name as provided by setRequestHeader (any case).
 * @param headerValue - The header value string.
 */
export const accumulateRequestHeader = (
    accumulator: Record<string, string>,
    headerName: string,
    headerValue: string
): void => {
    const lowered = headerName.toLowerCase();
    if (isHeaderAllowed(lowered)) {
        // Remove any existing entry with different casing for same header
        // (last-value-wins: both value and casing from latest call)
        for (const existing of Object.keys(accumulator)) {
            if (existing.toLowerCase() === lowered) {
                delete accumulator[existing];
                break;
            }
        }
        accumulator[headerName] = headerValue;
        InternalLog.log(
            `${TAG} Accumulated request header "${headerName}"`,
            SdkVerbosity.DEBUG
        );
    } else {
        InternalLog.log(
            `${TAG} Request header "${headerName}" blocked by security filter`,
            SdkVerbosity.DEBUG
        );
    }
};

/**
 * Captures response headers from a raw getAllResponseHeaders() string.
 * Applies security filtering first (defense in depth), then filters by
 * the union of all matching compiled rules' response header sets.
 *
 * Returns undefined if:
 * - Config is null (disabled)
 * - rawHeaders is null/undefined/empty
 * - No headers survive security filtering
 * - No compiled rules match the URL
 * - No headers survive rule-based filtering
 *
 * (Locked decision: no empty objects — undefined or absent, not `{}`.)
 *
 * @param rawHeaders - The raw CRLF string from getAllResponseHeaders().
 * @param url        - The full request URL for rule matching.
 * @param config     - The compiled header capture configuration.
 * @returns Filtered response headers, or undefined.
 */
export const captureResponseHeaders = (
    rawHeaders: string | null | undefined,
    url: string,
    config: CompiledHeaderCaptureConfig
): Record<string, string> | undefined => {
    if (config === null) {
        return undefined;
    }

    const allHeaders = parseResponseHeaders(rawHeaders);
    const allCount = Object.keys(allHeaders).length;
    if (allCount === 0) {
        InternalLog.log(
            `${TAG} No response headers to capture for ${url}`,
            SdkVerbosity.DEBUG
        );
        return undefined;
    }

    // Security filter first — defense in depth
    const securityFiltered: Record<string, string> = {};
    const blocked: string[] = [];

    for (const [name, value] of Object.entries(allHeaders)) {
        if (isHeaderAllowed(name)) {
            securityFiltered[name] = value;
        } else {
            blocked.push(name);
        }
    }

    if (blocked.length > 0) {
        InternalLog.log(
            `${TAG} Response headers blocked by security filter for ${url}: [${blocked.join(
                ', '
            )}]`,
            SdkVerbosity.DEBUG
        );
    }

    if (Object.keys(securityFiltered).length === 0) {
        return undefined;
    }

    // Merge all matching rules' response header sets (union)
    const allowedHeaders = mergeMatchingHeaderNames(
        config,
        url,
        'responseHeaderNames'
    );

    if (allowedHeaders.size === 0) {
        InternalLog.log(
            `${TAG} No rules matched ${url} for response headers — nothing captured`,
            SdkVerbosity.DEBUG
        );
        return undefined;
    }

    const casingMap = mergeCasingMaps(config, url, 'responseHeaderCasing');
    const result = filterWithCasing(
        securityFiltered,
        allowedHeaders,
        casingMap
    );

    if (result === undefined) {
        InternalLog.log(
            `${TAG} No response headers survived rule filtering for ${url}`,
            SdkVerbosity.DEBUG
        );
    } else {
        InternalLog.log(
            `${TAG} Captured ${
                Object.keys(result).length
            }/${allCount} response headers for ${url}: [${Object.keys(
                result
            ).join(', ')}]`,
            SdkVerbosity.DEBUG
        );
    }

    return result;
};

/**
 * Filters accumulated request headers by compiled rule matching.
 *
 * Called at request completion (DONE state) when the URL is final.
 * Request headers are accumulated during setRequestHeader calls and
 * filtered here to the union of all matching rules' request header sets.
 *
 * Returns undefined if:
 * - Config is null (disabled)
 * - No compiled rules match the URL
 * - No headers survive rule-based filtering
 *
 * @param headers - The accumulated request headers (already security-filtered).
 * @param url     - The final request URL for rule matching.
 * @param config  - The compiled header capture configuration.
 * @returns Filtered request headers, or undefined.
 */
export const filterRequestHeadersByMode = (
    headers: Record<string, string>,
    url: string,
    config: CompiledHeaderCaptureConfig
): Record<string, string> | undefined => {
    if (config === null) {
        return undefined;
    }

    const accumulatedCount = Object.keys(headers).length;

    // Merge all matching rules' request header sets (union)
    const allowedHeaders = mergeMatchingHeaderNames(
        config,
        url,
        'requestHeaderNames'
    );

    if (allowedHeaders.size === 0) {
        InternalLog.log(
            `${TAG} No rules matched ${url} for request headers — nothing captured`,
            SdkVerbosity.DEBUG
        );
        return undefined;
    }

    const casingMap = mergeCasingMaps(config, url, 'requestHeaderCasing');
    const result = filterWithCasing(headers, allowedHeaders, casingMap);

    if (result === undefined) {
        InternalLog.log(
            `${TAG} No request headers survived rule filtering for ${url} (accumulated: ${accumulatedCount})`,
            SdkVerbosity.DEBUG
        );
    } else {
        InternalLog.log(
            `${TAG} Captured ${
                Object.keys(result).length
            }/${accumulatedCount} request headers for ${url}: [${Object.keys(
                result
            ).join(', ')}]`,
            SdkVerbosity.DEBUG
        );
    }

    return result;
};
