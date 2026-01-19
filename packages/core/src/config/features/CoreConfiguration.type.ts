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
    UploadFrequency
} from '../types';

import type { LogsConfigurationType } from './LogsConfiguration.type';
import type { RumConfigurationType } from './RumConfiguration.type';
import type { TraceConfigurationType } from './TraceConfiguration.type';

/**
 * Required core configuration values.
 */
export interface CoreConfigurationRequired {
    /**
     * The Datadog client token.
     */
    clientToken: string;

    /**
     * The environment name (e.g. prod, staging).
     */
    env: string;

    /**
     * Initial tracking consent value.
     */
    trackingConsent: TrackingConsent;
}

/**
 * Optional core configuration values.
 */
export interface CoreConfigurationOptions {
    /**
     * Additional arbitrary configuration values.
     */
    additionalConfiguration?: { [k: string]: any };

    /**
     * Custom attribute encoders.
     */
    attributeEncoders?: AttributeEncoder<any>[];

    /**
     * Batch size used when sending data.
     */
    batchSize?: BatchSize;

    /**
     * Processing level used when batching data.
     */
    batchProcessingLevel?: BatchProcessingLevel;

    /**
     * Logs feature configuration.
     */
    logsConfiguration?: LogsConfigurationType;

    /**
     * Proxy configuration.
     */
    proxyConfiguration?: ProxyConfiguration;

    /**
     * RUM feature configuration.
     */
    rumConfiguration?: RumConfigurationType;

    /**
     * Name of the service.
     */
    service?: string;

    /**
     * Datadog site to send data to.
     */
    site?: string;

    /**
     * Trace feature configuration.
     */
    traceConfiguration?: TraceConfigurationType;

    /**
     * Frequency used to upload data batches.
     */
    uploadFrequency?: UploadFrequency;

    /**
     * Overrides the reported application version.
     */
    version?: string;

    /**
     * Suffix added to the reported application version.
     */
    versionSuffix?: string;

    /**
     * SDK internal logging verbosity.
     */
    verbosity?: SdkVerbosity;
}

/**
 * Complete core configuration type.
 */
export type CoreConfigurationType = CoreConfigurationRequired &
    CoreConfigurationOptions;
