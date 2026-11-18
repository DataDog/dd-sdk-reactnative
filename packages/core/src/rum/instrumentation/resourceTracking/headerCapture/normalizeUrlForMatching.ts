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

// HTTP(S) URL parsers accept any number of slashes (or backslashes) after the scheme
const HTTP_SCHEME_AND_SLASHES = /^(https?):[/\\]*/i;

const ENCODED_HOST_CHARACTER = /%([0-9a-fA-F]{2})/g;
const HOST_CHARACTER = /^[A-Za-z0-9.-]$/;
// Label separators that IDNA maps to '.'
const ALTERNATIVE_DOTS = /[\u3002\uFF0E\uFF61]/g;
// Characters that cannot appear in a hostname: decoding must never produce them,
// otherwise an encoded character could move the host boundary
// eslint-disable-next-line no-control-regex
const FORBIDDEN_HOST_CHARACTER = /[\u0000-\u0020/\\?#@:%<>[\]^|]/;

const SINGLE_DOT_SEGMENTS = new Set(['.', '%2e']);
const DOUBLE_DOT_SEGMENTS = new Set(['..', '.%2e', '%2e.', '%2e%2e']);

/**
 * Normalizes a URL for `forURLs` scope matching, following the URL parsing
 * semantics of HTTP clients:
 * - leading/trailing control characters and spaces are trimmed, and tabs,
 *   CRs and LFs are removed;
 * - extra slashes after `http(s):` are collapsed (`https:///host` -> `https://host`);
 * - the scheme and authority are lowercased, and the hostname is normalized
 *   with {@link normalizeHostname};
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
        .replace(TAB_OR_NEWLINE, '')
        .replace(HTTP_SCHEME_AND_SLASHES, '$1://');
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
 * Normalizes a hostname the way HTTP clients resolve it before connecting:
 * percent-encodings are decoded, Unicode compatibility characters are mapped
 * (NFKC, e.g. fullwidth letters), IDNA label separators (`。`, `．`, `｡`)
 * become `.`, and the result is lowercased.
 * Used for both request URLs and configured `forURLs` hostnames.
 *
 * If decoding would produce a character that is not allowed in a hostname,
 * only ASCII hostname characters are decoded.
 */
export const normalizeHostname = (hostname: string): string => {
    if (/^[A-Za-z0-9.-]*$/.test(hostname)) {
        return hostname.toLowerCase();
    }

    const normalized = mapUnicodeHostname(decodeUtf8(hostname));
    if (!FORBIDDEN_HOST_CHARACTER.test(normalized)) {
        return normalized;
    }

    return mapUnicodeHostname(
        hostname.replace(ENCODED_HOST_CHARACTER, (encoded, hex: string) => {
            const char = String.fromCharCode(parseInt(hex, 16));
            return HOST_CHARACTER.test(char) ? char : encoded;
        })
    );
};

const decodeUtf8 = (value: string): string => {
    try {
        return decodeURIComponent(value);
    } catch (_e) {
        // Malformed percent-encoding: leave it to the ASCII-only fallback
        return value;
    }
};

const mapUnicodeHostname = (hostname: string): string => {
    let mapped = hostname;
    try {
        // Not available on every JS engine configuration
        if (typeof mapped.normalize === 'function') {
            mapped = mapped.normalize('NFKC');
        }
    } catch (_e) {
        // Keep the unmapped hostname
    }
    return mapped.replace(ALTERNATIVE_DOTS, '.').toLowerCase();
};

/**
 * Lowercases the scheme and authority and normalizes the hostname.
 * Userinfo (before the last `@`) is lowercased but not decoded, and the port
 * is kept as-is, so encoded characters can never move the host boundaries.
 * IPv6 literals (`[...]`) are only lowercased.
 */
const normalizeAuthority = (schemeAndAuthority: string): string => {
    const userinfoEnd = schemeAndAuthority.lastIndexOf('@');
    const hostStart =
        userinfoEnd === -1
            ? schemeAndAuthority.indexOf('://') + 3
            : userinfoEnd + 1;
    const hostAndPort = schemeAndAuthority.slice(hostStart);
    const portMatch = /:\d*$/.exec(hostAndPort);
    const host = portMatch
        ? hostAndPort.slice(0, portMatch.index)
        : hostAndPort;
    const port = portMatch ? portMatch[0] : '';
    const normalizedHost = host.startsWith('[')
        ? host.toLowerCase()
        : normalizeHostname(host);

    return `${schemeAndAuthority
        .slice(0, hostStart)
        .toLowerCase()}${normalizedHost}${port}`;
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
