/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import type { AttributeEncoder } from '../../sdk/AttributesEncoding/types';
import type {
    BatchProcessingLevel,
    BatchSize,
    ProxyConfiguration,
    SdkVerbosity,
    TrackingConsent,
    UploadFrequency,
    VitalsUpdateFrequency
} from '../types';

export type PartialInitializationConfiguration = {
    readonly additionalConfiguration?: { [k: string]: any };
    readonly attributeEncoders?: AttributeEncoder<any>[];
    readonly clientToken: string;
    readonly env: string;
    readonly site?: string;
    readonly trackingConsent?: TrackingConsent;
    readonly verbosity?: SdkVerbosity | undefined;
    readonly service?: string;
    readonly version?: string;
    versionSuffix?: string;
    readonly proxyConfiguration?: ProxyConfiguration;
    readonly uploadFrequency?: UploadFrequency;
    readonly batchSize?: BatchSize;
    readonly batchProcessingLevel?: BatchProcessingLevel;
    readonly rumConfiguration?: {
        readonly applicationId: string;
        readonly sessionSampleRate?: number;
        readonly nativeLongTaskThresholdMs?: number;
        readonly nativeCrashReportEnabled?: boolean;
        readonly nativeViewTracking?: boolean;
        readonly nativeInteractionTracking?: boolean;
        readonly longTaskThresholdMs?: number | false;
        readonly vitalsUpdateFrequency?: VitalsUpdateFrequency;
        readonly trackFrustrations?: boolean;
        readonly trackBackgroundEvents?: boolean;
        readonly initialResourceThreshold?: number;
        readonly trackMemoryWarnings?: boolean;
        readonly telemetrySampleRate?: number;
        readonly customEndpoint?: string;
        readonly trackNonFatalAnrs?: boolean;
        readonly appHangThreshold?: number;
    };
    readonly logsConfiguration?: {
        readonly bundleLogsWithRum?: boolean;
        readonly bundleLogsWithTraces?: boolean;
        readonly customEndpoint?: string;
    };
    readonly traceConfiguration?: {
        readonly customEndpoint?: string;
    };
};
