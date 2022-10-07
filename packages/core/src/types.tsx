/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * A configuration object to initialize Datadog's features.
 */
export class DdSdkConfiguration {
    constructor(
        readonly clientToken: string,
        readonly env: string,
        readonly applicationId: string,
        readonly nativeCrashReportEnabled: boolean,
        readonly sampleRate: number,
        readonly site: string,
        readonly trackingConsent: string,
        readonly additionalConfig: object,
        readonly telemetrySampleRate?: number
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
     * Set the user information.
     * @param user: The user object (use builtin attributes: 'id', 'email', 'name', and/or any custom attribute).
     */
    setUser(user: object): Promise<void>;

    /**
     * Set the tracking consent regarding the data collection.
     * @param trackingConsent: Consent, which can take one of the following values: 'pending', 'granted', 'not_granted'.
     */
    setTrackingConsent(trackingConsent: string): Promise<void>;
};

/**
 * The entry point to use Datadog's Logs feature.
 */
export type DdLogsType = {
    /**
     * Send a log with level debug.
     * @param message: The message to send.
     * @param context: The additional context to send.
     */
    debug(message: string, context?: object): Promise<void>;

    /**
     * Send a log with level info.
     * @param message: The message to send.
     * @param context: The additional context to send.
     */
    info(message: string, context?: object): Promise<void>;

    /**
     * Send a log with level warn.
     * @param message: The message to send.
     * @param context: The additional context to send.
     */
    warn(message: string, context?: object): Promise<void>;

    /**
     * Send a log with level error.
     * @param message: The message to send.
     * @param context: The additional context to send.
     */
    error(message: string, context?: object): Promise<void>;
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

/**
 * The entry point to use Datadog's RUM feature.
 */
export type DdRumType = {
    /**
     * Start tracking a RUM View.
     * @param key: The view unique key identifier.
     * @param name: The view name.
     * @param context: The additional context to send.
     * @param timestampMs: The timestamp when the view started (in milliseconds). If not provided, current timestamp will be used.
     */
    startView(
        key: string,
        name: string,
        context?: object,
        timestampMs?: number
    ): Promise<void>;

    /**
     * Stop tracking a RUM View.
     * @param key: The view unique key identifier.
     * @param context: The additional context to send.
     * @param timestampMs: The timestamp when the view stopped (in milliseconds). If not provided, current timestamp will be used.
     */
    stopView(
        key: string,
        context?: object,
        timestampMs?: number
    ): Promise<void>;

    /**
     * Start tracking a RUM Action.
     * @param type: The action type (tap, scroll, swipe, back, custom).
     * @param name: The action name.
     * @param context: The additional context to send.
     * @param timestampMs: The timestamp when the action started (in milliseconds). If not provided, current timestamp will be used.
     */
    startAction(
        type: RumActionType,
        name: string,
        context?: object,
        timestampMs?: number
    ): Promise<void>;

    /**
     * Stop tracking the ongoing RUM Action.
     * @param type: The action type (tap, scroll, swipe, back, custom).
     * @param name: The action name.
     * @param context: The additional context to send.
     * @param timestampMs: The timestamp when the action stopped (in milliseconds). If not provided, current timestamp will be used.
     */
    stopAction(
        type: RumActionType,
        name: string,
        context?: object,
        timestampMs?: number
    ): Promise<void>;

    /**
     * Stop tracking the ongoing RUM Action.
     *
     * Warning: using this function signature can lead to inconsistent behaviors on iOS and Android when multiple actions are started in parallel.
     *
     * @deprecated add the `type` and `name` of the action as first two arguments.
     * @param context: The additional context to send.
     * @param timestampMs: The timestamp when the action stopped (in milliseconds). If not provided, current timestamp will be used.
     */
    stopAction(context?: object, timestampMs?: number): Promise<void>;

    /**
     * Add a RUM Action.
     * @param type: The action type (tap, scroll, swipe, back, custom).
     * @param name: The action name.
     * @param context: The additional context to send.
     * @param timestampMs: The timestamp when the action occurred (in milliseconds). If not provided, current timestamp will be used.
     */
    addAction(
        type: RumActionType,
        name: string,
        context?: object,
        timestampMs?: number
    ): Promise<void>;

    /**
     * Start tracking a RUM Resource.
     * @param key: The resource unique key identifier.
     * @param method: The resource method (GET, POST, …).
     * @param url: The resource url.
     * @param context: The additional context to send.
     * @param timestampMs: The timestamp when the resource started (in milliseconds). If not provided, current timestamp will be used.
     */
    startResource(
        key: string,
        method: string,
        url: string,
        context?: object,
        timestampMs?: number
    ): Promise<void>;

    /**
     * Stop tracking a RUM Resource.
     * @param key: The resource unique key identifier.
     * @param statusCode: The resource status code.
     * @param kind: The resource's kind (xhr, document, image, css, font, …).
     * @param size: The resource size in bytes. If size is unknown, use -1.
     * @param context: The additional context to send.
     * @param timestampMs: The timestamp when the resource stopped (in milliseconds). If not provided, current timestamp will be used.
     */
    stopResource(
        key: string,
        statusCode: number,
        kind: ResourceKind,
        size?: number,
        context?: object,
        timestampMs?: number
    ): Promise<void>;

    /**
     * Add a RUM Error.
     * @param message: The error message.
     * @param source: The error source (network, source, console, webview, custom).
     * @param stacktrace: The error stacktrace.
     * @param context: The additional context to send.
     * @param timestampMs: The timestamp when the error occurred (in milliseconds). If not provided, current timestamp will be used.
     */
    addError(
        message: string,
        source: ErrorSource,
        stacktrace: string,
        context?: object,
        timestampMs?: number
    ): Promise<void>;

    /**
     * Adds a specific timing in the active View. The timing duration will be computed as the difference between the time the View was started and the time this function was called.
     * @param name: The name of the new custom timing attribute. Timings can be nested up to 8 levels deep. Names using more than 8 levels will be sanitized by SDK.
     */
    addTiming(name: string): Promise<void>;
};

/**
 * Describe the type of a RUM Action.
 */
export enum RumActionType {
    /** User tapped on a widget. */
    TAP = 'TAP',
    /** User scrolled a view. */
    SCROLL = 'SCROLL',
    /** User swiped on a view. */
    SWIPE = 'SWIPE',
    /** User pressed hardware back button (Android only). */
    BACK = 'BACK',
    /** A custom action. */
    CUSTOM = 'CUSTOM'
}

export type ResourceKind =
    | 'image'
    | 'xhr'
    | 'beacon'
    | 'css'
    | 'document'
    | 'fetch'
    | 'font'
    | 'js'
    | 'media'
    | 'other'
    | 'native';

export enum ErrorSource {
    NETWORK = 'NETWORK',
    SOURCE = 'SOURCE',
    CONSOLE = 'CONSOLE',
    WEBVIEW = 'WEBVIEW',
    CUSTOM = 'CUSTOM'
}
