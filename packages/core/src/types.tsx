/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { BatchProcessingLevel } from './DdSdkReactNativeConfiguration';
import type { AttributeEncoder } from './sdk/AttributesEncoding/types';

declare global {
    // eslint-disable-next-line no-var, vars-on-top
    var __DD_RN_BABEL_PLUGIN_ENABLED__: boolean;
}

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
        readonly nativeCrashReportEnabled: boolean,
        readonly nativeLongTaskThresholdMs: number,
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
        readonly firstPartyHosts: {
            match: string;
            propagatorTypes: string[];
        }[],
        readonly attributeEncoders: AttributeEncoder<any>[],
        readonly rumConfiguration: RUMNativeConfiguration | undefined,
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

export type RUMNativeConfiguration = {
    readonly applicationId: string;
    readonly trackFrustrations: boolean;
    readonly longTaskThresholdMs: number;
    readonly sessionSampleRate: number;
    readonly vitalsUpdateFrequency: string;
    readonly trackBackgroundEvents: boolean;
    readonly nativeViewTracking: boolean;
    readonly nativeInteractionTracking: boolean;
    readonly trackNonFatalAnrs: boolean | undefined;
    readonly appHangThreshold: number | undefined;
    readonly trackWatchdogTerminations: boolean | undefined;
    readonly initialResourceThreshold: number | undefined;
    readonly trackMemoryWarnings: boolean;
    readonly telemetrySampleRate: number;
    readonly customEndpoint: string;
};

export type LogsNativeConfiguration = {
    readonly bundleLogsWithRum: boolean;
    readonly bundleLogsWithTraces: boolean;
    readonly customEndpoint: string;
};

export type TraceNativeConfiguration = {
    readonly resourceTraceSampleRate: number;
    readonly customEndpoint: string;
};

/**
 * The entry point to initialize Datadog's features.
 */
export type DdSdkType = {
    /**
     * Initializes Datadog's features.
     * @param configuration: The configuration to use.
     */
    initialize(configuration: DdSdkNativeConfiguration): Promise<void>;

    /**
     * Sets a specific attribute in the global context attached with all future Logs, Spans and RUM
     * @param key: Key that identifies the attribute.
     * @param value: Value linked to the attribute.
     */
    addAttribute(key: string, value: object): Promise<void>;

    /**
     * Removes an attribute from the context attached with all future Logs, Spans and RUM events.
     * @param key: They key associated with the attribute to be removed.
     */
    removeAttribute(key: string): Promise<void>;

    /**
     * Sets the global context (set of attributes) attached with all future Logs, Spans and RUM events.
     * @param attributes: The global context attributes.
     */
    addAttributes(attributes: object): Promise<void>;

    /**
     * Removes a set of attributes from the context attached with all future Logs, Spans and RUM events.
     * @param keys: They keys associated with the attributes to be removed.
     */
    removeAttributes(keys: string[]): Promise<void>;

    /**
     * Sets the user information.
     * @param id: A unique user identifier (relevant to your business domain)
     * @param name: The user name or alias.
     * @param email: The user email.
     * @param extraInfo: Additional information.
     */
    setUserInfo(userInfo: UserInfo): Promise<void>;

    /**
     * Clears the user information.
     */
    clearUserInfo(): Promise<void>;

    /**
     * Add additional user information.
     * @param extraUserInfo: The additional information. (To set the id, name or email please user setUserInfo).
     */
    addUserExtraInfo(extraUserInfo: Record<string, unknown>): Promise<void>;

    /**
     * Sets the account information.
     * @param id: A unique account identifier (relevant to your business domain)
     * @param name: The account name.
     * @param extraInfo: Additional information.
     */
    setAccountInfo(accountInfo: AccountInfo): Promise<void>;

    /**
     * Clears the account information.
     */
    clearAccountInfo(): Promise<void>;

    /**
     * Add additional account information.
     * @param extraAccountInfo: The additional information. (To set the id or name please use setAccountInfo).
     */
    addAccountExtraInfo(
        extraAccountInfo: Record<string, unknown>
    ): Promise<void>;

    /**
     * Set the tracking consent regarding the data collection.
     * @param trackingConsent: Consent, which can take one of the following values: 'pending', 'granted', 'not_granted'.
     */
    setTrackingConsent(trackingConsent: string): Promise<void>;
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

// Shared types across modules

// Core

export type UserInfo = {
    id: string;
    name?: string;
    email?: string;
    extraInfo?: object;
};

export type AccountInfo = {
    id: string;
    name?: string;
    extraInfo?: object;
};

// DdLogs

export type LogStatus = 'debug' | 'info' | 'warn' | 'error';

export type LogEvent = {
    message: string;
    context: object;
    errorKind?: string;
    errorMessage?: string;
    stacktrace?: string;
    fingerprint?: string;
    readonly source?: ErrorSource;
    // readonly date: number; // TODO: RUMM-2446 & RUMM-2447
    readonly status: LogStatus;
    readonly userInfo?: UserInfo;
    readonly attributes?: object;
};

export type LogEventMapper = (logEvent: LogEvent) => LogEvent | null;

// DdRum
export enum ErrorSource {
    NETWORK = 'NETWORK',
    SOURCE = 'SOURCE',
    CONSOLE = 'CONSOLE',
    WEBVIEW = 'WEBVIEW',
    CUSTOM = 'CUSTOM'
}

export enum FeatureOperationFailure {
    ERROR = 'ERROR',
    ABANDONED = 'ABANDONED',
    OTHER = 'OTHER'
}
