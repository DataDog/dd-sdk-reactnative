/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    accumulateRequestHeader,
    filterRequestHeadersByMode,
    filterResponseHeaders
} from '../../headerCapture/captureHeaders';
import { enforceSizeLimits } from '../../headerCapture/enforceSizeLimits';
import { isHeaderAllowed } from '../../headerCapture/isHeaderAllowed';
import type { CompiledHeaderCaptureConfig } from '../../headerCapture/types';
import { isDatadogCustomHeader } from '../../headers';

/**
 * Per-request header capture state, shared by all request proxies.
 */
export interface HeaderCaptureState {
    config: CompiledHeaderCaptureConfig;
    /** `undefined` when header capture is disabled. */
    requestHeaders: Record<string, string> | undefined;
}

export type CapturedHeaders = {
    capturedRequestHeaders?: Record<string, string>;
    capturedResponseHeaders?: Record<string, string>;
};

export const createHeaderCaptureState = (
    config: CompiledHeaderCaptureConfig | undefined
): HeaderCaptureState => ({
    config: config ?? null,
    requestHeaders: config != null ? {} : undefined
});

/**
 * Records a user-set request header. Datadog internal headers are ignored,
 * sensitive headers are dropped before being stored.
 * Values are stringified the same way XHR and Fetch coerce them, since
 * untyped callers can pass `null`, numbers, etc.
 */
export const recordRequestHeader = (
    state: HeaderCaptureState,
    header: string,
    value: string
): void => {
    if (
        state.requestHeaders === undefined ||
        isDatadogCustomHeader(header.toLowerCase())
    ) {
        return;
    }
    accumulateRequestHeader(state.requestHeaders, header, String(value));
};

/**
 * Applies rule filtering and size limits to the headers of a completed request.
 * Nothing is reported for aborted or network-error requests (status 0).
 * The request header store is released, so a retained request object does not
 * keep unreported or untruncated header values alive.
 *
 * @param responseHeaders - Response headers keyed by lowercased name.
 */
export const finalizeCapturedHeaders = ({
    state,
    url,
    statusCode,
    responseHeaders
}: {
    state: HeaderCaptureState;
    url: string;
    statusCode: number;
    responseHeaders: () => Record<string, string>;
}): CapturedHeaders => {
    const requestHeaders = state.requestHeaders;
    state.requestHeaders = undefined;

    if (
        state.config === null ||
        requestHeaders === undefined ||
        statusCode === 0
    ) {
        return {};
    }

    const limited = enforceSizeLimits(
        filterRequestHeadersByMode(requestHeaders, url, state.config),
        filterResponseHeaders(responseHeaders(), url, state.config)
    );

    return {
        capturedRequestHeaders: limited.requestHeaders,
        capturedResponseHeaders: limited.responseHeaders
    };
};

/**
 * Converts a Fetch `Headers` object into a record keyed by lowercased name.
 * Blocked headers (sensitive or SDK-injected) are never copied.
 * Some Fetch implementations (e.g. older `expo/fetch`) may not implement
 * `forEach`, in which case no headers are returned.
 */
export const fetchHeadersToRecord = (
    headers: Headers | null | undefined
): Record<string, string> => {
    const result: Record<string, string> = {};
    if (!headers || typeof headers.forEach !== 'function') {
        return result;
    }
    headers.forEach((value: string, name: string) => {
        const lowered = name.toLowerCase();
        if (isHeaderAllowed(lowered)) {
            result[lowered] = value;
        }
    });
    return result;
};
