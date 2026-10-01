/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ActionEventMapper } from '../rum/eventMappers/actionEventMapper';
import type { ErrorEventMapper } from '../rum/eventMappers/errorEventMapper';
import type { ResourceEventMapper } from '../rum/eventMappers/resourceEventMapper';
import type { FirstPartyHost } from '../rum/types';
import { PropagatorType } from '../rum/types';

import { DatadogProviderConfiguration } from './DatadogProviderConfiguration';
import type { JsonConfiguration } from './FileBasedConfiguration.type';
import { CORE_DEFAULTS } from './features/CoreConfiguration';
import { LogsConfiguration } from './features/LogsConfiguration';
import { RUM_DEFAULTS, RumConfiguration } from './features/RumConfiguration';
import { TraceConfiguration } from './features/TraceConfiguration';
import { SdkVerbosity } from './types/SdkVerbosity';
import { TrackingConsent } from './types/TrackingConsent';
import {
    ProxyConfiguration,
    BatchProcessingLevel,
    BatchSize,
    UploadFrequency,
    ProxyType,
    VitalsUpdateFrequency
} from './types';

/**
 * Helper function to remove undefined entries from the given Record
 */
const removeUndefinedEntries = <T extends Record<string, any>>(
    obj: T | undefined
): Partial<T> | undefined => {
    if (obj === undefined) {
        return undefined;
    }
    return Object.fromEntries(
        Object.entries(obj).filter(([, value]) => value !== undefined)
    ) as Partial<T>;
};

export class FileBasedConfiguration extends DatadogProviderConfiguration {
    constructor(params?: {
        configuration?: unknown;
        errorEventMapper?: ErrorEventMapper;
        resourceEventMapper?: ResourceEventMapper;
        actionEventMapper?: ActionEventMapper;
    }) {
        const jsonConfiguration = getJSONConfiguration(params?.configuration);

        const {
            clientToken,
            env,
            trackingConsent,
            ...rest
        } = jsonConfiguration;

        if (
            clientToken === undefined ||
            env === undefined ||
            trackingConsent === undefined
        ) {
            console.warn(
                'DATADOG: Warning - Malformed json configuration file - `clientToken`, `env` and `trackingConsent` are mandatory Core SDK properties.'
            );
        }

        // Configure Core SDK
        const coreConfiguration = removeUndefinedEntries(rest);
        super(clientToken, env, trackingConsent, coreConfiguration);

        // Configure RUM
        const rumConfig = removeUndefinedEntries(
            jsonConfiguration.rumConfiguration
        );
        if (rumConfig) {
            if (rumConfig.applicationId !== undefined) {
                this.rumConfiguration = new RumConfiguration(
                    rumConfig.applicationId,
                    rumConfig.trackInteractions,
                    rumConfig.trackResources,
                    rumConfig.trackErrors,
                    rumConfig
                );

                this.rumConfiguration.errorEventMapper =
                    params?.errorEventMapper ?? RUM_DEFAULTS.errorEventMapper;
                this.rumConfiguration.resourceEventMapper =
                    params?.resourceEventMapper ??
                    RUM_DEFAULTS.resourceEventMapper;
                this.rumConfiguration.actionEventMapper =
                    params?.actionEventMapper ?? RUM_DEFAULTS.actionEventMapper;
            } else {
                console.warn(
                    'DATADOG: Warning - Malformed RUM File Configuration - `applicationId` is undefined.'
                );
                this.rumConfiguration = undefined;
            }
        }

        // Configure Logs
        const logsConfig = removeUndefinedEntries(
            jsonConfiguration.logsConfiguration
        );
        if (logsConfig) {
            this.logsConfiguration = new LogsConfiguration(logsConfig);
        }

        // Configure Trace
        const traceConfig = removeUndefinedEntries(
            jsonConfiguration.traceConfiguration
        );
        if (traceConfig) {
            this.traceConfiguration = new TraceConfiguration(traceConfig);
        }
    }
}

