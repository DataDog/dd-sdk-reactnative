/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    EvaluationContext as DdEvaluationContext,
    PrimitiveValue
} from '@datadog/mobile-react-native';
import type { EvaluationContext as OFEvaluationContext } from '@openfeature/web-sdk';

/**
 * Convert an OpenFeature evaluation context into the Datadog Flags shape.
 */
export const toDdContext = (
    context: OFEvaluationContext
): DdEvaluationContext => {
    const { targetingKey, ...attributes } = context;

    // Important ⚠️
    // The Flags SDK doesn't support nested non-primitive values in the evaluation context as per OF.3 FFE SDK requirement.
    // However, we let the SDK handle this inside of FlagsClient since it does this processing anyways.
    const ddContextAttributes = attributes as Record<string, PrimitiveValue>;

    return {
        // Allow flag evaluations without a provided targeting key.
        targetingKey: targetingKey ?? '',
        attributes: ddContextAttributes
    };
};

/**
 * Whether an OpenFeature evaluation context carries no information — no targeting key and no
 * attributes with a defined value (so `{}` and `{ targetingKey: undefined }` are both empty).
 * Used by the offline provider to avoid overwriting a configuration's embedded context with an
 * empty context stamped by the OpenFeature lifecycle.
 *
 * Note: an explicit `targetingKey: ''` is **not** empty. An empty string is a real (anonymous)
 * targeting key — a distinct subject — not the absence of a context. Only a genuinely absent
 * context (`{}` / `clearContext()`) re-adopts the configuration's embedded context; `{ targetingKey:
 * '' }` is reconciled as a real context, so it must match the precomputed snapshot or the provider
 * enters `ERROR` (serving coded defaults) rather than silently serving another subject's flags.
 */
export const isEmptyContext = (context: OFEvaluationContext): boolean => {
    return Object.values(context).every(value => value === undefined);
};
