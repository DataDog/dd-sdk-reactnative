/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import type { ActionEventMapper } from '../../rum/eventMappers/actionEventMapper';
import type { ErrorEventMapper } from '../../rum/eventMappers/errorEventMapper';
import type { ResourceEventMapper } from '../../rum/eventMappers/resourceEventMapper';
import type { FirstPartyHost } from '../../rum/types';
import type { VitalsUpdateFrequency } from '../types';

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
 * Captures a predefined set of caching and content headers from both
 * request and response.
 *
 * Default headers captured:
 * - **Response:** cache-control, etag, age, expires, content-type,
 *   content-encoding, content-length, vary, server-timing, x-cache
 * - **Request:** cache-control, content-type
 *
 * Optionally scoped to specific URLs via `forURLs`.
 */
export type DefaultsRule = {
    type: 'defaults';
    /**
     * URL patterns to scope this rule to. Supports hostname-only
     * ('api.example.com') or hostname+path prefix ('api.example.com/v2').
     * Omit to match all URLs.
     */
    forURLs?: string[];
};

/**
 * Captures the specified headers from both request and response.
 *
 * Use this when the same header names should be captured regardless
 * of direction (e.g. 'content-type', 'authorization').
 * Optionally scoped to specific URLs via `forURLs`.
 */
export type MatchHeadersRule = {
    type: 'matchHeaders';
    /**
     * Header names to capture from both request and response.
     * Preserved as-is; compared case-insensitively at capture time.
     */
    headers: string[];
    /**
     * URL patterns to scope this rule to. Supports hostname-only
     * ('api.example.com') or hostname+path prefix ('api.example.com/v2').
     * Omit to match all URLs.
     */
    forURLs?: string[];
};

/**
 * Captures the specified headers from requests only.
 *
 * Use this when you need to capture request-specific headers
 * (e.g. 'authorization', 'x-api-key') without capturing response headers.
 * Optionally scoped to specific URLs via `forURLs`.
 */
export type MatchRequestHeadersRule = {
    type: 'matchRequestHeaders';
    /**
     * Request header names to capture.
     * Preserved as-is; compared case-insensitively at capture time.
     */
    headers: string[];
    /**
     * URL patterns to scope this rule to. Supports hostname-only
     * ('api.example.com') or hostname+path prefix ('api.example.com/v2').
     * Omit to match all URLs.
     */
    forURLs?: string[];
};

/**
 * Captures the specified headers from responses only.
 *
 * Use this when you need to capture response-specific headers
 * (e.g. 'x-request-id', 'x-ratelimit-remaining') without capturing
 * request headers.
 * Optionally scoped to specific URLs via `forURLs`.
 */
export type MatchResponseHeadersRule = {
    type: 'matchResponseHeaders';
    /**
     * Response header names to capture.
     * Preserved as-is; compared case-insensitively at capture time.
     */
    headers: string[];
    /**
     * URL patterns to scope this rule to. Supports hostname-only
     * ('api.example.com') or hostname+path prefix ('api.example.com/v2').
     * Omit to match all URLs.
     */
    forURLs?: string[];
};

/**
 * A composable header capture rule.
 *
 * Discriminated union on the `type` field. Multiple rules can be combined
 * in an array. Matching rules are merged additively (union of headers).
 * If at least one scoped rule (explicit `forURLs` patterns) matches a URL,
 * catch-all rules (omitted `forURLs` / `['*']`) are ignored for that URL.
 */
export type HeaderCaptureRule =
    | DefaultsRule
    | MatchHeadersRule
    | MatchRequestHeadersRule
    | MatchResponseHeadersRule;

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
     * List of backend hosts used to enable tracing.
     */
    firstPartyHosts?: FirstPartyHost[];

    /**
     * Controls which resource headers the SDK captures on network requests.
     *
     * - **Omitted** (default): No headers are captured.
     * - `'defaults'`: Shortcut equivalent to `[{ type: 'defaults' }]`.
     *   Captures a predefined set of caching and content headers.
     * - `HeaderCaptureRule[]`: An array of composable rules. Matching rules are
     *   merged additively (union of headers). If at least one scoped rule (explicit
     *   `forURLs` patterns) matches a URL, catch-all rules (omitted `forURLs` / `['*']`)
     *   are ignored for that URL.
     *
     * Requires `trackResources: true` to take effect.
     */
     * Requires `trackResources: true` to take effect.
     */
    headerCaptureRules?: 'defaults' | HeaderCaptureRule[];

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
