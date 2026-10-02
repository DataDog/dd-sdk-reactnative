/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { DdRum as DdRumType } from '@datadog/mobile-react-native';
import type {
    EvaluationDetails,
    FlagValue,
    Hook,
    HookContext
} from '@openfeature/web-sdk';

import type { DatadogTrackingHook } from './tracking';

type FeatureFlagRum = Pick<typeof DdRumType, 'addFeatureFlagEvaluation'>;

export function createRumTrackingHook(rum: FeatureFlagRum): Hook {
    return {
        after: (
            _hookContext: HookContext,
            details: EvaluationDetails<FlagValue>
        ) => {
            if (details.variant == null) {
                return;
            }
            try {
                rum.addFeatureFlagEvaluation(
                    details.flagKey,
                    details.variant
                ).catch(() => {});
            } catch {
                // Tracking must not interrupt flag evaluation.
            }
        }
    };
}

/**
 * Create a hook that adds flag evaluations to the active RUM view with
 * `DdRum.addFeatureFlagEvaluation`. Requires an initialized Datadog SDK with RUM enabled.
 */
export function createDatadogRumTrackingHook(): DatadogTrackingHook {
    // Load the native SDK only when RUM tracking is used, so the `/rules-based` entry and
    // DatadogCoreProvider do not require it.
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const { DdRum } = require('@datadog/mobile-react-native') as {
        DdRum: FeatureFlagRum;
    };
    return {
        hooks: [createRumTrackingHook(DdRum)]
    };
}
