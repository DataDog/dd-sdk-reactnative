/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { Spec as NativeDdProfiling } from './specs/NativeDdProfiling';

/**
 * The entry point to use Datadog's native Profiling feature.
 */
export interface NativeProfilingType extends NativeDdProfiling {
    /**
     * Enable native profiling.
     * @param applicationLaunchSampleRate: The sample rate applied for application-launch profiling.
     * @param continuousSampleRate: The sample rate applied for continuous profiling.
     * @param customEndpoint: Custom server url for sending profiling data.
     */
    enable(
        applicationLaunchSampleRate: number,
        continuousSampleRate: number,
        customEndpoint: string
    ): Promise<void>;
}
