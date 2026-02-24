/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Compiled runtime representation of the header capture configuration.
 * Produced once at SDK initialization by `compileHeaderCaptureConfig`.
 *
 * - `null` means header capture is disabled (undefined input, empty array, or invalid value).
 * - `CompiledHeaderCaptureRule[]` contains one or more compiled rules to evaluate per request.
 */
export type CompiledHeaderCaptureConfig = CompiledHeaderCaptureRule[] | null;

/**
 * A single compiled URL-scoped header capture rule.
 * Pre-built for O(1) per-request matching — no config traversal at capture time.
 */
export type CompiledHeaderCaptureRule = {
    /** Pre-built RegExp for URL matching (full URL string). */
    urlRegex: RegExp;
    /** Lowercased request header names. Set for O(1) lookup. */
    requestHeaderNames: Set<string>;
    /** Lowercased response header names. Set for O(1) lookup. */
    responseHeaderNames: Set<string>;
    /** True if this rule was compiled from specific forURLs patterns (not catch-all). */
    isScoped: boolean;
    /** Map from lowercased header name to original/config-provided casing for request headers. */
    requestHeaderCasing: Map<string, string>;
    /** Map from lowercased header name to original/config-provided casing for response headers. */
    responseHeaderCasing: Map<string, string>;
};
