/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    FlagsConfiguration,
    PrecomputedConfiguration,
    PrecomputedConfigurationResponse as FlaggingCorePrecomputedConfigurationResponse,
    PrecomputedFlag as FlaggingCorePrecomputedFlag
} from '@datadog/flagging-core';

/**
 * The flag `variationType`s the decoder accepts. `@datadog/flagging-core` models the
 * type as OpenFeature's `boolean | string | number | object`, and the CDN confirms only
 * those are emitted. `integer`/`float` are kept here defensively — the decoder validates
 * untrusted payloads and treats both as JavaScript `number`s.
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

// The wire/precomputed types are re-exported from `@datadog/flagging-core` so this SDK
// shares the canonical shapes instead of maintaining its own copies. Local names are
// kept so the rest of the SDK is insulated from the upstream naming.
export type PrecomputedFlag = FlaggingCorePrecomputedFlag;
export type PrecomputedConfigurationResponse = FlaggingCorePrecomputedConfigurationResponse;
export type ParsedPrecomputedConfiguration = PrecomputedConfiguration;
export type ParsedFlagsConfiguration = FlagsConfiguration;

/**
 * The serialized `ConfigurationWire` envelope (version 1). `@datadog/flagging-core`
 * keeps its own wire envelope internal, so this mirrors the shape for our local
 * {@link configurationToString} (see wire.ts).
 */
export interface ConfigurationWire {
    version: 1;
    precomputed?: {
        response: string;
        context?: WireEvaluationContext;
        fetchedAt?: number;
    };
}
