/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

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

export type LogEvent = {
    message: string;
    context?: object;
    readonly userInfo?: object;
    readonly attributes?: object;
};

export type LogEventMapper = (logEvent: LogEvent) => LogEvent;
