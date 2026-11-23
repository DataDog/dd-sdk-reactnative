/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { buildEndpointHost } from '@datadog/flagging-core';

import { reportSelectionError } from './flagSelection';

const FLAG_SELECTION_IGNORED_REASONS: ReadonlySet<string> = new Set([
    'malformed_selection',
    'too_many_values',
    'invalid_key_pattern',
    'invalid_tag',
    'tag_load_failed'
]);
const MAX_FLAG_SELECTION_IGNORED_REASON_LENGTH = 32;

export const defaultLogger = {
    error(message: string): void {
        // Fetching must not load the native SDK; warnings also avoid LogBox errors.
        // eslint-disable-next-line no-console
        console.warn(`DATADOG: ${message}`);
    }
};

export function buildConfigurationUrl(
    site: string | undefined,
    env: string,
    endpoint: 'rules' | 'precomputed'
): string {
    const host = buildEndpointHost(
        site ?? 'datadoghq.com',
        endpoint === 'rules' ? 'ufc-client' : 'preview'
    );
    const path =
        endpoint === 'rules'
            ? '/api/v2/feature-flagging/config/rules-based/client'
            : '/precompute-assignments';
    // URLSearchParams.set is not implemented on all supported RN versions.
    return `https://${host}${path}?dd_env=${encodeURIComponent(env)}`;
}

export function reportIgnoredSelection(
    response: Response,
    logger: { error(message: string): void }
): void {
    const value = response.headers?.get('DD-Flag-Selection-Ignored');
    if (value) {
        // Proxies can reflect caller data or join repeated headers; report only known reasons.
        const reason =
            value.length <= MAX_FLAG_SELECTION_IGNORED_REASON_LENGTH &&
            FLAG_SELECTION_IGNORED_REASONS.has(value)
                ? value
                : 'unknown';
        reportSelectionError(
            logger,
            `flagSelection was ignored by the server (${reason}). Loaded the full flag configuration.`
        );
    }
}

export async function getErrorMessage(response: Response): Promise<string> {
    const contentType = response.headers
        ?.get('content-type')
        ?.split(';')[0]
        .trim();
    if (
        contentType === 'application/vnd.api+json' ||
        contentType === 'application/json'
    ) {
        try {
            const body = await response.json();
            const detail = body?.errors?.[0]?.detail;
            if (typeof detail === 'string' && detail.length > 0) {
                return detail;
            }
        } catch (error) {
            const name = (error as Error)?.name;
            if (name === 'AbortError' || name === 'TimeoutError') {
                throw error;
            }
            // Preserve the HTTP failure even when its error body is not valid JSON.
        }
    }
    return response.statusText || `HTTP ${response.status}`;
}
