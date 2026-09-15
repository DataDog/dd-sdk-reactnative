/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import type { FirstPartyHost } from '../rum/types';

import type { CoreConfigurationOptions } from './features/CoreConfiguration.type';
import type {
    BatchProcessingLevel,
    BatchSize,
    ProxyConfiguration,
    SdkVerbosity,
    TrackingConsent,
    UploadFrequency,
    VitalsUpdateFrequency
} from './types';

export interface JsonConfiguration extends CoreConfigurationOptions {
    clientToken: string;
    env: string;
    trackingConsent?: TrackingConsent;
    verbosity?: SdkVerbosity;
    service?: string;
    site?: string;
    batchSize?: BatchSize;
    batchProcessingLevel?: BatchProcessingLevel;
    proxyConfiguration?: ProxyConfiguration;
    uploadFrequency?: UploadFrequency;
    version?: string;
    versionSuffix?: string;
    rumConfiguration?: {
        applicationId: string;
        useAccessibilityLabel?: boolean;
        trackInteractions?: boolean;
        trackResources?: boolean;
        trackFetchResources?: boolean;
        trackErrors?: boolean;
        longTaskThresholdMs?: number;
        actionNameAttribute?: string;
        appHangThreshold?: number;
        firstPartyHosts?: FirstPartyHost[];
        initialResourceThreshold?: number;
        trackMemoryWarnings?: boolean;
        nativeCrashReportEnabled?: boolean;
        nativeLongTaskThresholdMs?: number;
        nativeViewTracking?: boolean;
        nativeInteractionTracking?: boolean;
        customEndpoint?: string;
        sessionSampleRate?: number;
        resourceTraceSampleRate?: number;
        trackBackgroundEvents?: boolean;
        trackFrustrations?: boolean;
        trackNonFatalAnrs?: boolean;
        trackWatchdogTerminations?: boolean;
        vitalsUpdateFrequency?: VitalsUpdateFrequency;
        telemetrySampleRate?: number;
    };
    traceConfiguration?: {
        customEndpoint?: string;
    };
    logsConfiguration?: {
        bundleLogsWithRum?: boolean;
        bundleLogsWithTraces?: boolean;
        customEndpoint?: string;
    };
}
