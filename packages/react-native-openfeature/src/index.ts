/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { configurationFromString } from '@datadog/mobile-react-native';

import { DatadogCoreProvider } from './datadogCoreProvider';
import { DatadogOfflineOpenFeatureProvider } from './offlineProvider';
import { DatadogOpenFeatureProvider } from './provider';
import type { DatadogOpenFeatureProviderOptions } from './provider';
import { enrichWithRumUser } from './rumContext';
import type { EnrichableEvaluationContext } from './rumContext';

export {
    DatadogOpenFeatureProvider,
    DatadogOfflineOpenFeatureProvider,
    DatadogCoreProvider,
    enrichWithRumUser,
    configurationFromString
};
export type { DatadogOpenFeatureProviderOptions, EnrichableEvaluationContext };
export type { FlagsConfiguration } from '@datadog/flagging-core';
// Keep the native offline provider's precomputed-only parser unchanged. The core provider's
// parser supports both precomputed and rules-based configurations.
export { configurationFromString as coreConfigurationFromString } from '@datadog/flagging-core/rules-based';
