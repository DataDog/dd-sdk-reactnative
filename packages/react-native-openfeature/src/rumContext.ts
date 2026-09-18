/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import * as DatadogSdk from '@datadog/mobile-react-native';
import type {
    EvaluationContext,
    EvaluationContextValue
} from '@openfeature/web-sdk';

/**
 * An application context that permits top-level undefined values to remove RUM defaults.
 * Unlike OpenFeature's EvaluationContext, this input can contain these explicit tombstones.
 * If enrichment cannot run, the context is returned unchanged, including undefined values.
 */
export type EnrichableEvaluationContext = {
    targetingKey?: string | undefined;
} & Record<string, EvaluationContextValue | undefined>;

type RumContextEnricher = typeof DatadogSdk.__ddEnrichEvaluationContextWithRumUser;

/**
 * Explicitly add the current RUM user to an OpenFeature evaluation context.
 *
 * The helper reads the RUM user each time it is called and returns a new context; it does not keep
 * the OpenFeature context synchronized when the RUM user changes. The RUM user ID supplies the
 * targeting key, while flat primitive user properties supply attributes. Application fields take
 * precedence, and an explicitly undefined application field removes the corresponding RUM value
 * from the returned context when enrichment succeeds.
 *
 * If the core SDK's enrichment helper is unavailable, logs a warning and returns the application
 * context unchanged so OpenFeature initialization and evaluation can continue without RUM values.
 */
export const enrichRumContext = (
    context: EnrichableEvaluationContext
): EvaluationContext => {
    const enricher = (DatadogSdk as {
        __ddEnrichEvaluationContextWithRumUser?: RumContextEnricher;
    }).__ddEnrichEvaluationContextWithRumUser;

    if (typeof enricher !== 'function') {
        // InternalLog may also be absent from the core module, or have verbosity disabled.
        // eslint-disable-next-line no-console
        console.warn(
            'DATADOG: `enrichRumContext` could not find a callable `__ddEnrichEvaluationContextWithRumUser` on @datadog/mobile-react-native, so the RUM user was not added and the application context is used unchanged. Update @datadog/mobile-react-native to at least the version of @datadog/mobile-react-native-openfeature, check for a duplicate install with `npm ls @datadog/mobile-react-native`, and make sure any test mock of the module preserves the real one (use `@datadog/mobile-react-native/jest`, or spread `jest.requireActual`).'
        );

        return context as EvaluationContext;
    }

    return enricher(context) as EvaluationContext;
};
