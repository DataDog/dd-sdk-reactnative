/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { LogStatus, ErrorSource } from '../types';

/**
 * The entry point to use Datadog's Logs feature.
 */
export type DdLogsType = {
    /**
     * Send a log with debug level.
     * @param message: The message to send.
     * @param context: The additional context to send.
     */
    debug(...args: LogArguments | LogWithErrorArguments): Promise<void>;

    /**
     * Send a log with info level.
     * @param message: The message to send.
     * @param context: The additional context to send.
     */
    info(...args: LogArguments | LogWithErrorArguments): Promise<void>;

    /**
     * Send a log with warn level.
     * @param message: The message to send.
     * @param context: The additional context to send.
     */
    warn(...args: LogArguments | LogWithErrorArguments): Promise<void>;

    /**
     * Send a log with error level.
     * @param message: The message to send.
     * @param context: The additional context to send.
     */
    error(...args: LogArguments | LogWithErrorArguments): Promise<void>;
};

/**
 * Log input from developers
 */
export type RawLog = {
    message: string;
    context: object;
    status: LogStatus;
};
export type RawLogWithError = {
    message: string;
    errorKind?: string;
    errorMessage?: string;
    stacktrace?: string;
    context: object;
    status: LogStatus;
    fingerprint?: string;
    source?: ErrorSource;
};

/**
 * Log input for native SDKs
 */
export type NativeLog = {
    message: string;
    context: object;
};
export type NativeLogWithError = {
    message: string;
    errorKind: string;
    errorMessage: string;
    stacktrace: string;
    context: object;
    fingerprint?: string;
};

export type LogArguments = [message: string, context?: object];

export type LogWithErrorArguments = [
    message: string,
    errorKind?: string,
    errorMessage?: string,
    stacktrace?: string,
    context?: object,
    fingerprint?: string,
    source?: ErrorSource
];
