/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../config/types/SdkVerbosity';
import type { FlagCacheEntry } from '../internal';

import type {
    PrecomputedConfigurationResponse,
    PrecomputedFlag
} from './types';
import { SUPPORTED_VARIATION_TYPES } from './types';

/**
 * Thrown when a configuration cannot be supported by this SDK (e.g. an obfuscated
 * precomputed payload). Callers translate this into a provider error state rather
 * than silently serving wrong data.
 */
export class UnsupportedConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UnsupportedConfigurationError';
    }
}

/**
 * Decode a precomputed CDN response into the `FlagCacheEntry` map that `FlagsClient`
 * caches and evaluates against — the same shape the native CDN fetch returns today.
 *
 * The mapping is ~1:1. Two transforms are applied per flag:
 * - `value` is the typed `variationValue` as-is (`integer`/`float` are JS `number`s);
 * - a string `variationValue` is derived (JSON for objects, `"true"/"false"` for
 *   booleans, `String(...)` otherwise) because native Android exposure tracking
 *   rebuilds the flag from the string form.
 *
 * @throws {UnsupportedConfigurationError} if the response is obfuscated.
 */
export const decodePrecomputedFlags = (
    response: PrecomputedConfigurationResponse
): Record<string, FlagCacheEntry> => {
    const attributes = response?.data?.attributes;

    if (attributes?.obfuscated) {
        // Obfuscated payloads would need key de-hashing / value decoding that this SDK
        // does not implement. Fail predictably instead of mis-mapping hashed keys.
        throw new UnsupportedConfigurationError(
            'Obfuscated precomputed configurations are not supported.'
        );
    }

    const flags = attributes?.flags ?? {};
    // Accumulate in a Map so a pathological flag keyed "__proto__" is stored as data
    // instead of hitting the `Object.prototype` "__proto__" setter (which a plain
    // `obj[key] = ...` assignment would). `Object.fromEntries` then materializes own
    // properties without invoking inherited setters.
    const cache = new Map<string, FlagCacheEntry>();

    for (const [key, flag] of Object.entries(flags)) {
        const entry = toFlagCacheEntry(key, flag);
        if (entry) {
            cache.set(key, entry);
        }
    }

    return Object.fromEntries(cache);
};

const toFlagCacheEntry = (
    key: string,
    flag: PrecomputedFlag
): FlagCacheEntry | null => {
    const { variationType, variationValue } = flag;

    if (!SUPPORTED_VARIATION_TYPES.has(variationType)) {
        InternalLog.log(
            `Flag "${key}" has unsupported variation type "${variationType}". Omitting it from the configuration.`,
            SdkVerbosity.WARN
        );
        return null;
    }

    if (!valueMatchesVariationType(variationValue, variationType)) {
        InternalLog.log(
            `Flag "${key}" value does not match its variation type "${variationType}". Omitting it from the configuration.`,
            SdkVerbosity.WARN
        );
        return null;
    }

    // `serialId` is intentionally not propagated: `FlagCacheEntry` has no slot for it
    // and the native CDN-fetched snapshot omits it too, so dropping it keeps
    // offline/online parity.
    return {
        key,
        value: variationValue,
        allocationKey: flag.allocationKey,
        variationKey: flag.variationKey,
        variationType,
        variationValue: stringifyValue(variationValue),
        reason: flag.reason,
        doLog: flag.doLog,
        extraLogging: flag.extraLogging ?? {}
    };
};

const valueMatchesVariationType = (
    value: unknown,
    variationType: string
): boolean => {
    switch (variationType) {
        case 'boolean':
            return typeof value === 'boolean';
        case 'string':
            return typeof value === 'string';
        case 'number':
        case 'float':
            // Reject NaN/Infinity: native parsers can't round-trip them.
            return typeof value === 'number' && Number.isFinite(value);
        case 'integer':
            // A fractional value under an integer flag would be truncated/mis-parsed
            // natively, so require a whole number.
            return Number.isInteger(value);
        case 'object':
            // Object flags are a JSON object at the root; arrays are not valid values.
            return (
                typeof value === 'object' &&
                value !== null &&
                !Array.isArray(value)
            );
        default:
            return false;
    }
};

/**
 * Derive the string form of a flag value expected by native Android exposure tracking.
 * Objects/arrays are JSON-encoded; everything else uses `String(...)`, which yields
 * lowercase `"true"/"false"` for booleans.
 */
const stringifyValue = (value: unknown): string => {
    if (value === null) {
        return 'null';
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
};
