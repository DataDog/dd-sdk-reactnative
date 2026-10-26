/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Lowercases the scheme and authority of a URL, leaving path, query and
 * fragment untouched. Compiled `forURLs` regexes are case-sensitive with a
 * lowercased host, so hosts match case-insensitively while paths keep their case.
 *
 * Example: `HTTPS://API.Example.com/Public?Q=1` -> `https://api.example.com/Public?Q=1`
 */
export const normalizeUrlForMatching = (url: string): string => {
    const schemeEnd = url.indexOf('://');
    if (schemeEnd === -1) {
        return url;
    }

    const authorityStart = schemeEnd + 3;
    let authorityEnd = url.length;
    for (let i = authorityStart; i < url.length; i++) {
        const char = url[i];
        if (char === '/' || char === '\\' || char === '?' || char === '#') {
            authorityEnd = i;
            break;
        }
    }

    return url.slice(0, authorityEnd).toLowerCase() + url.slice(authorityEnd);
};
