/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import type { AttributeEncoder } from '../../sdk/AttributesEncoding/types';
import type { SdkVerbosity, ProxyConfiguration } from '../types';
import {
    TrackingConsent,
    BatchProcessingLevel,
    BatchSize,
    UploadFrequency
} from '../types';

import type {
    CoreConfigurationOptions,
    CoreConfigurationType
} from './CoreConfiguration.type';
import { LogsConfiguration } from './LogsConfiguration';
import { RumConfiguration } from './RumConfiguration';
import { TraceConfiguration } from './TraceConfiguration';

const DEFAULTS = {
    getAdditionalConfiguration: () => ({}),
    attributeEncoders: [] as AttributeEncoder<any>[],
    batchProcessingLevel: BatchProcessingLevel.MEDIUM,
    batchSize: BatchSize.MEDIUM,
    logsConfiguration: undefined,
    proxyConfiguration: undefined,
    rumConfiguration: undefined,
    service: undefined,
    site: 'US1',
    traceConfiguration: undefined,
    uploadFrequency: UploadFrequency.AVERAGE,
    verbosity: undefined,
    version: undefined,
    versionSuffix: undefined,
    trackingConsent: TrackingConsent.GRANTED
};

/**
 * The Core configuration class.
 * Used to configure the SDK functionality at initialization.
 */
class CoreConfiguration implements CoreConfigurationType {
    // Additional Configuration
    public additionalConfiguration?: {
        [k: string]: any;
    } = DEFAULTS.getAdditionalConfiguration();

    // Attribute Encoders
    public attributeEncoders: AttributeEncoder<any>[] =
        DEFAULTS.attributeEncoders;

    // Batch Processing Level
    public batchProcessingLevel: BatchProcessingLevel =
        DEFAULTS.batchProcessingLevel;

    // Batch Size
    public batchSize: BatchSize = DEFAULTS.batchSize;

    // Logs Configuration
    public logsConfiguration?: LogsConfiguration = DEFAULTS.logsConfiguration;

    // Proxy Configuration
    public proxyConfiguration?: ProxyConfiguration =
        DEFAULTS.proxyConfiguration;

    // RUM Configuration
    public rumConfiguration?: RumConfiguration = DEFAULTS.rumConfiguration;

    // Service Name
    public service?: string = DEFAULTS.service;

    // Datadog Site
    public site: string = DEFAULTS.site;

    // Trace Configuration
    public traceConfiguration?: TraceConfiguration =
        DEFAULTS.traceConfiguration;

    // Batch Upload Frequency
    public uploadFrequency: UploadFrequency = DEFAULTS.uploadFrequency;

    // SDK Logs Verbosity
    public verbosity?: SdkVerbosity = DEFAULTS.verbosity;

    // Custom Version Name
    public version?: string = DEFAULTS.version;

    // Custom Version Suffix
    public versionSuffix?: string = DEFAULTS.versionSuffix;

    constructor(
        readonly clientToken: string,
        readonly env: string,
        readonly trackingConsent: TrackingConsent = DEFAULTS.trackingConsent,
        options: CoreConfigurationOptions = {}
    ) {
        const {
            rumConfiguration,
            logsConfiguration,
            traceConfiguration,
            ...rest
        } = options;

        Object.assign(this, rest);
        if (rumConfiguration !== undefined) {
            this.rumConfiguration = new RumConfiguration(
                rumConfiguration.applicationId,
                rumConfiguration.trackInteractions,
                rumConfiguration.trackResources,
                rumConfiguration.trackErrors,
                rumConfiguration
            );
        }

        if (logsConfiguration !== undefined) {
            this.logsConfiguration = new LogsConfiguration(logsConfiguration);
        }

        if (traceConfiguration !== undefined) {
            this.traceConfiguration = new TraceConfiguration(
                traceConfiguration
            );
        }
    }
}

export { DEFAULTS as CORE_DEFAULTS, CoreConfiguration };
