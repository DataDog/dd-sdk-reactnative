/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../../../InternalLog';
import type { HeaderCaptureRule } from '../../../../config/features/RumConfiguration.type';
import { SdkVerbosity } from '../../../../config/types/SdkVerbosity';
import { escapeRegExp } from '../distributedTracing/firstPartyHosts';

import {
    DEFAULT_REQUEST_HEADERS,
    DEFAULT_RESPONSE_HEADERS,
    CANONICAL_REQUEST_HEADERS,
    CANONICAL_RESPONSE_HEADERS
} from './captureHeaders';
import type {
    CompiledHeaderCaptureConfig,
    CompiledHeaderCaptureRule
} from './types';

/**
 * Builds a URL-matching RegExp from a user-supplied `match` string.
 *
 * The regex is applied to full URL strings (e.g. "https://api.example.com/v2/users").
 * Pattern: `^https?://(.*\.)*${escapedHost}(:\d+)?${pathSuffix}`
 * where pathSuffix anchors at end-of-host when no path is given, or matches the path prefix.
 *
 * Returns null if the pattern is invalid (e.g. contains unescaped regex metacharacters that
 * result in an invalid expression).
 */
const buildUrlMatchRegex = (match: string): RegExp | null => {
    if (match === '*') {
        return /.*/;
    }

    // Split on first '/' to separate hostname from optional path prefix
    const slashIndex = match.indexOf('/');
    const hostname = slashIndex === -1 ? match : match.slice(0, slashIndex);
    const pathPrefix = slashIndex === -1 ? '' : match.slice(slashIndex);

    const escapedHost = escapeRegExp(hostname);
    // If a path prefix is given, escape it and match as prefix.
    // If hostname-only, accept /, ?, # or end-of-string as valid URL terminators.
    const pathSuffix = pathPrefix ? escapeRegExp(pathPrefix) : '(/|\\?|#|$)';

    try {
        // Regex matches full URL strings: scheme + optional subdomains + host + optional port + path
        const regex = new RegExp(
            `^https?://(.*\\.)*${escapedHost}(:\\d+)?${pathSuffix}`,
            'i'
        );
        // Validate the final regex is well-formed
        regex.test('validation_probe');
        return regex;
    } catch (_e) {
        return null;
    }
};

/**
 * Result from building a forURLs regex, carrying both the compiled regex
 * and whether it represents a scoped (specific URL patterns) or catch-all match.
 */
type ForURLsResult = { regex: RegExp; isScoped: boolean } | null | 'skip';

/**
 * Builds a combined URL-matching RegExp from an array of `forURLs` patterns.
 *
 * Returns an object with `regex` and `isScoped`, or `null` (all invalid), or `'skip'` (empty array).
 * - `undefined` or `['*']` -> catch-all, isScoped=false
 * - `[]` -> 'skip'
 * - Specific patterns -> combined regex, isScoped=true
 */
const buildForURLsRegex = (forURLs: string[] | undefined): ForURLsResult => {
    // Omitting forURLs = match all URLs (catch-all)
    if (forURLs === undefined) {
        return { regex: /.*/, isScoped: false };
    }

    // Empty array = no-op rule, skip with warning
    if (forURLs.length === 0) {
        return 'skip';
    }

    // ['*'] is equivalent to omitting forURLs (catch-all)
    if (forURLs.length === 1 && forURLs[0] === '*') {
        return { regex: /.*/, isScoped: false };
    }

    // Specific patterns = scoped
    const patterns: string[] = [];
    for (const pattern of forURLs) {
        const regex = buildUrlMatchRegex(pattern);
        if (regex === null) {
            InternalLog.log(
                `[DatadogRUM] headerCaptureRules: Skipping invalid forURLs pattern "${pattern}".`,
                SdkVerbosity.WARN
            );
            continue;
        }
        // Extract the source from the compiled regex to combine
        patterns.push(regex.source);
    }

    if (patterns.length === 0) {
        return null;
    }

    try {
        return { regex: new RegExp(patterns.join('|'), 'i'), isScoped: true };
    } catch (_e) {
        return null;
    }
};

/**
 * Compiles an array of composable `HeaderCaptureRule` entries into compiled rules.
 * Each rule variant type produces a different set of request/response header names.
 * Each compiled rule carries an `isScoped` flag from its forURLs resolution.
 */
