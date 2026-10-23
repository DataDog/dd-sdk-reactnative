/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { configurationFromRulesBinary } from '@datadog/flagging-core/rules-based';
import type { FlagsConfiguration } from '@datadog/flagging-core';
import { timeStampNow } from '@datadog/flagging-core';

import { version } from './version';

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

export interface RulesConfigurationFetchOptions {
    clientToken: string;
    env: string;
    /** Datadog site domain, such as 'datadoghq.eu'. Defaults to 'datadoghq.com'. */
    site?: string;
    fetch?: typeof globalThis.fetch;
    signal?: AbortSignal;
}

/** Fetches client-distributed rules once, without initializing the SDK or registering tracking. */
export async function fetchRulesConfiguration(
    options: RulesConfigurationFetchOptions
): Promise<FlagsConfiguration> {
    const site = options.site ?? 'datadoghq.com';
    if (!supportedSites.has(site)) {
        throw new Error(`Unsupported site for flagging endpoints: ${site}`);
    }

    // RN's built-in URLSearchParams.set is not implemented on supported versions.
    const url = `https://ufc-client.ff-cdn.${site}/api/v2/feature-flagging/config/rules-based/client?dd_env=${encodeURIComponent(
        options.env
    )}`;
    const fetchedAt = timeStampNow();
    const fetchImplementation = options.fetch ?? globalThis.fetch;
    const response = await fetchImplementation(url, {
        method: 'GET',
        headers: {
            Accept: 'application/protobuf',
            'dd-client-token': options.clientToken,
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

    const configuration = configurationFromRulesBinary(
        new Uint8Array(await response.arrayBuffer())
    );
    if (configuration.rules) {
        configuration.rules.fetchedAt = fetchedAt;
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
