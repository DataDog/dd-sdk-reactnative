/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * Do not import this Spec directly, use DdNativeLogsType instead.
 */
export interface Spec extends TurboModule {
    readonly getConstants: () => {};

    /**
     * Send a log with DEBUG level.
     * @param message: The message to send.
     * @param context: The additional context to send.
     */
    readonly debug: (message: string, context: Object) => Promise<void>;

    /**
     * Send a log with INFO level.
     * @param message: The message to send.
     * @param context: The additional context to send.
     */
    readonly info: (message: string, context: Object) => Promise<void>;

    /**
     * Send a log with WARN level.
     * @param message: The message to send.
     * @param context: The additional context to send.
     */
    readonly warn: (message: string, context: Object) => Promise<void>;

    /**
     * Send a log with ERROR level.
     * @param message: The message to send.
     * @param context: The additional context to send.
     */
    readonly error: (message: string, context: Object) => Promise<void>;

    /**
     * Send a log containing an error with DEBUG level.
     * @param message: The message to send.
     * @param errorKind: The error kind to send.
     * @param errorMessage: The error message to send.
     * @param stacktrace: The stack trace to send.
     * @param context: The additional context to send.
     */
    readonly debugWithError: (
        message: string,
        errorKind: string,
        errorMessage: string,
        stacktrace: string,
        context: Object
    ) => Promise<void>;

    /**
     * Send a log containing an error with INFO level.
     * @param message: The message to send.
     * @param errorKind: The error kind to send.
     * @param errorMessage: The error message to send.
     * @param stacktrace: The stack trace to send.
     * @param context: The additional context to send.
     */
    readonly infoWithError: (
        message: string,
        errorKind: string,
        errorMessage: string,
        stacktrace: string,
        context: Object
    ) => Promise<void>;

    /**
     * Send a log containing an error with WARN level.
     * @param message: The message to send.
     * @param errorKind: The error kind to send.
     * @param errorMessage: The error message to send.
     * @param stacktrace: The stack trace to send.
     * @param context: The additional context to send.
     */
    readonly warnWithError: (
        message: string,
        errorKind: string,
        errorMessage: string,
        stacktrace: string,
        context: Object
    ) => Promise<void>;

    /**
     * Send a log containing an error with ERROR level.
     * @param message: The message to send.
     * @param errorKind: The error kind to send.
     * @param errorMessage: The error message to send.
     * @param stacktrace: The stack trace to send.
     * @param context: The additional context to send.
     */
    readonly errorWithError: (
        message: string,
        errorKind: string,
        errorMessage: string,
        stacktrace: string,
        context: Object
    ) => Promise<void>;
}

// eslint-disable-next-line import/no-default-export
export default TurboModuleRegistry.get<Spec>('DdLogs');