const compileRules = (
    rules: HeaderCaptureRule[]
): CompiledHeaderCaptureRule[] => {
    const compiled: CompiledHeaderCaptureRule[] = [];

    for (const rule of rules) {
        // Build URL regex from forURLs
        const urlResult = buildForURLsRegex(rule.forURLs);

        if (urlResult === 'skip') {
            InternalLog.log(
                '[DatadogRUM] headerCaptureRules: Skipping rule with empty forURLs array (no-op).',
                SdkVerbosity.WARN
            );
            continue;
        }

        if (urlResult === null) {
            InternalLog.log(
                '[DatadogRUM] headerCaptureRules: Skipping rule — all forURLs patterns are invalid.',
                SdkVerbosity.WARN
            );
            continue;
        }

        const { regex: urlRegex, isScoped } = urlResult;

        switch (rule.type) {
            case 'defaults':
                compiled.push({
                    urlRegex,
                    requestHeaderNames: new Set(DEFAULT_REQUEST_HEADERS),
                    responseHeaderNames: new Set(DEFAULT_RESPONSE_HEADERS),
                    isScoped,
                    requestHeaderCasing: new Map(CANONICAL_REQUEST_HEADERS),
                    responseHeaderCasing: new Map(CANONICAL_RESPONSE_HEADERS)
                });
                break;

            case 'matchHeaders':
                compiled.push({
                    urlRegex,
                    requestHeaderNames: new Set(
                        rule.headers.map(h => h.toLowerCase())
                    ),
                    responseHeaderNames: new Set(
                        rule.headers.map(h => h.toLowerCase())
                    ),
                    isScoped,
                    requestHeaderCasing: new Map(
                        rule.headers.map(
                            h => [h.toLowerCase(), h] as [string, string]
                        )
                    ),
                    responseHeaderCasing: new Map(
                        rule.headers.map(
                            h => [h.toLowerCase(), h] as [string, string]
                        )
                    )
                });
                break;

            case 'matchRequestHeaders':
                compiled.push({
                    urlRegex,
                    requestHeaderNames: new Set(
                        rule.headers.map(h => h.toLowerCase())
                    ),
                    responseHeaderNames: new Set(),
                    isScoped,
                    requestHeaderCasing: new Map(
                        rule.headers.map(
                            h => [h.toLowerCase(), h] as [string, string]
                        )
                    ),
                    responseHeaderCasing: new Map()
                });
                break;

            case 'matchResponseHeaders':
                compiled.push({
                    urlRegex,
                    requestHeaderNames: new Set(),
                    responseHeaderNames: new Set(
                        rule.headers.map(h => h.toLowerCase())
                    ),
                    isScoped,
                    requestHeaderCasing: new Map(),
                    responseHeaderCasing: new Map(
                        rule.headers.map(
                            h => [h.toLowerCase(), h] as [string, string]
                        )
                    )
                });
                break;

            default:
                InternalLog.log(
                    `[DatadogRUM] headerCaptureRules: Skipping rule with unknown type "${
                        (rule as { type: string }).type
                    }".`,
                    SdkVerbosity.WARN
                );
                break;
        }
    }

    return compiled;
};

/**
 * Converts a user-supplied header capture config into a runtime-efficient
 * `CompiledHeaderCaptureConfig` (which is `CompiledHeaderCaptureRule[] | null`).
 *
 * Runs once at SDK initialization. Produces pre-built `RegExp` objects and `Set<string>`
 * lookups so that per-request header matching is O(1) with no config traversal.
 *
 * Input: `'defaults' | HeaderCaptureRule[] | undefined`
 * - `undefined` (omitted) = disabled, returns `null`
 * - `'defaults'` = string shortcut, returns single-element array with default headers and catch-all regex
 * - `HeaderCaptureRule[]` = composable array of rules, compiled into `CompiledHeaderCaptureRule[]`
 * - `[]` (empty array) = logs WARN, returns `null`
 * - Invalid value = logs WARN, returns `null`
 */
export const compileHeaderCaptureConfig = (
    config: 'defaults' | HeaderCaptureRule[] | undefined
): CompiledHeaderCaptureConfig => {
    if (config === undefined) {
        return null;
    }

    if (config === 'defaults') {
        return [
            {
                requestHeaderNames: new Set(DEFAULT_REQUEST_HEADERS),
                responseHeaderNames: new Set(DEFAULT_RESPONSE_HEADERS),
                urlRegex: /.*/,
                isScoped: false,
                requestHeaderCasing: new Map(CANONICAL_REQUEST_HEADERS),
                responseHeaderCasing: new Map(CANONICAL_RESPONSE_HEADERS)
            }
        ];
    }

    if (Array.isArray(config)) {
        if (config.length === 0) {
            InternalLog.log(
                '[DatadogRUM] headerCaptureRules is empty, no headers will be captured.',
                SdkVerbosity.WARN
            );
            return null;
        }

        const compiled = compileRules(config);
        if (compiled.length === 0) {
            return null;
        }
        return compiled;
    }

    InternalLog.log(
        `[DatadogRUM] headerCaptureRules: Unrecognized value "${JSON.stringify(
            config
        )}" — defaulting to disabled.`,
        SdkVerbosity.WARN
    );
    return null;
};
