/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    BatchProcessingLevel,
    FirstPartyHostsConfiguration,
    UploadFrequency,
    VitalsUpdateFrequency
} from '../../DdSdkReactNativeConfiguration';
import {
    DEFAULTS,
    DatadogProviderConfiguration,
    RUMConfiguration,
    TraceConfiguration
} from '../../DdSdkReactNativeConfiguration';
import type { ProxyConfiguration } from '../../ProxyConfiguration';
import { SdkVerbosity } from '../../SdkVerbosity';
import { TrackingConsent } from '../../TrackingConsent';
import type { ActionEventMapper } from '../../rum/eventMappers/actionEventMapper';
import type { ErrorEventMapper } from '../../rum/eventMappers/errorEventMapper';
import type { ResourceEventMapper } from '../../rum/eventMappers/resourceEventMapper';
import { PropagatorType } from '../../rum/types';

export class FileBasedConfiguration extends DatadogProviderConfiguration {
    constructor(params?: {
        configuration?: unknown;
        errorEventMapper?: ErrorEventMapper;
        resourceEventMapper?: ResourceEventMapper;
        actionEventMapper?: ActionEventMapper;
    }) {
        const configuration = getJSONConfiguration(params?.configuration);
        super(
            configuration.clientToken,
            configuration.env,
            configuration.trackingConsent,
            configuration.useAccessibilityLabel
        );

        this.verbosity = configuration.verbosity;
        this.site = configuration.site || DEFAULTS.site;
        this.firstPartyHosts =
            configuration.firstPartyHosts || DEFAULTS.getFirstPartyHosts();

        if (configuration.rumConfiguration) {
            const rumConfig = new RUMConfiguration(
                configuration.rumConfiguration.applicationId,
                configuration.rumConfiguration.trackInteractions,
                configuration.rumConfiguration.trackResources,
                configuration.rumConfiguration.trackErrors
            );

            if (configuration.rumConfiguration.longTaskThresholdMs) {
                rumConfig.longTaskThresholdMs =
                    configuration.rumConfiguration.longTaskThresholdMs;
            }

            if (configuration.rumConfiguration.actionNameAttribute) {
                rumConfig.actionNameAttribute =
                    configuration.rumConfiguration.actionNameAttribute;
            }

            rumConfig.errorEventMapper =
                params?.errorEventMapper || DEFAULTS.errorEventMapper;
            rumConfig.resourceEventMapper =
                params?.resourceEventMapper || DEFAULTS.resourceEventMapper;
            rumConfig.actionEventMapper =
                params?.actionEventMapper || DEFAULTS.actionEventMapper;

            this.rumConfiguration = rumConfig;
        }

        if (configuration.traceConfiguration) {
            this.traceConfiguration = new TraceConfiguration();
            this.traceConfiguration.resourceTraceSampleRate =
                configuration.traceConfiguration.resourceTraceSampleRate ||
                DEFAULTS.resourceTraceSampleRate;
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
): {
    clientToken: string;
    env: string;
    trackingConsent?: TrackingConsent;
    verbosity?: SdkVerbosity;
    service?: string;
    useAccessibilityLabel?: boolean;
    site?: string;
    batchSize?: string;
    batchProcessingLevel?: BatchProcessingLevel;
    nativeCrashReportEnabled?: boolean;
    nativeLongTaskThresholdMs?: number | false;
    proxyConfiguration?: ProxyConfiguration;
    uploadFrequency?: UploadFrequency;
    version?: string;
    versionSuffix?: string;
    firstPartyHosts?: FirstPartyHostsConfiguration;
    rumConfiguration?: {
        applicationId: string;
        trackInteractions?: boolean;
        trackResources?: boolean;
        trackErrors?: boolean;
        longTaskThresholdMs?: number;
        actionNameAttribute?: string;
        appHangThreshold?: number;
        initialResourceThreshold?: number;
        trackMemoryWarnings?: boolean;
        nativeViewTracking?: boolean;
        nativeInteractionTracking?: boolean;
        customEndpoint?: string;
        sessionSampleRate?: number;
        trackBackgroundEvents?: boolean;
        trackFrustrations?: boolean;
        trackNonFatalAnrs?: boolean;
        trackWatchdogTerminations?: boolean;
        vitalsUpdateFrequency?: VitalsUpdateFrequency;
    };
    traceConfiguration?: {
        resourceTraceSampleRate?: number;
        customEndpoint?: string;
    };
    logsConfiguration?: {
        bundleLogsWithRum?: boolean;
        bundleLogsWithTraces?: boolean;
        customEndpoint?: string;
    };
} => {
    const configuration = resolveJSONConfiguration(userSpecifiedConfiguration);

    if (
        configuration.clientToken === undefined ||
        configuration.env === undefined ||
        (configuration.rumConfiguration !== undefined &&
            configuration.rumConfiguration.applicationId === undefined)
    ) {
        console.warn(
            'DATADOG: Warning: Malformed json configuration file - clientToken and env are mandatory Core SDK properties. ApplicationId is mandatory to enable RUM.'
        );
    }

    return {
        clientToken: configuration.clientToken,
        env: configuration.env,
        trackingConsent: buildTrackingConsent(configuration.trackingConsent),
        verbosity: buildSdkVerbosity(configuration.verbosity),
        useAccessibilityLabel: configuration.useAccessibilityLabel,
        site: configuration.site,
        service: configuration.service,
        version: configuration.version,
        versionSuffix: configuration.versionSuffix,
        batchSize: configuration.batchSize,
        batchProcessingLevel: configuration.batchProcessingLevel,
        uploadFrequency: configuration.uploadFrequency,
        nativeLongTaskThresholdMs: configuration.nativeLongTaskThresholdMs,
        nativeCrashReportEnabled: configuration.nativeCrashReportEnabled,
        proxyConfiguration: configuration.proxyConfiguration,
        firstPartyHosts:
            buildFirstPartyHosts(configuration.firstPartyHosts) ||
            DEFAULTS.getFirstPartyHosts(),
        ...(configuration.rumConfiguration !== undefined && {
            rumConfiguration: {
                applicationId: configuration.rumConfiguration.applicationId,
                trackInteractions:
                    configuration.rumConfiguration.trackInteractions,
                trackResources: configuration.rumConfiguration.trackResources,
                trackErrors: configuration.rumConfiguration.trackErrors,
                longTaskThresholdMs:
                    configuration.rumConfiguration.longTaskThresholdMs,
                actionNameAttribute:
                    configuration.rumConfiguration.actionNameAttribute,
                customEndpoint: configuration.rumConfiguration.customEndpoint,
                sessionSampleRate:
                    configuration.rumConfiguration.sessionSampleRate,
                trackBackgroundEvents:
                    configuration.rumConfiguration.trackBackgroundEvents,
                trackFrustrations:
                    configuration.rumConfiguration.trackFrustrations,
                trackNonFatalAnrs:
                    configuration.rumConfiguration.trackNonFatalAnrs,
                trackWatchdogTerminations:
                    configuration.rumConfiguration.trackWatchdogTerminations,
                vitalsUpdateFrequency:
                    configuration.rumConfiguration.vitalsUpdateFrequency
            }
        }),
        ...(configuration.traceConfiguration !== undefined && {
            traceConfiguration: {
                resourceTraceSampleRate:
                    configuration.traceConfiguration.resourceTraceSampleRate,
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
): FirstPartyHostsConfiguration | undefined => {
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
        return DEFAULTS.trackingConsent;
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
            return DEFAULTS.trackingConsent;
        }
    }
};

const buildSdkVerbosity = (
    verbosity: string | undefined
): SdkVerbosity | undefined => {
    if (verbosity === undefined) {
        return undefined;
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
