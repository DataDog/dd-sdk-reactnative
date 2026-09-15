/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import type { ActionEventMapper } from '../../rum/eventMappers/actionEventMapper';
import type { ErrorEventMapper } from '../../rum/eventMappers/errorEventMapper';
import type { ResourceEventMapper } from '../../rum/eventMappers/resourceEventMapper';
import type { FirstPartyHost } from '../../rum/types';
import { VitalsUpdateFrequency } from '../types';

import type {
    RumConfigurationOptions,
    RumConfigurationType
} from './RumConfiguration.type';

const DEFAULTS = {
    actionEventMapper: null,
    actionNameAttribute: undefined,
    appHangThreshold: undefined,
    customEndpoint: undefined,
    errorEventMapper: null,
    getFirstPartyHosts: () => [],
    initialResourceThreshold: undefined,
    longTaskThresholdMs: 0,
    nativeCrashReportEnabled: false,
    nativeInteractionTracking: false,
    nativeLongTaskThresholdMs: 200,
    nativeViewTracking: false,
    resourceEventMapper: null,
    resourceTraceSampleRate: 100.0,
    sessionSampleRate: 100.0,
    telemetrySampleRate: 20.0,
    trackBackgroundEvents: false,
    trackErrors: false,
    trackFetchResources: false,
    trackFrustrations: true,
    trackInteractions: false,
    trackMemoryWarnings: true,
    trackNonFatalAnrs: undefined,
    trackResources: false,
    trackWatchdogTerminations: false,
    useAccessibilityLabel: true,
    vitalsUpdateFrequency: VitalsUpdateFrequency.AVERAGE
};

export class RumConfiguration implements RumConfigurationType {
    // Custom Action Event Mapper
    public actionEventMapper: ActionEventMapper | null =
        DEFAULTS.actionEventMapper;

    // Custom Action Name Attribute for interaction tracking
    public actionNameAttribute?: string = DEFAULTS.actionNameAttribute;

    // Custom App Hang Threshold
    public appHangThreshold?: number = DEFAULTS.appHangThreshold;

    // Custom Endpoint URL
    public customEndpoint?: string = DEFAULTS.customEndpoint;

    // Custom Error Event Mapper
    public errorEventMapper: ErrorEventMapper | null =
        DEFAULTS.errorEventMapper;

    // List of First Party Hosts
    public firstPartyHosts: FirstPartyHost[] = DEFAULTS.getFirstPartyHosts();

    // Initial Resource Threshold
    public initialResourceThreshold?: number =
        DEFAULTS.initialResourceThreshold;

    // Long Task Threshold in milliseconds
    public longTaskThresholdMs: number | 0 | false =
        DEFAULTS.longTaskThresholdMs;

    // Native Crash Report enabled
    public nativeCrashReportEnabled: boolean =
        DEFAULTS.nativeCrashReportEnabled;

    // Native Interaction Tracking enabled
    public nativeInteractionTracking: boolean =
        DEFAULTS.nativeInteractionTracking;

    // Native Long Task Threshold in milliseconds
    public nativeLongTaskThresholdMs: number =
        DEFAULTS.nativeLongTaskThresholdMs;

    // Native View Tracking enabled
    public nativeViewTracking: boolean = DEFAULTS.nativeViewTracking;

    // Custom Resource Event Mapper
    public resourceEventMapper: ResourceEventMapper | null =
        DEFAULTS.resourceEventMapper;

    // Resource Trace Sample Rate for trackResources
    public resourceTraceSampleRate: number = DEFAULTS.resourceTraceSampleRate;

    // Session Sample Rate for RUM
    public sessionSampleRate: number = DEFAULTS.sessionSampleRate;

    // Telemetry Sample Rate
    public telemetrySampleRate: number = DEFAULTS.telemetrySampleRate;

    // Track Background Events Enabled
    public trackBackgroundEvents: boolean = DEFAULTS.trackBackgroundEvents;

    // Track native Fetch resources
    public trackFetchResources: boolean = DEFAULTS.trackFetchResources;

    // Track Frustrations Enabled
    public trackFrustrations: boolean = DEFAULTS.trackFrustrations;

    // Track Memory Warnings Enabled
    public trackMemoryWarnings: boolean = DEFAULTS.trackMemoryWarnings;

    // Track non-fatal ANRs enabled
    public trackNonFatalAnrs?: boolean = DEFAULTS.trackNonFatalAnrs;

    // Track Watchdog Terminations enabled
    public trackWatchdogTerminations: boolean =
        DEFAULTS.trackWatchdogTerminations;

    // Use Accessibility Label enabled for interaction tracking
    public useAccessibilityLabel: boolean = DEFAULTS.useAccessibilityLabel;

    // Custom Vitals Update Frequency
    public vitalsUpdateFrequency: VitalsUpdateFrequency =
        DEFAULTS.vitalsUpdateFrequency;

    constructor(
        readonly applicationId: string,
        readonly trackInteractions: boolean = DEFAULTS.trackInteractions,
        readonly trackResources: boolean = DEFAULTS.trackResources,
        readonly trackErrors: boolean = DEFAULTS.trackErrors,
        options: RumConfigurationOptions = {}
    ) {
        Object.assign(this, options);
    }
}

export { DEFAULTS as RUM_DEFAULTS };
