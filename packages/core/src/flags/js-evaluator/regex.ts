/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export function regexMatches(pattern: string, value: string | undefined): boolean {
    if (value === undefined) {
        return false;
    }
    try {
        const normalized = normalizeRegexPattern(pattern);
        return new RegExp(normalized.pattern, normalized.flags).test(value);
    } catch (_error) {
        return false;
    }
}

function normalizeRegexPattern(input: string): { pattern: string; flags: string } {
    let pattern = input;
    const flags = new Set<string>();
    let changed = true;
    while (changed) {
        changed = false;
        if (pattern.startsWith('(?i)')) {
            flags.add('i');
            pattern = pattern.slice(4);
            changed = true;
        }
        if (pattern.startsWith('(?u)')) {
            flags.add('u');
            pattern = pattern.slice(4);
            changed = true;
        }
    }
    return {
        pattern: pattern.replace(/\[:alnum:\]/g, 'A-Za-z0-9'),
        flags: Array.from(flags).sort().join('')
    };
}
