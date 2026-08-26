/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import type { TimeseriesConfiguration } from '../types';

export type RumNativeConfiguration = {
    readonly applicationId: string;
    readonly trackFrustrations: boolean;
    readonly longTaskThresholdMs: number;
    readonly sessionSampleRate: number;
    readonly resourceTraceSampleRate: number;
    readonly vitalsUpdateFrequency: string;
    readonly trackBackgroundEvents: boolean;
    readonly nativeCrashReportEnabled: boolean;
    readonly nativeLongTaskThresholdMs: number;
    readonly nativeViewTracking: boolean;
    readonly nativeInteractionTracking: boolean;
    readonly trackNonFatalAnrs: boolean | undefined;
    readonly appHangThreshold: number | undefined;
    readonly trackWatchdogTerminations: boolean | undefined;
    readonly initialResourceThreshold: number | undefined;
    readonly trackMemoryWarnings: boolean;
    readonly telemetrySampleRate: number;
    readonly customEndpoint: string;
    readonly firstPartyHosts: { match: string; propagatorTypes: string[] }[];
    readonly unstable_timeseries: TimeseriesConfiguration | undefined;
};
