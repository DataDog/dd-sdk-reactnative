/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Parses a CRLF-delimited `getAllResponseHeaders()` string into a
 * `Record<string, string>` of lowercase header names to trimmed values.
 *
 * Handles all edge cases defensively — SDK stability takes priority over
 * strict compliance. Never throws on any input.
 *
 * - Splits on `\r?\n` to handle both CRLF and bare LF
 * - Uses `indexOf(':')` so values containing colons (e.g. URLs) are preserved
 * - Header names are trimmed and lowercased; values are trimmed (HTTP OWS)
 * - Duplicate names resolve to last-value-wins
 * - Malformed lines (no colon, empty name) are silently skipped
 */
export const parseResponseHeaders = (
    rawHeaders: string | null | undefined
): Record<string, string> => {
    if (!rawHeaders) {
        return {};
    }

    const result: Record<string, string> = {};
    const lines = rawHeaders.split(/\r?\n/);

    for (const line of lines) {
        // Skip empty lines (trailing delimiter produces empty last element)
        if (line === '') {
            continue;
        }

        const colonIndex = line.indexOf(':');

        // No colon found, or colon is first character (empty name) — skip
        if (colonIndex <= 0) {
            continue;
        }

        const name = line.slice(0, colonIndex).trim().toLowerCase();

        // Name is empty after trimming — skip
        if (name === '') {
            continue;
        }

        const value = line.slice(colonIndex + 1).trim();

        // Last value wins for duplicate header names
        result[name] = value;
    }

    return result;
};
