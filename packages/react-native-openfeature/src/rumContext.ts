/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import * as DatadogSdk from '@datadog/mobile-react-native';
import type { EvaluationContext } from '@openfeature/web-sdk';

type RumContextEnricher = (context: EvaluationContext) => EvaluationContext;

/**
 * Explicitly add the current RUM user to an OpenFeature evaluation context.
 *
 * The helper reads the RUM user each time it is called and returns a new context; it does not keep
 * the OpenFeature context synchronized when the RUM user changes. The RUM user ID supplies the
 * targeting key, while flat primitive user properties supply attributes. Application fields take
 * precedence, and an explicitly undefined application field removes the corresponding RUM value
 * from the returned context.
 */
export const enrichRumContext = (
    context: EvaluationContext
): EvaluationContext => {
    const enricher = (DatadogSdk as {
        __ddEnrichEvaluationContextWithRumUser?: RumContextEnricher;
    }).__ddEnrichEvaluationContextWithRumUser;

    if (typeof enricher !== 'function') {
        throw new Error(
            '`enrichRumContext` requires compatible versions of @datadog/mobile-react-native and @datadog/mobile-react-native-openfeature. Update both packages to the same version.'
        );
    }

    return enricher(context);
};
