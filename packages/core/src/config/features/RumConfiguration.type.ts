/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import type { ActionEventMapper } from '../../rum/eventMappers/actionEventMapper';
import type { ErrorEventMapper } from '../../rum/eventMappers/errorEventMapper';
import type { ResourceEventMapper } from '../../rum/eventMappers/resourceEventMapper';
import type { FirstPartyHost } from '../../rum/types';
import type { TimeseriesConfiguration, VitalsUpdateFrequency } from '../types';

/**
 * Required RUM configuration values.
 */
export interface RumConfigurationRequired {
    /**
     * The Datadog RUM application ID.
     */
    applicationId: string;

    /**
     * Enables tracking of user interactions.
     * Defaults to the SDK-defined value.
     */
    trackInteractions?: boolean;

    /**
     * Enables tracking of network resources.
     * Defaults to the SDK-defined value.
     */
    trackResources?: boolean;

    /**
     * Enables tracking of errors.
     * Defaults to the SDK-defined value.
     */
    trackErrors?: boolean;
}

/**
 * Optional RUM configuration values.
 */
export interface RumConfigurationOptions {
    /**
     * Custom mapper to transform RUM action events.
     */
    actionEventMapper?: ActionEventMapper | null;

    /**
     * Custom attribute used to name RUM actions.
     */
    actionNameAttribute?: string;

    /**
     * App hang threshold in seconds for non-fatal app hangs on iOS.
     */
    appHangThreshold?: number;

    /**
     * Sets a target custom server for RUM.
     */
    customEndpoint?: string;

    /**
     * Custom mapper to transform RUM error events.
     */
    errorEventMapper?: ErrorEventMapper | null;

    /**
     * Enables tracking of requests made with native Fetch implementations,
     * such as the global Fetch installed by Expo.
     *
     * This option only takes effect when resource tracking is enabled.
     */
    trackFetchResources?: boolean;

    /**
     * List of backend hosts used to enable tracing.
     */
    firstPartyHosts?: FirstPartyHost[];

    /**
     * Initial resource collection threshold in seconds.
     */
    initialResourceThreshold?: number;

    /**
     * Threshold for JavaScript long task reporting in milliseconds.
     */
    longTaskThresholdMs?: number | false;

    /**
     * Enables native crash reporting.
     */
    nativeCrashReportEnabled?: boolean;

    /**
     * Threshold for native long task reporting in milliseconds.
     */
    nativeLongTaskThresholdMs?: number;

    /**
     * Enables native interaction tracking.
     */
    nativeInteractionTracking?: boolean;

    /**
     * Enables native view tracking.
     */
    nativeViewTracking?: boolean;

    /**
     * Custom mapper to transform RUM resource events.
     */
    resourceEventMapper?: ResourceEventMapper | null;

    /**
     * Percentage of traced network requests.
     */
    resourceTraceSampleRate?: number;

    /**
     * Percentage of sampled RUM sessions.
     */
    sessionSampleRate?: number;

    /**
     * Experimental: configuration for memory and CPU timeseries collection.
     * Requires a native SDK build with timeseries support.
     */
    timeseries?: TimeseriesConfiguration;

    /**
     * Enables tracking of background RUM events.
     */
    trackBackgroundEvents?: boolean;

    /**
     * Enables tracking of frustration signals.
     */
    trackFrustrations?: boolean;

    /**
     * Enables tracking of non-fatal ANRs on Android.
     */
    trackNonFatalAnrs?: boolean;

    /**
     * Enables tracking of app termination by the iOS watchdog.
     */
    trackWatchdogTerminations?: boolean;

    /**
     * Sampling rate for internal SDK telemetry.
     */
    telemetrySampleRate?: number;

    /**
     * Enables tracking of memory warnings (iOS only).
     */
    trackMemoryWarnings?: boolean;

    /**
     * Enables accessibility label usage for action names.
     */
    useAccessibilityLabel?: boolean;

    /**
     * Preferred frequency for collecting mobile vitals.
     */
    vitalsUpdateFrequency?: VitalsUpdateFrequency;
}

/**
 * Complete RUM configuration type.
 */
export type RumConfigurationType = RumConfigurationRequired &
    RumConfigurationOptions;
