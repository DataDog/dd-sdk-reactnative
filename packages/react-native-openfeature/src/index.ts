/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DatadogOfflineOpenFeatureProvider } from './offlineProvider';
import { DatadogOpenFeatureProvider } from './provider';
import type { DatadogOpenFeatureProviderOptions } from './provider';
import { enrichWithRumUser } from './rumContext';
import type { EnrichableEvaluationContext } from './rumContext';

export { getClientFingerprint } from './client-fingerprint';
export type { ClientFingerprint } from './client-fingerprint';
export { fetchPrecomputedConfiguration } from './fetchPrecomputedConfiguration';
export type { PrecomputedConfigurationFetchOptions } from './fetchPrecomputedConfiguration';

export {
    DatadogOpenFeatureProvider,
    DatadogOfflineOpenFeatureProvider,
    enrichWithRumUser
};
export type { DatadogOpenFeatureProviderOptions, EnrichableEvaluationContext };
export {
    configurationFromString,
    configurationToString,
    getPrecomputedContext
} from '@datadog/flagging-core';
export type {
    FlagSelection,
    FlagsConfiguration,
    FlagsConfigurationWire
} from '@datadog/flagging-core';
export {
    createDatadogExposureLoggingHook,
    createDatadogEvaluationLoggingHook,
    createDatadogRumTrackingHook,
    composeDatadogTrackingHooks
} from './tracking';
export type {
    DatadogTrackingHook,
    DatadogTrackingHooks,
    DatadogTrackingHooksOptions
} from './tracking';
