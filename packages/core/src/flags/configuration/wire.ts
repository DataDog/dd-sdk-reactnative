/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { configurationFromString } from '@datadog/flagging-core';

import type { ConfigurationWire, ParsedFlagsConfiguration } from './types';

// Parsing is reused from `@datadog/flagging-core` (the canonical wire implementation)
// rather than reimplemented here. It is lenient: it returns an empty configuration
// (`{}`) for malformed input or an unsupported wire version rather than throwing.
export { configurationFromString };

/**
 * Serialize an in-memory {@link ParsedFlagsConfiguration} back into a portable
 * `ConfigurationWire` string that `configurationFromString` can read.
 *
 * The serialized format is unspecified/opaque and may change between versions.
 *
 * TODO: replace this with `@datadog/flagging-core`'s `configurationToString` once the
 * next major version (>= 2.0.0) lands. flagging-core 1.2.x has a broken serializer
 * (it stringifies the whole `precomputed` object into `precomputed.response` instead of
 * just `.response`, which double-nests the response and drops every flag on a
 * serialize→parse round-trip — https://github.com/DataDog/openfeature-js-client/pull/331).
 * Until the fix ships, we keep this correct local copy and depend on flagging-core only
 * for `configurationFromString`.
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
