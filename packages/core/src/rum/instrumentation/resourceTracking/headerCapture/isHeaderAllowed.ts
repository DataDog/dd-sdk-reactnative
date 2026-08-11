/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { isSensitiveHeader } from './sensitiveHeaderBlocklist';
import { isTracingHeader } from './tracingHeaderExclusion';

/**
 * Composed check: returns true if a header is allowed for capture.
 * A header is allowed only if it is NOT sensitive AND NOT a tracing header.
 *
 * This is the single entry point for Phase 3 XHR integration to call for
 * every header considered for capture.
 *
 * @param headerName - The header name to check (case-insensitive).
 * @returns `true` if the header may be captured, `false` if blocked.
 */
export const isHeaderAllowed = (headerName: string): boolean => {
    const lowered = headerName.toLowerCase();
    if (isSensitiveHeader(lowered)) {
        return false;
    }
    if (isTracingHeader(lowered)) {
        return false;
    }
    return true;
};
