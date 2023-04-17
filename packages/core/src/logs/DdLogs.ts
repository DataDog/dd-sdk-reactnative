/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../SdkVerbosity';
import type { DdNativeLogsType } from '../nativeModulesTypes';

import { generateEventMapper } from './eventMapper';
import type {
    DdLogsType,
    LogArguments,
    LogEventMapper,
    LogWithErrorArguments,
    NativeLogWithError
} from './types';

const generateEmptyPromise = () => new Promise<void>(resolve => resolve());

/**
 * We consider that if either one of `errorKind`, `errorMessage` or `stacktrace` is a string,
 * then the log contains an error.
 */
const isLogWithError = (
    args: LogArguments | LogWithErrorArguments
): args is LogWithErrorArguments => {
    return (
        typeof args[1] === 'string' ||
        typeof args[2] === 'string' ||
        typeof args[3] === 'string' ||
        typeof args[4] === 'object'
    );
};

class DdLogsWrapper implements DdLogsType {
    private nativeLogs: DdNativeLogsType = NativeModules.DdLogs;
    private logEventMapper = generateEventMapper(undefined);

    debug(...args: LogArguments | LogWithErrorArguments): Promise<void> {
        if (isLogWithError(args)) {
            return this.logWithError(
                args[0],
                args[1],
                args[2],
                args[3],
                args[4] || {},
                'debug'
            );
        }
        return this.log(args[0], args[1] || {}, 'debug');
    }

    info(...args: LogArguments | LogWithErrorArguments): Promise<void> {
        if (isLogWithError(args)) {
            return this.logWithError(
                args[0],
                args[1],
                args[2],
                args[3],
                args[4] || {},
                'info'
            );
        }
        return this.log(args[0], args[1] || {}, 'info');
    }

    warn(...args: LogArguments | LogWithErrorArguments): Promise<void> {
        if (isLogWithError(args)) {
            return this.logWithError(
                args[0],
                args[1],
                args[2],
                args[3],
                args[4] || {},
                'warn'
            );
        }
        return this.log(args[0], args[1] || {}, 'warn');
    }

    error(...args: LogArguments | LogWithErrorArguments): Promise<void> {
        if (isLogWithError(args)) {
            return this.logWithError(
                args[0],
                args[1],
                args[2],
                args[3],
                args[4] || {},
                'error'
            );
        }
        return this.log(args[0], args[1] || {}, 'error');
    }

    private log = (
        message: string,
        context: object,
        status: 'debug' | 'info' | 'warn' | 'error'
    ): Promise<void> => {
        InternalLog.log(
            `Tracking ${status} log “${message}”`,
            SdkVerbosity.DEBUG
        );
        const event = this.logEventMapper.applyEventMapper({
            message,
            context,
            status
        });
        if (!event) {
            return generateEmptyPromise();
        }
        return this.nativeLogs[status](event.message, event.context);
    };

    private logWithError = (
        message: string,
        errorKind: string | undefined,
        errorMessage: string | undefined,
        stacktrace: string | undefined,
        context: object,
        status: 'debug' | 'info' | 'warn' | 'error'
    ): Promise<void> => {
        InternalLog.log(
            `Tracking ${status} log “${message}”`,
            SdkVerbosity.DEBUG
        );
        const event = this.logEventMapper.applyEventMapper({
            message,
            errorKind,
            errorMessage,
            stacktrace,
            context,
            status
        });
        if (!event) {
            return generateEmptyPromise();
        }
        return this.nativeLogs[`${status}WithError`](
            event.message,
            (event as NativeLogWithError).errorKind,
            (event as NativeLogWithError).errorMessage,
            (event as NativeLogWithError).stacktrace,
            event.context
        );
    };

    registerLogEventMapper(logEventMapper: LogEventMapper) {
        this.logEventMapper = generateEventMapper(logEventMapper);
    }

    unregisterLogEventMapper() {
        this.logEventMapper = generateEventMapper(undefined);
    }
}

export const DdLogs = new DdLogsWrapper();
