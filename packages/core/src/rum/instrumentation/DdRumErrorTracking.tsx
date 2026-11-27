/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ErrorHandlerCallback } from 'react-native';

import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../config/types/SdkVerbosity';
import { errorEncoder } from '../../sdk/AttributesEncoding/defaultEncoders';
import {
    ERROR_DEFAULT_NAME,
    ERROR_EMPTY_STACKTRACE,
    getErrorMessage,
    getErrorName,
    getErrorStackTrace
} from '../../sdk/AttributesEncoding/errorUtils';
import { ErrorSource } from '../../types';
import { executeWithDelay } from '../../utils/jsUtils';
import { DdRum } from '../DdRum';

type RumErrorReporter = Pick<typeof DdRum, 'addError'>;

/**
 * Provides RUM auto-instrumentation feature to track errors as RUM events.
 */
export class DdRumErrorTracking {
    private static isTracking = false;

    private static reporter?: RumErrorReporter;

    private static isInDefaultErrorHandler = false;

    // eslint-disable-next-line
    private static defaultErrorHandler: ErrorHandlerCallback = (_error: any, _isFatal?: boolean) => { }

    // eslint-disable-next-line
    private static defaultConsoleError = (..._params: unknown[]) => { }

    /**
     * Starts tracking errors and sends a RUM Error event every time an error is detected.
     */
    static startTracking(reporter: RumErrorReporter = DdRum): void {
        DdRumErrorTracking.reporter = reporter;
        // extra safety to avoid wrapping the Error handler twice
        if (DdRumErrorTracking.isTracking) {
            InternalLog.log(
                'Datadog SDK is already tracking errors',
                SdkVerbosity.WARN
            );
            return;
        }

        if (typeof ErrorUtils !== 'undefined') {
            DdRumErrorTracking.defaultErrorHandler = ErrorUtils.getGlobalHandler();
            DdRumErrorTracking.defaultConsoleError = console.error;

            ErrorUtils.setGlobalHandler(DdRumErrorTracking.onGlobalError);
            console.error = DdRumErrorTracking.onConsoleError;

            DdRumErrorTracking.isTracking = true;
            InternalLog.log(
                'Datadog SDK is tracking errors',
                SdkVerbosity.INFO
            );
        } else {
            InternalLog.log(
                'Datadog SDK cannot track errors, ErrorUtils is not defined',
                SdkVerbosity.ERROR
            );
        }
    }

    static onGlobalError = (error: any, isFatal?: boolean): void => {
        this.reportSafely(
            () =>
                this.reportError(
                    getErrorMessage(error),
                    ErrorSource.SOURCE,
                    getErrorStackTrace(error),
                    {
                        '_dd.error.is_crash': isFatal,
                        '_dd.error.raw': errorEncoder.encode(error)
                    }
                ),
            isFatal
        ).then(() =>
            // The native update must settle before this crash-context delay.
            executeWithDelay(() => {
                DdRumErrorTracking.isInDefaultErrorHandler = true;
                try {
                    DdRumErrorTracking.defaultErrorHandler(error, isFatal);
                } finally {
                    DdRumErrorTracking.isInDefaultErrorHandler = false;
                }
            }, 50)
        );
    };

    static onConsoleError = (...params: unknown[]): void => {
        if (DdRumErrorTracking.isInDefaultErrorHandler) {
            return;
        }
        this.reportSafely(() => this.reportConsoleError(...params)).then(() => {
            DdRumErrorTracking.defaultConsoleError.apply(console, params);
        });
    };

    private static reportConsoleError = (
        ...params: unknown[]
    ): Promise<void> => {
        let stack: string = ERROR_EMPTY_STACKTRACE;
        let errorName: string = ERROR_DEFAULT_NAME;
        for (let i = 0; i < params.length; i += 1) {
            const param = params[i];

            const paramStack = getErrorStackTrace(param);
            if (paramStack !== ERROR_EMPTY_STACKTRACE) {
                stack = paramStack;
            }

            const paramErrorName = getErrorName(param);
            if (paramErrorName !== ERROR_DEFAULT_NAME) {
                errorName = paramErrorName;
            }

            if (
                errorName !== ERROR_DEFAULT_NAME &&
                stack !== ERROR_EMPTY_STACKTRACE
            ) {
                break;
            }
        }

        const message = params
            .map(param => {
                if (typeof param === 'string') {
                    return param;
                } else {
                    return getErrorMessage(param);
                }
            })
            .join(' ');

        return this.reportError(message, ErrorSource.CONSOLE, stack);
    };

    /** Fatal errors wait for the native update; other reporting has a stall cap. */
    private static reportSafely = async (
        report: () => Promise<void>,
        waitForCompletion = false
    ): Promise<void> => {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
            const pending = Promise.resolve(report()).catch(() => undefined);
            if (waitForCompletion) {
                await pending;
                return;
            }
            await Promise.race([
                pending,
                new Promise<void>(resolve => {
                    timeout = setTimeout(resolve, 50);
                })
            ]);
        } catch {
            // A reporter can throw before returning a promise.
        } finally {
            clearTimeout(timeout);
        }
    };

    private static reportError = (
        message: string,
        source: ErrorSource,
        stacktrace: string,
        context: object = {}
    ): Promise<void> => {
        return (DdRumErrorTracking.reporter ?? DdRum).addError(
            message,
            source,
            stacktrace,
            context
        );
    };
}
