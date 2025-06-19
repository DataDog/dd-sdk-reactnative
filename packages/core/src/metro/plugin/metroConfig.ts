/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import type { MetroConfig } from 'metro';

import {
    createDatadogMetroSerializer,
    unstable_beforeAssetSerializationPlugin
} from './metroSerializer';
import type {
    DatadogExpoConfigOptions,
    DefaultConfigOptions
} from './types/expoTypes';
import type { DatadogMetroSerializer } from './types/metroTypes';
import { getDefaultExpoConfig } from './utils';

/**
 * Custom Datadog Metro Configuration.
 */
export type DatadogMetroConfigOptions = {
    /**
     * Determines whether a Debug ID should be injected into bundles and sourcemaps.
     *
     * The Debug ID establishes a unique connection between a bundle and its corresponding sourcemap.
     * It is highly recommended to keep this enabled unless you have a specific reason to disable it.
     *
     * Default: `true`
     */
    useDebugId?: boolean;
};

/**
 * Extends the Metro bundler configuration to integrate with Datadog.
 *
 * *Note: If a custom serializer is used and `config.useDebugId` is set to `true` (as it is by default),
 * you must manually invoke `options.datadogBundleCallback` within the serializer.*
 */
export function withDatadogMetroConfig(
    config: MetroConfig & DatadogMetroConfigOptions
): MetroConfig {
    let newConfig = config;

    if (config.useDebugId ?? true) {
        newConfig = withDatadogDebugId(config);
    }

    return {
        ...newConfig,
        transformer: {
            ...newConfig.transformer
        }
    };
}

/**
 * Extends the Expo configuration to integrate with Datadog.
 * @param config
 * @returns
 */
export function getDatadogExpoConfig(
    projectRoot: string,
    options: DefaultConfigOptions & DatadogExpoConfigOptions = {}
): DefaultConfigOptions {
    const plugins = options.unstable_beforeAssetSerializationPlugins ?? [];
    const datadogOptions: DefaultConfigOptions = {
        ...options,
        unstable_beforeAssetSerializationPlugins: [
            ...plugins,
            unstable_beforeAssetSerializationPlugin
        ]
    };

    return (options.getDefaultConfig ?? getDefaultExpoConfig)(
        projectRoot,
        datadogOptions
    );
}

/**
 * Extends the Metro bundler configuration by enabling Debug ID injection.
 * Ref: https://github.com/tc39/ecma426/blob/main/proposals/debug-id.md
 */
export function withDatadogDebugId(config: MetroConfig): MetroConfig {
    const customSerializer = createDatadogMetroSerializer(
        config.serializer?.customSerializer || undefined
    ) as DatadogMetroSerializer;

    return {
        ...config,
        serializer: {
            ...config.serializer,
            customSerializer
        }
    };
}
