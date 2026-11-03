/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../config/types/SdkVerbosity';

import type { EvaluationContext, PrimitiveValue } from './types';

export interface FlagCacheEntry {
    key: string;
    value: unknown;
    allocationKey: string;
    variationKey: string;
    variationType: string;
    variationValue: string;
    reason: string;
    doLog: boolean;
    extraLogging: Record<string, unknown>;
    // Native Android carries split serial IDs as strings across the React Native bridge.
    serialId?: string;
}

export const processEvaluationContext = (
    context: EvaluationContext
): EvaluationContext => {
    let { targetingKey } = context;

    // Validate only the final targeting key, after any RUM/application merge. Its source must
    // not affect validation or cause a fallback to a lower-precedence user's identity.
    // Both online and offline clients share this boundary; native calls require a string.
    if (typeof targetingKey !== 'string') {
        InternalLog.log(
            "The evaluation context targetingKey is not a string. Using the anonymous subject ('') instead.",
            SdkVerbosity.WARN
        );
        targetingKey = '';
    }

    // We should ignore non-primitive values in the context as per FFE SDK requirements OF.3.
    const providedAttributes: Record<string, unknown> =
        context.attributes ?? {};

    // Accumulate in a Map so reserved keys such as "__proto__" are handled as data
    // instead of hitting the Object.prototype setter (which would silently drop them or
    // pollute the prototype). Object.fromEntries then materializes own properties safely.
    const attributes = new Map<string, PrimitiveValue>();

    for (const [key, value] of Object.entries(providedAttributes)) {
        const isPrimitiveValue =
            typeof value === 'boolean' ||
            typeof value === 'string' ||
            typeof value === 'number' ||
            value === undefined ||
            value === null;

        if (!isPrimitiveValue) {
            InternalLog.log(
                `Non-primitive context value under "${key}" is not supported. Omitting this attribute from the evaluation context.`,
                SdkVerbosity.WARN
            );

            continue;
        }

        if (value === undefined) {
            continue;
        }

        attributes.set(key, value as PrimitiveValue);
    }

    return {
        targetingKey,
        attributes: Object.fromEntries(attributes)
    };
};

/** Telemetry identity is distinct from the normalized assignment subject. */
export const telemetryTargetingKey = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    for (let index = 0; index < value.length; index += 1) {
        const unit = value.charCodeAt(index);
        if (unit >= 0xd800 && unit <= 0xdbff) {
            const next = value.charCodeAt(index + 1);
            if (!(next >= 0xdc00 && next <= 0xdfff)) {
                return null;
            }
            index += 1;
        } else if (unit >= 0xdc00 && unit <= 0xdfff) {
            return null;
        }
    }
    return value;
};
