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
}

export const processEvaluationContext = (
    context: EvaluationContext
): EvaluationContext => {
    const { targetingKey } = context;

    // We should ignore non-primitive values in the context as per FFE SDK requirements OF.3.
    const providedAttributes: Record<string, unknown> =
        context.attributes ?? {};

    const attributes: Record<string, PrimitiveValue> = {};

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

        attributes[key] = value;
    }

    return {
        targetingKey,
        attributes
    };
};
