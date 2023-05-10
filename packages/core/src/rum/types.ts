/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

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

    /**
     * Stops the current RUM Session.
     */
    stopSession(): Promise<void>;
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

/**
 * Type of instrumentation on the host.
 * - DATADOG: Datadog’s propagator (`x-datadog-*`)
 * - TRACECONTEXT: W3C Trace Context (`traceparent`)
 * - B3: B3 single header (`b3`)
 * - B3MULTI: B3 multiple headers (`X-B3-*`)
 */
export enum PropagatorType {
    DATADOG = 'datadog',
    TRACECONTEXT = 'tracecontext',
    B3 = 'b3',
    B3MULTI = 'b3multi'
}

export type FirstPartyHost = {
    match: string;
    propagatorTypes: PropagatorType[];
};
