/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import type { ActionEventMapper } from '../../rum/eventMappers/actionEventMapper';
import type { ErrorEventMapper } from '../../rum/eventMappers/errorEventMapper';
import type { ResourceEventMapper } from '../../rum/eventMappers/resourceEventMapper';
import type { FirstPartyHost } from '../../rum/types';
import type { LogEventMapper } from '../../types';
import { LOGS_DEFAULTS } from '../features/LogsConfiguration';
import { RUM_DEFAULTS } from '../features/RumConfiguration';
import type { TraceConfiguration } from '../features/TraceConfiguration';

/**
 * Auto Instrumentation configuration passed to DatadogProvider.
 * Does not include default values.
 */
export type AutoInstrumentationConfiguration = {
    readonly rumConfiguration: {
        readonly trackInteractions: boolean;
        readonly trackResources: boolean;
        readonly trackFetchResources?: boolean;
        readonly trackErrors: boolean;
        readonly useAccessibilityLabel?: boolean;
        readonly actionNameAttribute?: string;
        readonly resourceTraceSampleRate?: number;
        readonly nativeCrashReportEnabled?: boolean;
        readonly nativeLongTaskThresholdMs?: number;
        readonly nativeViewTracking?: boolean;
        readonly actionEventMapper?: ActionEventMapper | null;
        readonly errorEventMapper?: ErrorEventMapper | null;
        readonly resourceEventMapper?: ResourceEventMapper | null;
        readonly firstPartyHosts?: FirstPartyHost[];
    };
    readonly logsConfiguration: {
        readonly logEventMapper?: LogEventMapper | null;
    };
};

/**
 * Parameters needed to start auto instrumentation. Includes default values.
 */
export type AutoInstrumentationParameters = {
    readonly rumConfiguration?: {
        readonly useAccessibilityLabel: boolean;
        readonly trackInteractions: boolean;
        readonly trackResources: boolean;
        readonly trackFetchResources: boolean;
        readonly trackErrors: boolean;
        readonly actionNameAttribute?: string;
        readonly resourceTraceSampleRate?: number;
        readonly nativeCrashReportEnabled?: boolean;
        readonly nativeLongTaskThresholdMs?: number;
        readonly nativeViewTracking?: boolean;
        readonly actionEventMapper: ActionEventMapper | null;
        readonly errorEventMapper: ErrorEventMapper | null;
        readonly resourceEventMapper: ResourceEventMapper | null;
        readonly firstPartyHosts: FirstPartyHost[];
    };
    readonly logsConfiguration?: {
        readonly logEventMapper: LogEventMapper | null;
    };
    readonly traceConfiguration?: TraceConfiguration;
};

/**
 * We could use `Proxy` instead of this function, but `Proxy` is not available on
 * the older android jsc that can still be used.
 */
export const addDefaultValuesToAutoInstrumentationConfiguration = (
    features: AutoInstrumentationConfiguration
): AutoInstrumentationParameters => {
    return {
        rumConfiguration: {
            useAccessibilityLabel:
                features.rumConfiguration.useAccessibilityLabel === undefined
                    ? RUM_DEFAULTS.useAccessibilityLabel
                    : features.rumConfiguration.useAccessibilityLabel,
            trackInteractions:
                features.rumConfiguration.trackInteractions ??
                RUM_DEFAULTS.trackInteractions,
            trackResources:
                features.rumConfiguration.trackResources ??
                RUM_DEFAULTS.trackResources,
            trackFetchResources:
                features.rumConfiguration.trackFetchResources ??
                RUM_DEFAULTS.trackFetchResources,
            trackErrors:
                features.rumConfiguration.trackErrors ??
                RUM_DEFAULTS.trackErrors,
            actionNameAttribute:
                features.rumConfiguration.actionNameAttribute ??
                RUM_DEFAULTS.actionNameAttribute,
            errorEventMapper:
                features.rumConfiguration.errorEventMapper === undefined
                    ? RUM_DEFAULTS.errorEventMapper
                    : features.rumConfiguration.errorEventMapper,
            resourceEventMapper:
                features.rumConfiguration.resourceEventMapper === undefined
                    ? RUM_DEFAULTS.resourceEventMapper
                    : features.rumConfiguration.resourceEventMapper,
            actionEventMapper:
                features.rumConfiguration.actionEventMapper === undefined
                    ? RUM_DEFAULTS.actionEventMapper
                    : features.rumConfiguration.actionEventMapper,
            resourceTraceSampleRate:
                features.rumConfiguration.resourceTraceSampleRate === undefined
                    ? RUM_DEFAULTS.resourceTraceSampleRate
                    : features.rumConfiguration.resourceTraceSampleRate,
            nativeCrashReportEnabled:
                features.rumConfiguration.nativeCrashReportEnabled ??
                RUM_DEFAULTS.nativeCrashReportEnabled,
            nativeLongTaskThresholdMs:
                features.rumConfiguration.nativeLongTaskThresholdMs ??
                RUM_DEFAULTS.nativeLongTaskThresholdMs,
            nativeViewTracking:
                features.rumConfiguration.nativeViewTracking ??
                RUM_DEFAULTS.nativeViewTracking,
            firstPartyHosts:
                features.rumConfiguration.firstPartyHosts ||
                RUM_DEFAULTS.getFirstPartyHosts()
        },
        logsConfiguration: {
            logEventMapper:
                features.logsConfiguration.logEventMapper === undefined
                    ? LOGS_DEFAULTS.logEventMapper
                    : features.logsConfiguration.logEventMapper
        }
    };
};
