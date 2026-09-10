/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { configurationFromString } from '@datadog/mobile-react-native';

import { DatadogOfflineOpenFeatureProvider } from './offlineProvider';
import { DatadogOpenFeatureProvider } from './provider';
import type { DatadogOpenFeatureProviderOptions } from './provider';
import { enrichRumContext } from './rumContext';

export {
    DatadogOpenFeatureProvider,
    DatadogOfflineOpenFeatureProvider,
    enrichRumContext,
    configurationFromString
};
export type { DatadogOpenFeatureProviderOptions };