const resolveJSONConfiguration = (
    userSpecifiedConfiguration: unknown
): Record<string, any> => {
    if (typeof userSpecifiedConfiguration !== 'object') {
        console.error(`Failed to parse the Datadog configuration file you provided.
Your configuration must validate the node_modules/@datadog/mobile-react-native/datadog-configuration.schema.json JSON schema.
You can use VSCode to check your configuration by adding the following line to your JSON file:
{
    "$schema": "./node_modules/@datadog/mobile-react-native/datadog-configuration.schema.json",
}`);

        return {};
    }

    return (userSpecifiedConfiguration as any) as Record<string, any>;
};

export const getJSONConfiguration = (
    userSpecifiedConfiguration: unknown
): JsonConfiguration => {
    const configuration = resolveJSONConfiguration(userSpecifiedConfiguration);

    return {
        additionalConfiguration: configuration.additionalConfiguration,
        clientToken: configuration.clientToken,
        env: configuration.env,
        trackingConsent: buildTrackingConsent(configuration.trackingConsent),
        verbosity: buildSdkVerbosity(configuration.verbosity),
        site: configuration.site,
        service: configuration.service,
        version: configuration.version,
        versionSuffix: configuration.versionSuffix,
        batchSize: buildBatchSize(configuration.batchSize),
        batchProcessingLevel: buildBatchProcessingLevel(
            configuration.batchProcessingLevel
        ),
        uploadFrequency: buildUploadFrequency(configuration.uploadFrequency),
        proxyConfiguration: buildProxyConfiguration(
            configuration.proxyConfiguration
        ),
        ...(configuration.rumConfiguration !== undefined && {
            rumConfiguration: {
                applicationId: configuration.rumConfiguration.applicationId,
                firstPartyHosts:
                    buildFirstPartyHosts(
                        configuration.rumConfiguration.firstPartyHosts
                    ) || RUM_DEFAULTS.getFirstPartyHosts(),
                useAccessibilityLabel:
                    configuration.rumConfiguration.useAccessibilityLabel,
                trackInteractions:
                    configuration.rumConfiguration.trackInteractions,
                trackResources: configuration.rumConfiguration.trackResources,
                trackFetchResources:
                    configuration.rumConfiguration.trackFetchResources,
                trackErrors: configuration.rumConfiguration.trackErrors,
                nativeLongTaskThresholdMs:
                    configuration.rumConfiguration.nativeLongTaskThresholdMs,
                nativeCrashReportEnabled:
                    configuration.rumConfiguration.nativeCrashReportEnabled,
                longTaskThresholdMs:
                    configuration.rumConfiguration.longTaskThresholdMs,
                actionNameAttribute:
                    configuration.rumConfiguration.actionNameAttribute,
                customEndpoint: configuration.rumConfiguration.customEndpoint,
                sessionSampleRate:
                    configuration.rumConfiguration.sessionSampleRate,
                resourceTraceSampleRate:
                    configuration.rumConfiguration.resourceTraceSampleRate,
                trackBackgroundEvents:
                    configuration.rumConfiguration.trackBackgroundEvents,
                trackFrustrations:
                    configuration.rumConfiguration.trackFrustrations,
                trackNonFatalAnrs:
                    configuration.rumConfiguration.trackNonFatalAnrs,
                trackWatchdogTerminations:
                    configuration.rumConfiguration.trackWatchdogTerminations,
                vitalsUpdateFrequency: buildVitalsUpdateFrequency(
                    configuration.rumConfiguration.vitalsUpdateFrequency
                ),
                appHangThreshold:
                    configuration.rumConfiguration.appHangThreshold,
                initialResourceThreshold:
                    configuration.rumConfiguration.initialResourceThreshold,
                nativeViewTracking:
                    configuration.rumConfiguration.nativeViewTracking,
                trackMemoryWarnings:
                    configuration.rumConfiguration.trackMemoryWarnings,
                telemetrySampleRate:
                    configuration.rumConfiguration.telemetrySampleRate,
                nativeInteractionTracking:
                    configuration.rumConfiguration.nativeInteractionTracking,
                unstable_timeseries:
                    configuration.rumConfiguration.unstable_timeseries
            }
        }),
        ...(configuration.traceConfiguration !== undefined && {
            traceConfiguration: {
                customEndpoint: configuration.traceConfiguration.customEndpoint
            }
        }),
        ...(configuration.logsConfiguration !== undefined && {
            logsConfiguration: {
                bundleLogsWithRum:
                    configuration.logsConfiguration.bundleLogsWithRum,
                bundleLogsWithTraces:
                    configuration.logsConfiguration.bundleLogsWithTraces,
                customEndpoint: configuration.logsConfiguration.customEndpoint
            }
        })
    };
};

