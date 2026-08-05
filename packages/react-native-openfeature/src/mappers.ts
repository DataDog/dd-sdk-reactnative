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
 * Convert an OpenFeature context for offline evaluation without inventing a targeting key.
 * Rules distinguish a missing targeting key from an empty targeting key.
 */
export const toDdContextPreservingTargetingKey = (
    context: OFEvaluationContext
): DdEvaluationContext => {
    const { targetingKey, ...attributes } = context;
    const ddContext = {
        attributes: attributes as Record<string, PrimitiveValue>
    } as DdEvaluationContext;

    if (targetingKey !== undefined) {
        ddContext.targetingKey = targetingKey;
    }

    return ddContext;
};
