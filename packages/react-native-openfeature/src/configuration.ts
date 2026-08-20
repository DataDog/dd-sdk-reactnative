/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ParsedFlagsConfiguration } from '@datadog/mobile-react-native';
import type {
    EvaluationContext,
    EvaluationContextValue
} from '@openfeature/web-sdk';

// TODO(FFL-2837): Delete this local helper and its clone-semantics tests after a
// flagging-core release contains DataDog/openfeature-js-client#344 through
// `78a0c14`, including merged PR #353, and `@datadog/mobile-react-native`
// re-exports the upstream package-root helper.
// Import and re-export `getPrecomputedContext` from the React Native SDK instead.
// Raise the React Native SDK peer and development dependency minimums to the first
// release that exports it. Replace these semantic tests with one package-root
// forwarding test. Keep the provider and bootstrap integration tests.
const cloneContextValue = (
    value: EvaluationContextValue
): EvaluationContextValue => {
    if (value instanceof Date) {
        return new Date(value.getTime());
    }

    if (Array.isArray(value)) {
        return value.map(cloneContextValue);
    }

    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [
                key,
                cloneContextValue(nestedValue)
            ])
        );
    }

    return value;
};

const cloneEvaluationContext = (
    context: EvaluationContext
): EvaluationContext => {
    return Object.fromEntries(
        Object.entries(context).map(([key, value]) => [
            key,
            cloneContextValue(value)
        ])
    );
};

/**
 * Return the evaluation context from a precomputed configuration.
 *
 * The returned context is a detached copy. Setting it as the OpenFeature context is an explicit
 * application operation; this function does not modify OpenFeature or provider state. It returns
 * `undefined` when the configuration has no context-specific precomputed branch.
 */
export const getPrecomputedContext = (
    configuration: ParsedFlagsConfiguration
): EvaluationContext | undefined => {
    const context = configuration.precomputed?.context;

    if (context === undefined) {
        return undefined;
    }

    return cloneEvaluationContext(context);
};
