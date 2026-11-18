/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { reportSelectionError } from './flagSelection';

const supportedSites = new Set([
    'datadoghq.com',
    'us3.datadoghq.com',
    'us5.datadoghq.com',
    'ap1.datadoghq.com',
    'ap2.datadoghq.com',
    'uk1.datadoghq.com',
    'datadoghq.eu',
    'datad0g.com'
]);
const ignoredReasons: ReadonlySet<string> = new Set([
    'malformed_selection',
    'too_many_values',
    'invalid_key_pattern',
    'invalid_tag',
    'tag_load_failed'
]);

export function buildConfigurationUrl(
    site = 'datadoghq.com',
    env: string,
    endpoint: 'rules' | 'precomputed'
): string {
    if (!supportedSites.has(site)) {
        throw new Error(`Unsupported site for flagging endpoints: ${site}`);
    }
    const host = endpoint === 'rules' ? 'ufc-client' : 'preview';
    const path =
        endpoint === 'rules'
            ? '/api/v2/feature-flagging/config/rules-based/client'
            : '/precompute-assignments';
    // URLSearchParams.set is not implemented on all supported RN versions.
    return `https://${host}.ff-cdn.${site}${path}?dd_env=${encodeURIComponent(
        env
    )}`;
}

export function reportIgnoredSelection(
    response: Response,
    logger: { error(message: string): void }
): void {
    const value = response.headers.get('DD-Flag-Selection-Ignored');
    if (value) {
        const reason =
            value.length <= 32 && ignoredReasons.has(value) ? value : 'unknown';
        reportSelectionError(
            logger,
            `flagSelection was ignored by the server (${reason}). Loaded the full flag configuration.`
        );
    }
}

export async function getErrorMessage(response: Response): Promise<string> {
    const contentType = response.headers
        .get('content-type')
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
        } catch {
            // Preserve the HTTP failure even when its error body is not valid JSON.
        }
    }
    return response.statusText || `HTTP ${response.status}`;
}
