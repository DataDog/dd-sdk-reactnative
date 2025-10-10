/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* ----------------------------------------
 * Built-in encoders
 * -------------------------------------- */
import { DdSdk } from '../DdSdk';

import {
    getErrorMessage,
    getErrorName,
    getErrorStackTrace
} from './errorUtils';
import { encodeAttributesInPlace, sanitizeForJson } from './helpers';
import type { AttributeEncoder, Encodable } from './types';
import { warn } from './utils';

/** Primitives: keep them explicit so the full pipeline is used uniformly. */
export const stringEncoder: AttributeEncoder<string> = {
    check: (v): v is string => typeof v === 'string',
    encode: v => v
};

export const numberEncoder: AttributeEncoder<number> = {
    check: (v): v is number => typeof v === 'number',
    encode: v => (Number.isFinite(v) ? v : undefined) // drop non-finite
};

export const booleanEncoder: AttributeEncoder<boolean> = {
    check: (v): v is boolean => typeof v === 'boolean',
    encode: v => v
};

export const nullishEncoder: AttributeEncoder<null | undefined> = {
    check: (v): v is null | undefined => v === null || v === undefined,
    encode: v => v
};

/**
 * Array encoder:
 * - Sanitizes each item through the encoder pipeline.
 * - Returns the sanitized array (it may later be flattened by the visitor if it still contains objects).
 */
export const arrayEncoder: AttributeEncoder<unknown[]> = {
    check: Array.isArray,
    encode: (arr: unknown[]) =>
        arr.map(x =>
            sanitizeForJson(x, [...DdSdk.attributeEncoders, ...builtInEncoders])
        )
};

/**
 * Default Datadog Date Encoder.
 * This does not make assumptions on format; uses String(date).
 */
export const dateEncoder: AttributeEncoder<Date> = {
    check: (v: unknown): v is Date => v instanceof Date,
    encode: (d: Date) => String(d)
};
/*
            } else if ('componentStack' in error) {
                stack = String(error.componentStack);
            } else if (
                'sourceURL' in error &&
                'line' in error &&
                'column' in error
            ) {


*/
/**
 * Extended Error Encoder.
 * Serializes name, message, stack, and cause (ES2022+) for Error objects.
 * If the error has other enumerable properties, they are included and sanitized.
 */
export const errorEncoder: AttributeEncoder<any> = {
    check: (v: unknown): v is Error => v instanceof Error,
    encode: (e: any) => {
        const extraAttributes: Record<string, Encodable> = {};

        // In React Native, some errors have extra fields we want to capture
        if (e && typeof e === 'object') {
            const allEncoders = [
                ...DdSdk.attributeEncoders,
                ...builtInEncoders
            ];
            encodeAttributesInPlace(e, extraAttributes, [], allEncoders);
        }

        // Remove fields that are duplicated in the dedicated fields below
        if ('stacktrace' in e) {
            delete extraAttributes['stacktrace'];
        } else if ('stack' in e) {
            delete extraAttributes['stack'];
        } else if ('componentStack' in e) {
            delete extraAttributes['componentStack'];
        }

        return {
            ...extraAttributes,
            name: getErrorName(e),
            message: getErrorMessage(e),
            stack: getErrorStackTrace(e),
            cause: (e as any).cause
        };
    }
};

/**
 * Map encoder:
 * - Converts Map into an array of entries.
 * - Each entry is { key: string, keyType: string, value: Encodable }.
 * - Keys are stringified with type info to reduce collision risk.
 * - Entries with un-stringifiable keys are dropped (with a warning).
 */
export const mapEncoder: AttributeEncoder<Map<unknown, unknown>> = {
    check: (v: unknown): v is Map<unknown, unknown> => v instanceof Map,
    encode: (map: Map<any, any>) => {
        const entries: Encodable[] = [];

        for (const [k, v] of map.entries()) {
            try {
                const keyType = typeof k;
                let keyStr: string;

                if (k === null) {
                    keyStr = 'null';
                } else if (k === undefined) {
                    keyStr = 'undefined';
                } else if (
                    keyType === 'string' ||
                    keyType === 'number' ||
                    keyType === 'boolean' ||
                    keyType === 'bigint'
                ) {
                    keyStr = String(k);
                } else if (typeof k === 'symbol') {
                    keyStr = k.description
                        ? `Symbol(${k.description})`
                        : 'Symbol';
                } else if (typeof k === 'object' || typeof k === 'function') {
                    // Try to get a descriptive form
                    if (typeof (k as any).toString === 'function') {
                        keyStr = (k as any).toString();
                    } else {
                        keyStr = Object.prototype.toString.call(k); // e.g. "[object Object]"
                    }
                } else {
                    warn(
                        `Dropping Map entry: unsupported key type "${keyType}".`
                    );
                    continue;
                }

                const allEncoders = [
                    ...DdSdk.attributeEncoders,
                    ...builtInEncoders
                ];
                entries.push({
                    key: keyStr,
                    keyType,
                    value: sanitizeForJson(v, allEncoders)
                });
            } catch (err) {
                warn(`Failed to encode Map key: ${k}. ERROR: ${String(err)}`);
            }
        }

        return entries;
    }
};

export const builtInEncoders = [
    stringEncoder,
    numberEncoder,
    booleanEncoder,
    nullishEncoder,
    arrayEncoder,
    dateEncoder,
    errorEncoder,
    mapEncoder
];
