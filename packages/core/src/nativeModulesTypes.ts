/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { Spec as NativeDdCoreTests } from './specs/NativeDdCoreTests';
import type { Spec as NativeDdLogs } from './specs/NativeDdLogs';
import type { Spec as NativeDdRum } from './specs/NativeDdRum';
import type { Spec as NativeDdSdk } from './specs/NativeDdSdk';
import type { Spec as NativeDdTrace } from './specs/NativeDdTrace';

/**
 * In this file, native modules types extend the specs for TurboModules.
 * As we cannot use enums or classes in the specs, we override methods using them here.
 */

/**
 * The entry point to use Datadog's Logs feature.
 */
export type DdNativeLogsType = NativeDdLogs;

/**
 * The entry point to use Datadog's Trace feature.
 */
export type DdNativeTraceType = NativeDdTrace;

export type DdNativeCoreTestsType = NativeDdCoreTests;

/**
 * A configuration object to initialize Datadog's features.
 */
export class DdNativeSdkConfiguration {
    constructor(
        readonly clientToken: string,
        readonly env: string,
        readonly applicationId: string,
        readonly nativeCrashReportEnabled: boolean,
        readonly sampleRate: number,
        readonly site: string,
        readonly trackingConsent: string,
        readonly additionalConfig: object
    ) {}
}

/**
 * The entry point to initialize Datadog's features.
 */
export interface DdNativeSdkType extends NativeDdSdk {
    /**
     * Initializes Datadog's features.
     * @param configuration: The configuration to use.
     */
    initialize(configuration: DdNativeSdkConfiguration): Promise<void>;
}

type ActionType = 'TAP' | 'SCROLL' | 'SWIPE' | 'BACK' | 'CUSTOM';

type ResourceKind =
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

type ErrorSource = 'NETWORK' | 'SOURCE' | 'CONSOLE' | 'WEBVIEW' | 'CUSTOM';

/**
 * The entry point to use Datadog's RUM feature.
 */
export interface DdNativeRumType extends NativeDdRum {
    /**
     * Start tracking a RUM Action.
     * @param type: The action type (tap, scroll, swipe, back, custom).
     * @param name: The action name.
     * @param context: The additional context to send.
     * @param timestampMs: The timestamp when the action started (in milliseconds). If not provided, current timestamp will be used.
     */
    startAction(
        type: ActionType,
        name: string,
        context: object,
        timestampMs: number
    ): Promise<void>;

    /**
     * Stop tracking the ongoing RUM Action.
     * @param type: The action type (tap, scroll, swipe, back, custom).
     * @param name: The action name.
     * @param context: The additional context to send.
     * @param timestampMs: The timestamp when the action stopped (in milliseconds). If not provided, current timestamp will be used.
     */
    stopAction(
        type: ActionType,
        name: string,
        context: object,
        timestampMs: number
    ): Promise<void>;

    /**
     * Add a RUM Action.
     * @param type: The action type (tap, scroll, swipe, back, custom).
     * @param name: The action name.
     * @param context: The additional context to send.
     * @param timestampMs: The timestamp when the action occurred (in milliseconds). If not provided, current timestamp will be used.
     */
    addAction(
        type: ActionType,
        name: string,
        context: object,
        timestampMs: number
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
        size: number,
        context: object,
        timestampMs: number
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
        context: object,
        timestampMs: number
    ): Promise<void>;
}