const buildFirstPartyHosts = (
    firstPartyHosts: { match: string; propagatorTypes: string[] }[] | undefined
): FirstPartyHost[] | undefined => {
    if (!firstPartyHosts) {
        return undefined;
    }

    try {
        return firstPartyHosts.map(({ match, propagatorTypes }) => ({
            match,
            propagatorTypes: propagatorTypes.map(formatPropagatorType)
        }));
    } catch (error) {
        console.error(`Failed to parse the first party hosts from the Datadog configuration file you provided:
${(error as any).message}
The first party hosts will not be set for this session.
`);
        return undefined;
    }
};

export const formatPropagatorType = (
    propagatorType: string
): PropagatorType => {
    switch (propagatorType.toLowerCase()) {
        case 'b3': {
            return PropagatorType.B3;
        }
        case 'b3multi': {
            return PropagatorType.B3MULTI;
        }
        case 'datadog': {
            return PropagatorType.DATADOG;
        }
        case 'tracecontext': {
            return PropagatorType.TRACECONTEXT;
        }
        default: {
            throw new Error(
                `Failed to parse propagator type ${propagatorType}.`
            );
        }
    }
};

const buildTrackingConsent = (
    trackingConsent: string | undefined
): TrackingConsent => {
    if (trackingConsent === undefined) {
        return CORE_DEFAULTS.trackingConsent;
    }

    switch (trackingConsent.toLowerCase()) {
        case 'granted': {
            return TrackingConsent.GRANTED;
        }
        case 'pending': {
            return TrackingConsent.PENDING;
        }
        case 'not_granted': {
            return TrackingConsent.NOT_GRANTED;
        }
        default: {
            return CORE_DEFAULTS.trackingConsent;
        }
    }
};

const buildSdkVerbosity = (
    verbosity: string | undefined
): SdkVerbosity | undefined => {
    if (verbosity === undefined) {
        return CORE_DEFAULTS.verbosity;
    }
    switch (verbosity.toLowerCase()) {
        case 'debug': {
            return SdkVerbosity.DEBUG;
        }
        case 'info': {
            return SdkVerbosity.INFO;
        }
        case 'warn': {
            return SdkVerbosity.WARN;
        }
        case 'error': {
            return SdkVerbosity.ERROR;
        }
        default: {
            return undefined;
        }
    }
};

const buildBatchSize = (batchSize: string | undefined): BatchSize => {
    if (batchSize === undefined) {
        return CORE_DEFAULTS.batchSize;
    }

    switch (batchSize.toLowerCase()) {
        case 'large':
            return BatchSize.LARGE;
        case 'medium':
            return BatchSize.MEDIUM;
        case 'small':
            return BatchSize.SMALL;
        default:
            console.warn(
                `DATADOG: Warning - Malformed json configuration file - invalid batchSize: ${batchSize}. The default value will be used: ${CORE_DEFAULTS.batchSize}.`
            );
            return CORE_DEFAULTS.batchSize;
    }
};

