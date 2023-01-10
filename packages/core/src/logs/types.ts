/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { UserInfo } from '../sdk/UserInfoSingleton/types';

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

export type RawLog = {
    message: string;
    context: object;
};

export type LogStatus = 'debug' | 'info' | 'warn' | 'error';

export type LogEvent = {
    message: string;
    context: object;
    // readonly date: number; // TODO: RUMM-2446 & RUMM-2447
    readonly status: LogStatus;
    readonly userInfo: UserInfo;
    readonly attributes?: object;
};

export type LogEventMapper = (logEvent: LogEvent) => LogEvent;
