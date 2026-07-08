/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    ConfigurationWire,
    ParsedFlagsConfiguration,
    PrecomputedConfigurationResponse
} from './types';

/**
 * Parse a portable `ConfigurationWire` string into an in-memory
 * {@link ParsedFlagsConfiguration}.
 *
 * Parsing is **lenient**: an empty configuration (`{}`) is returned for malformed
 * input or an unsupported wire version rather than throwing. Predictable failure is
 * surfaced later, at the `setConfiguration`/provider layer, from an empty/absent
 * configuration.
 *
 * @param wire A `ConfigurationWire` string (as produced by {@link configurationToString}).
 */
export const configurationFromString = (
    wire: string
): ParsedFlagsConfiguration => {
    try {
        const parsed: Partial<ConfigurationWire> = JSON.parse(wire);

        // Only version 1 is supported. Any other version (or none) is treated as
        // an unusable empty configuration rather than throwing.
        if (parsed?.version !== 1) {
            return {};
        }

        const configuration: ParsedFlagsConfiguration = {};

        if (parsed.precomputed) {
            const response: PrecomputedConfigurationResponse = JSON.parse(
                parsed.precomputed.response
            );

            configuration.precomputed = {
                response,
                context: parsed.precomputed.context,
                fetchedAt: parsed.precomputed.fetchedAt
            };
        }

        // The `server` (rules/UFC) branch is intentionally not parsed here — it is
        // reserved for future work. Leaving it unhandled keeps this MVP precomputed-only.

        return configuration;
    } catch {
        return {};
    }
};

/**
 * Serialize an in-memory {@link ParsedFlagsConfiguration} back into a portable
 * `ConfigurationWire` string that {@link configurationFromString} can read.
 *
 * The serialized format is unspecified/opaque and may change between versions.
 */
export const configurationToString = (
    configuration: ParsedFlagsConfiguration
): string => {
    const wire: ConfigurationWire = { version: 1 };

    if (configuration.precomputed) {
        wire.precomputed = {
            response: JSON.stringify(configuration.precomputed.response),
            context: configuration.precomputed.context,
            fetchedAt: configuration.precomputed.fetchedAt
        };
    }

    return JSON.stringify(wire);
};
