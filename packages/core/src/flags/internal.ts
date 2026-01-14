import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../SdkVerbosity';

import type { EvaluationContext, FlagDetails } from './types';

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

export const flagCacheEntryToFlagDetails = <T>(
    entry: FlagCacheEntry
): FlagDetails<T> => {
    return {
        key: entry.key,
        value: entry.value as T,
        variant: entry.variationKey,
        reason: entry.reason,
        error: null
    };
};

export const processEvaluationContext = (
    context: EvaluationContext
): EvaluationContext => {
    const { targetingKey } = context;
    let attributes = context.attributes ?? {};

    // Filter out object values from attributes because Android doesn't support nested object values in the evaluation context.
    attributes = Object.fromEntries(
        Object.entries(attributes)
            .filter(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    InternalLog.log(
                        `Nested object value under "${key}" is not supported in the evaluation context. Omitting this atribute from the evaluation context.`,
                        SdkVerbosity.WARN
                    );

                    return false;
                }

                return true;
            })
            .map(([key, value]) => [key, value?.toString() ?? ''])
    );

    return { targetingKey, attributes };
};
