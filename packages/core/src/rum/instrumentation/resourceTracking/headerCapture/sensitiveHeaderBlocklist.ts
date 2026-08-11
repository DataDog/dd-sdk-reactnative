/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Compiled regex matching sensitive header name patterns.
 *
 * Matches headers containing: token, cookie, secret, authorization, password,
 * credential, bearer, api/secret/access/app key variants, forwarding/IP headers.
 *
 * The `/i` flag ensures case-insensitive matching. Compiled once at module load
 * time — no per-call allocation.
 */
const SENSITIVE_HEADER_PATTERN = /(?:token|cookie|secret|authorization|password|credential|bearer|(?:api|secret|access|app).?key|forwarded|real.?ip|connecting.?ip|client.?ip)/i;

/**
 * Checks whether a header name matches a known sensitive header pattern.
 * Sensitive headers (authorization, cookies, tokens, API keys, etc.) must
 * never be captured regardless of configuration mode.
 *
 * Silent filtering — no debug log for blocked headers (these are expected
 * normal behavior, not warnings).
 *
 * @param headerName - The header name to check (case-insensitive via regex /i flag).
 * @returns `true` if the header is sensitive and must be blocked.
 */
export const isSensitiveHeader = (headerName: string): boolean => {
    return SENSITIVE_HEADER_PATTERN.test(headerName);
};
