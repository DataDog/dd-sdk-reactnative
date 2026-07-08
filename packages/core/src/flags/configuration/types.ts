/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * The flag `variationType`s emitted by the precomputed CDN response.
 *
 * `integer` and `float` are distinct on the wire but both map to a JavaScript
 * `number` when decoded (JS has no int/float distinction). The original string is
 * preserved on the {@link FlagCacheEntry} so native exposure tracking round-trips.
 */
export const SUPPORTED_VARIATION_TYPES: ReadonlySet<string> = new Set([
    'boolean',
    'string',
    'number',
    'integer',
    'float',
    'object'
]);

/**
 * The context an evaluation is performed against, as it appears **on the wire**.
 *
 * This is the OpenFeature-shaped context: a flat object with an optional
 * `targetingKey` and arbitrary sibling attributes. It is intentionally different
 * from the SDK's internal `EvaluationContext` (`{ targetingKey, attributes }`);
 * callers must normalize before comparing the two.
 */
export type WireEvaluationContext = {
    targetingKey?: string;
} & Record<string, unknown>;

/**
 * A single precomputed flag assignment as it appears inside the CDN response.
 *
 * `variationValue` is the already-typed value (e.g. the boolean `false`, the number
 * `1.5`, or a JSON object), not a string.
 */
export interface PrecomputedFlag {
    variationType: string;
    variationValue: unknown;
    variationKey: string;
    allocationKey: string;
    reason: string;
    doLog: boolean;
    extraLogging?: Record<string, unknown>;
    serialId?: number | null;
}

/**
 * The precomputed assignments payload returned by the CDN (the JSON that is encoded
 * as the `precomputed.response` string on the wire).
 */
export interface PrecomputedConfigurationResponse {
    data: {
        id?: string;
        type?: string;
        attributes: {
            // Only `flags` is load-bearing (and `obfuscated`, which gates support). The
            // remaining fields are metadata the decoder ignores; typed loosely/optional
            // on purpose so payload variation across environments doesn't matter.
            obfuscated?: boolean;
            createdAt?: string;
            format?: string;
            environment?: { name?: string };
            flags: Record<string, PrecomputedFlag>;
        };
    };
}

/**
 * In-memory precomputed configuration: the parsed CDN response plus the metadata
 * that travelled alongside it on the wire.
 */
export interface ParsedPrecomputedConfiguration {
    /** The parsed CDN response (decoded from the wire's `response` string). */
    response: PrecomputedConfigurationResponse;
    /** The evaluation context the assignments were computed for, if any. */
    context?: WireEvaluationContext;
    /** Milliseconds since the Unix epoch when the configuration was fetched. */
    fetchedAt?: number;
}

/**
 * The in-memory configuration the SDK operates on, parsed from a `ConfigurationWire`
 * string via {@link configurationFromString}.
 *
 * Named distinctly from the `enable()` options type (`FlagsConfiguration`) to avoid a
 * collision.
 */
export interface ParsedFlagsConfiguration {
    precomputed?: ParsedPrecomputedConfiguration;
}

/**
 * The serialized `ConfigurationWire` envelope (version 1). Internal to this module;
 * the only public entry/exit points are {@link configurationFromString} /
 * {@link configurationToString}.
 */
export interface ConfigurationWire {
    version: 1;
    precomputed?: {
        response: string;
        context?: WireEvaluationContext;
        fetchedAt?: number;
    };
}