const buildBatchProcessingLevel = (
    batchProcessingLevel: string | undefined
): BatchProcessingLevel => {
    if (batchProcessingLevel === undefined) {
        return CORE_DEFAULTS.batchProcessingLevel;
    }

    switch (batchProcessingLevel.toLowerCase()) {
        case 'high':
            return BatchProcessingLevel.HIGH;
        case 'medium':
            return BatchProcessingLevel.MEDIUM;
        case 'low':
            return BatchProcessingLevel.LOW;
        default:
            console.warn(
                `DATADOG: Warning - Malformed json configuration file - invalid batchProcessingLevel: ${batchProcessingLevel}. The default value will be used: ${CORE_DEFAULTS.batchProcessingLevel}.`
            );
            return CORE_DEFAULTS.batchProcessingLevel;
    }
};

const buildUploadFrequency = (
    uploadFrequency: string | undefined
): UploadFrequency => {
    if (uploadFrequency === undefined) {
        return CORE_DEFAULTS.uploadFrequency;
    }

    switch (uploadFrequency.toLowerCase()) {
        case 'frequent':
            return UploadFrequency.FREQUENT;
        case 'average':
            return UploadFrequency.AVERAGE;
        case 'rare':
            return UploadFrequency.RARE;
        default:
            console.warn(
                `DATADOG: Warning - Malformed json configuration file - invalid uploadFrequency: ${uploadFrequency}. The default value will be used: ${CORE_DEFAULTS.uploadFrequency}.`
            );
            return CORE_DEFAULTS.uploadFrequency;
    }
};

const proxyConfigurationToString = (proxyConfiguration: object | undefined) => {
    if (proxyConfiguration === undefined) {
        return 'undefined';
    }
    try {
        return JSON.stringify(proxyConfiguration, null, 2);
    } catch (ignored) {
        return String(proxyConfiguration);
    }
};

const buildProxyType = (proxyType: string): ProxyType | undefined => {
    switch (proxyType.toLowerCase()) {
        case 'http':
            return ProxyType.HTTP;
        case 'https':
            return ProxyType.HTTPS;
        case 'socks':
            return ProxyType.SOCKS;
        default:
            console.warn(
                `DATADOG: Warning - Malformed json configuration file - invalid proxy type '${proxyType}' for proxyConfiguration.`
            );
            return undefined;
    }
};

const buildProxyConfiguration = (
    proxyConfiguration: object
): ProxyConfiguration | undefined => {
    if (proxyConfiguration === undefined) {
        return CORE_DEFAULTS.proxyConfiguration;
    }

    const {
        rawType,
        address,
        port,
        username,
        password
    } = proxyConfiguration as any;
    const type = buildProxyType(rawType);
    if (type === undefined || address === undefined || port === undefined) {
        console.warn(
            `DATADOG: Warning - Malformed json configuration file - invalid proxyConfiguration: ${proxyConfigurationToString(
                proxyConfiguration
            )}. The default value will be used: ${
                CORE_DEFAULTS.proxyConfiguration
            }.`
        );
        return CORE_DEFAULTS.proxyConfiguration;
    }

    return new ProxyConfiguration(type, address, port, username, password);
};

const buildVitalsUpdateFrequency = (
    vitalsUpdateFrequency: string | undefined
): VitalsUpdateFrequency | undefined => {
    if (vitalsUpdateFrequency === undefined) {
        return RUM_DEFAULTS.vitalsUpdateFrequency;
    }

    switch (vitalsUpdateFrequency.toLowerCase()) {
        case 'frequent':
            return VitalsUpdateFrequency.FREQUENT;
        case 'average':
            return VitalsUpdateFrequency.AVERAGE;
        case 'rare':
            return VitalsUpdateFrequency.RARE;
        case 'never':
            return VitalsUpdateFrequency.NEVER;
        default:
            console.warn(
                `DATADOG: Warning - Malformed json configuration file - invalid vitalsUpdateFrequency: ${vitalsUpdateFrequency} for rumConfiguration. The default value will be used: ${RUM_DEFAULTS.vitalsUpdateFrequency}`
            );
            return RUM_DEFAULTS.vitalsUpdateFrequency;
    }
};
