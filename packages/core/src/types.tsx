/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { BatchProcessingLevel } from './DdSdkReactNativeConfiguration';

declare global {
    // eslint-disable-next-line no-var, vars-on-top
    var __DD_RN_BABEL_PLUGIN_ENABLED__: boolean;
}

/**
 * A configuration object to initialize Datadog's features.
 */
export class DdSdkConfiguration {
    constructor(
        readonly clientToken: string,
        readonly env: string,
        readonly applicationId: string,
        readonly nativeCrashReportEnabled: boolean,
        readonly nativeLongTaskThresholdMs: number,
        readonly longTaskThresholdMs: number,
        readonly sampleRate: number,
        readonly site: string,
        readonly trackingConsent: string,
        readonly additionalConfiguration: object,
        readonly telemetrySampleRate: number,
        readonly vitalsUpdateFrequency: string,
        readonly uploadFrequency: string,
        readonly batchSize: string,
        readonly trackFrustrations: boolean,
        readonly trackBackgroundEvents: boolean,
        readonly customEndpoints: {
            rum?: string;
            trace?: string;
            logs?: string;
        },
        readonly configurationForTelemetry: {
            initializationType: string;
            trackErrors: boolean;
            trackInteractions: boolean;
            trackNetworkRequests: boolean;
            reactVersion: string;
            reactNativeVersion: string;
        },
        readonly nativeViewTracking: boolean,
        readonly nativeInteractionTracking: boolean,
        readonly verbosity: string | undefined,
        readonly proxyConfig:
            | {
                  type: string;
                  address: string;
                  port: number;
                  username?: string;
                  password?: string;
              }
            | undefined,
        readonly serviceName: string | undefined,
        readonly firstPartyHosts: {
            match: string;
            propagatorTypes: string[];
        }[],
        readonly bundleLogsWithRum: boolean,
        readonly bundleLogsWithTraces: boolean,
        readonly trackNonFatalAnrs: boolean | undefined,
        readonly appHangThreshold: number | undefined,
        readonly resourceTracingSamplingRate: number,
        readonly trackWatchdogTerminations: boolean | undefined,
        readonly batchProcessingLevel: BatchProcessingLevel, // eslint-disable-next-line no-empty-function
        readonly initialResourceThreshold: number | undefined
    ) {}
}

/**
 * The entry point to initialize Datadog's features.
 */
export type DdSdkType = {
    /**
     * Initializes Datadog's features.
     * @param configuration: The configuration to use.
     */
    initialize(configuration: DdSdkConfiguration): Promise<void>;

    /**
     * Sets the global context (set of attributes) attached with all future Logs, Spans and RUM events.
     * @param attributes: The global context attributes.
     */
    setAttributes(attributes: object): Promise<void>;

    /**
     * Sets the user information.
     * @deprecated UserInfo id property is now mandatory (please user setUserInfo instead)
     * @param user: The user object (use builtin attributes: 'id', 'email', 'name', and/or any custom attribute).
     */
    setUser(user: object): Promise<void>;

    /**
     * Sets the user information.
     * @param id: A unique user identifier (relevant to your business domain)
     * @param name: The user name or alias.
     * @param email: The user email.
     * @param extraInfo: Additional information.
     */
    setUserInfo(userInfo: UserInfo): Promise<void>;

    /**
     * Add additional user information.
     * @param extraUserInfo: The additional information. (To set the id, name or email please user setUserInfo).
     */
    addUserExtraInfo(extraUserInfo: Record<string, unknown>): Promise<void>;

    /**
     * Set the tracking consent regarding the data collection.
     * @param trackingConsent: Consent, which can take one of the following values: 'pending', 'granted', 'not_granted'.
     */
    setTrackingConsent(trackingConsent: string): Promise<void>;
};

export type UserInfo = {
    id: string;
    name?: string;
    email?: string;
    extraInfo?: object;
};

/**
 * The entry point to use Datadog's Trace feature.
 */
export type DdTraceType = {
    /**
     * Start a span, and returns a unique identifier for the span.
     * @param operation: The operation name of the span.
     * @param context: The additional context to send.
     * @param timestampMs: The timestamp when the operation started (in milliseconds). If not provided, current timestamp will be used.
     */
    startSpan(
        operation: string,
        context?: object,
        timestampMs?: number
    ): Promise<string>;

    /**
     * Finish a started span.
     * @param spanId: The unique identifier of the span.
     * @param context: The additional context to send.
     * @param timestampMs: The timestamp when the operation stopped (in milliseconds). If not provided, current timestamp will be used.
     */
    finishSpan(
        spanId: string,
        context?: object,
        timestampMs?: number
    ): Promise<void>;
};
