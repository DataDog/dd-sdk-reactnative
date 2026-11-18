/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { configurationFromRulesBinary } from '@datadog/flagging-core/rules-based';
import type { FlagSelection, FlagsConfiguration } from '@datadog/flagging-core';
import { timeStampNow } from '@datadog/flagging-core';

import {
    buildConfigurationUrl,
    getErrorMessage,
    reportIgnoredSelection
} from './configurationFetchUtils';
import { applyFlagSelection } from './flagSelection';
import { version } from './version';

export interface RulesConfigurationFetchOptions {
    clientToken: string;
    env: string;
    /** Datadog site domain, such as 'datadoghq.eu'. Defaults to 'datadoghq.com'. */
    site?: string;
    /** Request flags matching any of these tags or key patterns. Invalid or over-limit selections are not sent. */
    flagSelection?: FlagSelection;
    /** Reports dropped or server-ignored selections. Defaults to console. */
    logger?: { error(message: string): void };
    fetch?: typeof globalThis.fetch;
    signal?: AbortSignal;
}

/** Fetches client-distributed rules once, without initializing the SDK or registering tracking. */
export async function fetchRulesConfiguration(
    options: RulesConfigurationFetchOptions
): Promise<FlagsConfiguration> {
    const baseUrl = buildConfigurationUrl(options.site, options.env, 'rules');
    const logger = options.logger ?? console;
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
    if (selected) {
        reportIgnoredSelection(response, logger);
    }
    return configuration;
}
