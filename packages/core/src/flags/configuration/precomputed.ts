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
 * @throws {UnsupportedConfigurationError} if the response is obfuscated, or its envelope is
 * structurally malformed (missing/non-object `data.attributes.flags`).
 */
export const decodePrecomputedFlags = (
    response: PrecomputedConfigurationResponse
): Map<string, FlagCacheEntry> => {
    const attributes = response?.data?.attributes;

    // `obfuscated` is not part of flagging-core's response type, but the CDN payload
    // carries it. Read it defensively so obfuscated payloads are still rejected:
    // de-hashing keys / decoding values is not implemented here, so fail predictably
    // instead of mis-mapping hashed keys.
    if ((attributes as { obfuscated?: boolean } | undefined)?.obfuscated) {
        throw new UnsupportedConfigurationError(
            'Obfuscated precomputed configurations are not supported.'
        );
    }

    // Validate the response envelope before trusting it. An untrusted wire can be JSON-valid yet
    // structurally malformed (a null/non-object envelope, or a `flags` that is null or an array).
    // Fail predictably so the caller classifies it as an error instead of silently decoding it to
    // an empty — but "ready" — configuration. A genuinely empty `flags: {}` is still accepted.
    const flags = attributes?.flags;
    if (!isFlagsMap(flags)) {
        throw new UnsupportedConfigurationError(
            "Malformed precomputed configuration: 'data.attributes.flags' must be an object."
        );
    }

    // A Map (returned as-is) so a pathological flag keyed "__proto__" is stored as data
    // and later looked up via `.get()` — never hitting the `Object.prototype` "__proto__"
    // setter (on write) or the prototype chain (on read) the way a plain object would.
    const cache = new Map<string, FlagCacheEntry>();

    for (const [key, flag] of Object.entries(flags)) {
        const entry = toFlagCacheEntry(key, flag);
        if (entry) {
            cache.set(key, entry);
        }
    }

    return cache;
};

// A well-formed flags container is a plain object (a possibly-empty map of flag key -> flag).
// `null`, arrays, and primitives are malformed envelopes.
const isFlagsMap = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const toFlagCacheEntry = (
    key: string,
    flag: unknown
): FlagCacheEntry | null => {
    // A malformed payload can carry a non-object flag (e.g. `flags: { "k": null }`).
    // Skip the bad entry with a warning instead of throwing and aborting decoding of
    // the whole configuration.
    if (typeof flag !== 'object' || flag === null) {
        InternalLog.log(
            `Flag "${key}" is not an object. Omitting it from the configuration.`,
            SdkVerbosity.WARN
        );
        return null;
    }

    const {
        variationType,
        variationValue,
        variationKey,
        allocationKey,
        reason,
        doLog,
        extraLogging
    } = flag as Partial<PrecomputedFlag>;

    if (
        typeof variationType !== 'string' ||
        !SUPPORTED_VARIATION_TYPES.has(variationType)
    ) {
        InternalLog.log(
            `Flag "${key}" has an unsupported variation type "${String(
                variationType
            )}". Omitting it from the configuration.`,
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

    // The remaining fields feed evaluation and native exposure tracking. A corrupt
    // payload could carry wrong types here, so validate before forwarding them.
    if (
        typeof allocationKey !== 'string' ||
        typeof variationKey !== 'string' ||
        typeof reason !== 'string' ||
        typeof doLog !== 'boolean' ||
        // `extraLogging` must be a key/value map; an array (also `typeof === 'object'`) would
        // break native exposure tracking that expects an object, so treat it as malformed.
        (extraLogging !== undefined &&
            (typeof extraLogging !== 'object' ||
                extraLogging === null ||
                Array.isArray(extraLogging)))
    ) {
        InternalLog.log(
            `Flag "${key}" has malformed metadata. Omitting it from the configuration.`,
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
        allocationKey,
        variationKey,
        variationType,
        variationValue: stringifyValue(variationValue),
        reason,
        doLog,
        extraLogging: extraLogging ?? {}
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
            // The `object` variation type carries JSON. ffe-service enforces a top-level object at
            // the API layer, so in practice the value is an object; that is not a storage
            // constraint, so a malformed or hand-crafted payload could still carry any JSON value
            // here. Accept it at decode (and stringify it for native tracking); a non-object value
            // is then served the coded default with TYPE_MISMATCH at evaluation — see
            // `FlagsClient.getObjectDetails`. So this only affects malformed wires, never the
            // guaranteed-object values from a real Datadog config.
            return true;
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
