/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import {
    withDatadogMetroConfig,
    getDatadogExpoConfig
} from './metro/plugin/metroConfig';
import type { DatadogMetroConfigOptions } from './metro/plugin/metroConfig';
import type { DatadogExpoConfigOptions } from './metro/plugin/types/expoTypes';

export { withDatadogMetroConfig, getDatadogExpoConfig };
export type { DatadogMetroConfigOptions, DatadogExpoConfigOptions };
