/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// URL parsers ignore leading/trailing C0 control characters and spaces, and
// remove ASCII tabs and newlines anywhere in the URL.
// eslint-disable-next-line no-control-regex
const LEADING_TRAILING_C0_OR_SPACE = /^[\u0000-\u0020]+|[\u0000-\u0020]+$/g;
const TAB_OR_NEWLINE = /[\t\n\r]/g;

// Percent-encoded characters that can appear in a valid ASCII hostname
const ENCODED_HOST_CHARACTER = /%([0-9a-fA-F]{2})/g;
const HOST_CHARACTER = /^[A-Za-z0-9.-]$/;

const SINGLE_DOT_SEGMENTS = new Set(['.', '%2e']);
const DOUBLE_DOT_SEGMENTS = new Set(['..', '.%2e', '%2e.', '%2e%2e']);

/**
 * Normalizes a URL for `forURLs` scope matching, following the URL parsing
 * semantics of HTTP clients:
 * - leading/trailing control characters and spaces are trimmed, and tabs,
 *   CRs and LFs are removed;
 * - the scheme and authority are lowercased (hosts match case-insensitively),
 *   and percent-encoded hostname characters are decoded (`%61pi` -> `api`);
 * - an omitted path is treated as `/`;
 * - in the path, backslashes are treated as slashes and dot segments
 *   (`.`, `..`, and their `%2e` encodings) are resolved;
 * - path case, query and fragment are left untouched.
 *
 * Example: `HTTPS://API.Example.com/Public/../Private?Q=1` -> `https://api.example.com/Private?Q=1`
 */
export const normalizeUrlForMatching = (rawUrl: string): string => {
    const url = rawUrl
        .replace(LEADING_TRAILING_C0_OR_SPACE, '')
        .replace(TAB_OR_NEWLINE, '');
    const schemeEnd = url.indexOf('://');
    if (schemeEnd === -1) {
        return url;
    }

    const authorityEnd = findFirstOf(url, schemeEnd + 3, '/\\?#');
    const pathEnd = findFirstOf(url, authorityEnd, '?#');

    return (
        normalizeAuthority(url.slice(0, authorityEnd)) +
        normalizePath(url.slice(authorityEnd, pathEnd)) +
        url.slice(pathEnd)
    );
};

/**
 * Lowercases the scheme and authority and decodes percent-encoded hostname
 * characters. Userinfo (before the last `@`) is lowercased but not decoded, so
 * an encoded `@` can never move the host boundary. Encodings that would not be
 * valid in a hostname are left as-is.
 */
const normalizeAuthority = (schemeAndAuthority: string): string => {
    const userinfoEnd = schemeAndAuthority.lastIndexOf('@');
    const hostStart =
        userinfoEnd === -1
            ? schemeAndAuthority.indexOf('://') + 3
            : userinfoEnd + 1;
    const host = schemeAndAuthority
        .slice(hostStart)
        .replace(ENCODED_HOST_CHARACTER, (encoded, hex: string) => {
            const char = String.fromCharCode(parseInt(hex, 16));
            return HOST_CHARACTER.test(char) ? char : encoded;
        });

    return `${schemeAndAuthority.slice(0, hostStart)}${host}`.toLowerCase();
};

const findFirstOf = (url: string, from: number, chars: string): number => {
    for (let i = from; i < url.length; i++) {
        if (chars.includes(url[i])) {
            return i;
        }
    }
    return url.length;
};

const normalizePath = (path: string): string => {
    // HTTP requests without a path are sent to `/`
    if (path === '') {
        return '/';
    }

    // Fast path: nothing to resolve
    if (!/[.\\%]/.test(path)) {
        return path;
    }

    const segments = path.replace(/\\/g, '/').slice(1).split('/');
    const output: string[] = [];

    segments.forEach((segment, index) => {
        const isLast = index === segments.length - 1;
        const lowered = segment.toLowerCase();
        if (DOUBLE_DOT_SEGMENTS.has(lowered)) {
            output.pop();
            if (isLast) {
                output.push('');
            }
        } else if (SINGLE_DOT_SEGMENTS.has(lowered)) {
            if (isLast) {
                output.push('');
            }
        } else {
            output.push(segment);
        }
    });

    return `/${output.join('/')}`;
};
