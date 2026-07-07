/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { processEvaluationContext } from '../internal';
import type { EvaluationContext, PrimitiveValue } from '../types';

import type { WireEvaluationContext } from './types';

/**
 * Normalize a wire (OpenFeature-flat) evaluation context into the SDK's internal
 * `{ targetingKey, attributes }` shape, applying the **same** processing the active
 * context went through (`processEvaluationContext`) so the two are comparable — the
 * flat wire shape and the internal shape are otherwise never equal.
 */
export const normalizeWireContext = (
    wireContext: WireEvaluationContext
): EvaluationContext => {
    const { targetingKey, ...attributes } = wireContext;

    return processEvaluationContext({
        targetingKey: targetingKey ?? '',
        // `processEvaluationContext` drops non-primitive attributes; casting here mirrors
        // how the active context's attributes are typed before that same processing.
        attributes: attributes as Record<string, PrimitiveValue>
    });
};

/**
 * Whether a precomputed configuration's embedded context matches the active evaluation
 * context.
 *
 * - A configuration with **no** embedded context is context-agnostic and matches any
 *   active context.
 * - Otherwise the embedded context must match the active context exactly (after
 *   normalizing both through the same processing).
 */
export const contextMatchesConfiguration = (
    wireContext: WireEvaluationContext | undefined,
    activeContext: EvaluationContext
): boolean => {
    if (!wireContext) {
        return true;
    }

    return contextsEqual(normalizeWireContext(wireContext), activeContext);
};

const contextsEqual = (a: EvaluationContext, b: EvaluationContext): boolean => {
    if (a.targetingKey !== b.targetingKey) {
        return false;
    }

    return attributesEqual(a.attributes ?? {}, b.attributes ?? {});
};

/**
 * Compare two attribute maps. After `processEvaluationContext`, attribute values are
 * primitives, so a key-set + strict-value comparison is sufficient.
 */
const attributesEqual = (
    a: Record<string, PrimitiveValue>,
    b: Record<string, PrimitiveValue>
): boolean => {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    if (aKeys.length !== bKeys.length) {
        return false;
    }

    return aKeys.every(key => a[key] === b[key]);
};
