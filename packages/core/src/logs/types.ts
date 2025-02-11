/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdAttributes } from '../rum/DdAttributes';
import type { ErrorSource } from '../rum/types';
import type { UserInfo } from '../sdk/UserInfoSingleton/types';

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
    readonly userInfo: UserInfo;
    readonly attributes?: object;
};

export class InternalLogEvent implements LogEvent {
    message: string;
    context: object;
    errorKind?: string | undefined;
    errorMessage?: string | undefined;
    stacktrace?: string | undefined;
    source?: ErrorSource | undefined;
    status: LogStatus;
    userInfo: UserInfo;
    attributes?: object | undefined;

    public get fingerprint(): string | undefined {
        return (this.context as any)[DdAttributes.errorFingerprint] as string;
    }
    public set fingerprint(value: string | undefined) {
        (this.context as any)[DdAttributes.errorFingerprint] = value;
    }

    constructor(props: LogEvent) {
        this.message = props.message;
        this.context = props.context;
        this.errorKind = props.errorKind;
        this.errorMessage = props.errorMessage;
        this.stacktrace = props.stacktrace;
        this.fingerprint = props.fingerprint;
        this.status = props.status;
        this.source = props.source;
        this.userInfo = props.userInfo;
        this.attributes = props.attributes;
    }
}

export type LogEventMapper = (logEvent: LogEvent) => LogEvent | null;

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
