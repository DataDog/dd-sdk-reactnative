/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { AttributeEncoder, Encodable } from './types';
import { formatPathForLog, isPlainObject, warn } from './utils';

const MAX_ATTRIBUTES = 256;

export interface EncodeContext {
    numOfAttributes: number;
    limitReachedWarned?: boolean;
}

/**
 * Recursive in-place encoder: flattens values into `out` dictionary.
 * Never applies "context", that's only for the root.
 */
export function encodeAttributesInPlace(
    input: unknown,
    out: Record<string, Encodable>,
    path: string[],
    encoders: AttributeEncoder<any>[],
    context: EncodeContext = { numOfAttributes: 0 }
): void {
    const value = applyEncoders(input, encoders);

    // Nullish / primitive
    if (
        value === null ||
        value === undefined ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        addEncodedAttribute(out, path, value, context);
        return;
    }

    // Arrays
    if (Array.isArray(value)) {
        const normalize = (x: unknown): Encodable => {
            const v = applyEncoders(x, encoders);

            // Primitive / nullish are fine
            if (
                v === null ||
                v === undefined ||
                typeof v === 'string' ||
                typeof v === 'number' ||
                typeof v === 'boolean'
            ) {
                return v;
            }

            if (isPlainObject(v)) {
                const nested: Record<string, Encodable> = {};
                encodeAttributesInPlace(v, nested, [], encoders, context);
                return nested;
            }

            if (Array.isArray(v)) {
                return v.map(normalize);
            }

            // Unsupported
            warn(
                `Dropped unsupported value in array at '${formatPathForLog(
                    path
                )}': ${String(v)}`
            );
            return undefined;
        };

        addEncodedAttribute(
            out,
            path,
            value.map(normalize).filter(item => item !== undefined),
            context
        );

        return;
    }

    // Plain object
    if (isPlainObject(value)) {
        for (const [k, v] of Object.entries(value)) {
            encodeAttributesInPlace(v, out, [...path, k], encoders, context);
        }
        return;
    }

    // Unsupported
    warn(
        `Dropped unsupported value at '${formatPathForLog(path)}': ${String(
            value
        )}`
    );
}

/**
 * Sanitize unknown input to be JSON-serializable using encoders.
 * This does not flatten—it's a pure sanitization pass (used by some encoders).
 */
export function sanitizeForJson(
    value: unknown,
    encoders: AttributeEncoder<any>[],
    context: EncodeContext = { numOfAttributes: 0 }
): Encodable {
    const v = applyEncoders(value, encoders);

    // If still a plain object, sanitize shallowly
    if (isPlainObject(v)) {
        const out: Record<string, Encodable> = {};
        for (const [k, val] of Object.entries(v)) {
            encodeAttributesInPlace(val, out, [k], encoders, context);
        }
        return out;
    }

    // If array, sanitize items
    if (Array.isArray(v)) {
        return v.map(item => sanitizeForJson(item, encoders, context));
    }

    return v;
}

export function applyEncoders(
    value: unknown,
    encoders: AttributeEncoder<any>[]
): Encodable {
    for (const enc of encoders) {
        try {
            if (enc.check(value)) {
                return enc.encode(value as never);
            }
        } catch (err) {
            warn(`Encoder error: ${String(err)}`);
            return undefined;
        }
    }
    // Not matched by any encoder; leave as-is for the visitor to decide
    return value as Encodable;
}

function addEncodedAttribute(
    out: Record<string, Encodable>,
    path: string[],
    value: Encodable,
    context: EncodeContext
): void {
    out[path.join('.')] = value;
    context.numOfAttributes++;

    if (
        context.numOfAttributes > MAX_ATTRIBUTES &&
        !context.limitReachedWarned
    ) {
        warn(
            `Attribute limit of ${MAX_ATTRIBUTES} exceeded; the backend may drop some attributes.`
        );
        context.limitReachedWarned = true;
    }
}
