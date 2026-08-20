/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../config/types/SdkVerbosity';

import type { EvaluationContext, PrimitiveValue } from './types';

export interface TrackableAssignment {
    key: string;
    value: unknown;
    allocationKey: string;
    variationKey: string;
    variationType: string;
    variationValue: string;
    reason: string;
    doLog: boolean;
    extraLogging: Record<string, unknown>;
}

export type FlagCacheEntry = TrackableAssignment;

export const processEvaluationContext = (
    context: EvaluationContext
): EvaluationContext => {
    const { targetingKey } = context;

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
