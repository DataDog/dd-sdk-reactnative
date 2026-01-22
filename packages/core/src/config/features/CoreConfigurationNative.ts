/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import type { AttributeEncoder } from '../../sdk/AttributesEncoding/types';
import type { BatchProcessingLevel } from '../types';

import type { LogsNativeConfiguration } from './LogsConfigurationNative';
import type { RumNativeConfiguration } from './RumConfigurationNative';
import type { TraceNativeConfiguration } from './TraceConfigurationNative';

/**
 * A configuration object to initialize Datadog's features.
 */
export class DdSdkNativeConfiguration {
    constructor(
        readonly additionalConfiguration: object,
        readonly clientToken: string,
        readonly env: string,
        readonly site: string,
        readonly service: string | undefined,
        readonly verbosity: string | undefined,
        readonly trackingConsent: string,
        readonly uploadFrequency: string,
        readonly batchSize: string,
        readonly batchProcessingLevel: BatchProcessingLevel,
        readonly proxyConfiguration:
            | {
                  type: string;
                  address: string;
                  port: number;
                  username?: string;
                  password?: string;
              }
            | undefined,
        readonly attributeEncoders: AttributeEncoder<any>[],
        readonly rumConfiguration: RumNativeConfiguration | undefined,
        readonly logsConfiguration: LogsNativeConfiguration | undefined,
        readonly traceConfiguration: TraceNativeConfiguration | undefined,
        readonly configurationForTelemetry: {
            initializationType: string;
            trackErrors: boolean;
            trackInteractions: boolean;
            trackNetworkRequests: boolean;
            reactVersion: string;
            reactNativeVersion: string;
        } // eslint-disable-next-line no-empty-function
    ) {}
}
