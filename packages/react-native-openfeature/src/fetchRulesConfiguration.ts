/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { configurationFromRulesBinary } from '@datadog/flagging-core/rules-based';
import type { FlagSelection, FlagsConfiguration } from '@datadog/flagging-core';
import { buildEndpointHost, timeStampNow } from '@datadog/flagging-core';

import { applyFlagSelection, reportSelectionError } from './flagSelection';
import { version } from './version';

const FLAG_SELECTION_IGNORED_REASONS: ReadonlySet<string> = new Set([
    'malformed_selection',
    'too_many_values',
    'invalid_key_pattern',
    'invalid_tag',
    'tag_load_failed'
]);
const MAX_FLAG_SELECTION_IGNORED_REASON_LENGTH = 32;

const defaultLogger = {
    error(message: string): void {
        // Fetching must not load the native SDK; warnings also avoid LogBox errors.
        // eslint-disable-next-line no-console
        console.warn(`DATADOG: ${message}`);
    }
};

export interface RulesConfigurationFetchOptions {
    clientToken: string;
    env: string;
    /** RUM application ID sent as dd-application-id for per-application usage attribution. */
    applicationId?: string;
    /** Datadog site domain, such as 'datadoghq.eu'. Defaults to 'datadoghq.com'. */
    site?: string;
    /** Request flags matching any of these tags or key patterns. Invalid or over-limit selections are not sent. */
    flagSelection?: FlagSelection;
    /** Reports dropped or server-ignored selections. Defaults to a prefixed console warning. */
    logger?: { error(message: string): void };
    fetch?: typeof globalThis.fetch;
    signal?: AbortSignal;
}

/** Fetches client-distributed rules once, without initializing the SDK or registering tracking. */
export async function fetchRulesConfiguration(
    options: RulesConfigurationFetchOptions
): Promise<FlagsConfiguration> {
    const host = buildEndpointHost(
        options.site ?? 'datadoghq.com',
        'ufc-client'
    );

    // RN's built-in URLSearchParams.set is not implemented on supported versions.
    const baseUrl = `https://${host}/api/v2/feature-flagging/config/rules-based/client?dd_env=${encodeURIComponent(
        options.env
    )}`;
    const logger = options.logger ?? defaultLogger;
    const { url, selected } = applyFlagSelection(
        baseUrl,
        options.flagSelection,
        logger
    );
    const fetchedAt = timeStampNow();
    const fetchImplementation = options.fetch ?? globalThis.fetch;
    const response = await fetchImplementation(url, {
        method: 'GET',
        headers: {
            Accept: 'application/protobuf',
            'dd-client-token': options.clientToken,
            ...(options.applicationId && {
                'dd-application-id': options.applicationId
            }),
            'DD-Client-Library-Language': 'react-native',
            'DD-Client-Library-Version': version
        },
        signal: options.signal
    });
    if (!response.ok) {
        throw new Error(
            `Failed to fetch flag configuration: ${await getErrorMessage(
                response
            )}`
        );
    }

    let body: ArrayBuffer;
    try {
        body = await response.arrayBuffer();
    } catch (error) {
        if (
            error instanceof Error &&
            error.message === 'FileReader.readAsArrayBuffer is not implemented'
        ) {
            throw Object.assign(
                new Error(
                    'Use React Native 0.72 or later, or pass a fetch implementation that supports Response.arrayBuffer()'
                ),
                { cause: error }
            );
        }
        throw error;
    }
    const configuration = configurationFromRulesBinary(new Uint8Array(body));
    if (configuration.rules) {
        configuration.rules.fetchedAt = fetchedAt;
    }
    if (selected) {
        const value = response.headers.get('DD-Flag-Selection-Ignored');
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
    return configuration;
}

async function getErrorMessage(response: Response): Promise<string> {
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
