/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
    readonly getConstants: () => {};

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
        context?: Object,
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
        context?: Object,
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
        type: string,
        name: string,
        context?: Object,
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
        type: string,
        name: string,
        context?: Object,
        timestampMs?: number
    ): Promise<void>;

    /**
     * Add a RUM Action.
     * @param type: The action type (tap, scroll, swipe, back, custom).
     * @param name: The action name.
     * @param context: The additional context to send.
     * @param timestampMs: The timestamp when the action occurred (in milliseconds). If not provided, current timestamp will be used.
     */
    addAction(
        type: string,
        name: string,
        context?: Object,
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
        context?: Object,
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
        kind: string,
        size?: number,
        context?: Object,
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
        source: string,
        stacktrace: string,
        context?: Object,
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

    /**
     * Adds the result of evaluating a feature flag with a given name and value to the view.
     * Feature flag evaluations are local to the active view and are cleared when the view is stopped.
     * @param name: The name of the feature flag
     * @param value: The value of the feature flag, encapsulated in an Object to accept all types
     */
    addFeatureFlagEvaluation(name: string, value: Object): Promise<void>;
}

export default TurboModuleRegistry.get<Spec>('DdRum');
