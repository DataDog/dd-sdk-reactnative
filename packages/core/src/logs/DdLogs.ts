/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdAttributes } from '../DdAttributes';
import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../config/types/SdkVerbosity';
import { debugId } from '../metro/debugIdResolver';
import type { DdNativeLogsType } from '../nativeModulesTypes';
import { encodeAttributes } from '../sdk/AttributesEncoding/attributesEncoding';
import { bufferVoidNativeCall } from '../sdk/DatadogProvider/Buffer/bufferNativeCall';
import type { ErrorSource, LogEventMapper } from '../types';
import { getGlobalInstance } from '../utils/singletonUtils';

import { getNativeDdLogs } from '../specs/NativeDdLogs';

import { generateEventMapper } from './eventMapper';
import type {
    DdLogsType,
    LogArguments,
    LogWithErrorArguments,
    NativeLogWithError,
    RawLogWithError
} from './types';

const LOGS_MODULE = 'com.datadog.reactnative.logs';

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
        (args[4] !== undefined && args[4] !== null) ||
        typeof args[5] === 'string'
    );
};

class DdLogsWrapper implements DdLogsType {
    private nativeLogs: DdNativeLogsType = getNativeDdLogs() as DdNativeLogsType;
    private logEventMapper = generateEventMapper(undefined);

    debug = (...args: LogArguments | LogWithErrorArguments): Promise<void> => {
        if (isLogWithError(args)) {
            return this.logWithError(
                args[0],
                args[1],
                args[2],
                args[3],
                args[4] ?? {},
                'debug',
                args[5]
            );
        }
        return this.log(args[0], args[1] ?? {}, 'debug');
    };

    info = (...args: LogArguments | LogWithErrorArguments): Promise<void> => {
        if (isLogWithError(args)) {
            return this.logWithError(
                args[0],
                args[1],
                args[2],
                args[3],
                args[4] ?? {},
                'info',
                args[5]
            );
        }
        return this.log(args[0], args[1] ?? {}, 'info');
    };

    warn = (...args: LogArguments | LogWithErrorArguments): Promise<void> => {
        if (isLogWithError(args)) {
            return this.logWithError(
                args[0],
                args[1],
                args[2],
                args[3],
                args[4] ?? {},
                'warn',
                args[5]
            );
        }
        return this.log(args[0], args[1] ?? {}, 'warn');
    };

    error = (...args: LogArguments | LogWithErrorArguments): Promise<void> => {
        if (isLogWithError(args)) {
            return this.logWithError(
                args[0],
                args[1],
                args[2],
                args[3],
                args[4] ?? {},
                'error',
                args[5],
                args[6]
            );
        }
        return this.log(args[0], args[1] ?? {}, 'error');
    };

    private printLogDroppedByMapper = (
        message: string,
        status: 'debug' | 'info' | 'warn' | 'error'
    ) => {
        InternalLog.log(
            `${status} log dropped by log mapper: "${message}"`,
            SdkVerbosity.DEBUG
        );
    };

    private printLogTracked = (
        message: string,
        status: 'debug' | 'info' | 'warn' | 'error'
    ) => {
        InternalLog.log(
            `Tracking ${status} log "${message}"`,
            SdkVerbosity.DEBUG
        );
    };

    private log = async (
        message: string,
        context: object,
        status: 'debug' | 'info' | 'warn' | 'error'
    ): Promise<void> => {
        const event = this.logEventMapper.applyEventMapper({
            message,
            context,
            status
        });
        if (!event) {
            this.printLogDroppedByMapper(message, status);
            return generateEmptyPromise();
        }

        this.printLogTracked(event.message, status);
        return bufferVoidNativeCall(() =>
            this.nativeLogs[status](
                event.message,
                encodeAttributes(event.context)
            )
        );
    };

    private logWithError = async (
        message: string,
        errorKind: string | undefined,
        errorMessage: string | undefined,
        stacktrace: string | undefined,
        context: object,
        status: 'debug' | 'info' | 'warn' | 'error',
        fingerprint: string = '',
        source?: ErrorSource
    ): Promise<void> => {
        const rawLogEvent: RawLogWithError = {
            message,
            errorKind,
            errorMessage,
            stacktrace,
            context,
            status,
            fingerprint,
            source
        };

        const mappedEvent = this.logEventMapper.applyEventMapper(rawLogEvent);

        if (!mappedEvent) {
            this.printLogDroppedByMapper(message, status);
            return generateEmptyPromise();
        }

        this.printLogTracked(mappedEvent.message, status);
        const encodedContext = encodeAttributes(mappedEvent.context);
        const updatedContext = {
            ...encodedContext,
            [DdAttributes.errorSourceType]: 'react-native'
        };

        if (fingerprint && fingerprint !== '') {
            updatedContext[DdAttributes.errorFingerprint] = fingerprint;
        }

        const _debugId = debugId;
        if (_debugId) {
            updatedContext[DdAttributes.debugId] = _debugId;
        }

        return bufferVoidNativeCall(() =>
            this.nativeLogs[`${status}WithError`](
                mappedEvent.message,
                (mappedEvent as NativeLogWithError).errorKind,
                (mappedEvent as NativeLogWithError).errorMessage,
                (mappedEvent as NativeLogWithError).stacktrace,
                updatedContext
            )
        );
    };

    registerLogEventMapper(logEventMapper: LogEventMapper) {
        this.logEventMapper = generateEventMapper(logEventMapper);
    }

    unregisterLogEventMapper() {
        this.logEventMapper = generateEventMapper(undefined);
    }
}

export const DdLogs = getGlobalInstance(LOGS_MODULE, () => new DdLogsWrapper());
