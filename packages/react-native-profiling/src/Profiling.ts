/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { NativeProfilingType } from './nativeModulesTypes';

/**
 * The Profiling configuration object.
 */
export interface ProfilingConfiguration {
    /**
     * The sampling rate for application-launch profiling.
     * Range `0`-`100`.
     *
     * Default value is `5`.
     */
    applicationLaunchSampleRate?: number;

    /**
     * The sampling rate for continuous profiling.
     * Range `0`-`100`.
     *
     * Default value is `5`.
     */
    continuousSampleRate?: number;

    /**
     * Custom server url for sending profiling data.
     */
    customEndpoint?: string;
}

type InternalProfilingConfiguration = {
    applicationLaunchSampleRate: number;
    continuousSampleRate: number;
    customEndpoint: string;
};

const DEFAULTS: InternalProfilingConfiguration = {
    applicationLaunchSampleRate: 5,
    continuousSampleRate: 5,
    customEndpoint: ''
};

export class ProfilingWrapper {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    private nativeProfiling: NativeProfilingType = require('./specs/NativeDdProfiling')
        .default;

    private buildConfiguration = (
        configuration?: ProfilingConfiguration
    ): InternalProfilingConfiguration => {
        if (!configuration) {
            return DEFAULTS;
        }
        const {
            applicationLaunchSampleRate,
            continuousSampleRate,
            customEndpoint
        } = configuration;

        return {
            applicationLaunchSampleRate:
                applicationLaunchSampleRate !== undefined
                    ? applicationLaunchSampleRate
                    : DEFAULTS.applicationLaunchSampleRate,
            continuousSampleRate:
                continuousSampleRate !== undefined
                    ? continuousSampleRate
                    : DEFAULTS.continuousSampleRate,
            customEndpoint:
                customEndpoint !== undefined
                    ? customEndpoint
                    : DEFAULTS.customEndpoint
        };
    };

    /**
     * Enable native profiling.
     * @param configuration: The profiling configuration.
     */
    enable = (configuration?: ProfilingConfiguration): Promise<void> => {
        const {
            applicationLaunchSampleRate,
            continuousSampleRate,
            customEndpoint
        } = this.buildConfiguration(configuration);

        return this.nativeProfiling.enable(
            applicationLaunchSampleRate,
            continuousSampleRate,
            customEndpoint
        );
    };
}

export const DdProfiling = new ProfilingWrapper();
