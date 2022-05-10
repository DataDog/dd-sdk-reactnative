/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ErrorHandlerCallback } from 'react-native';
import { DdRum } from '../../foundation';
import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../SdkVerbosity';

const EMPTY_MESSAGE = 'Unknown Error';
const EMPTY_STACK_TRACE = '';
const TYPE_SOURCE = 'SOURCE';
const TYPE_CONSOLE = 'CONSOLE';

/**
 * Provides RUM auto-instrumentation feature to track errors as RUM events.
 */
export class DdRumErrorTracking {
    private static isTracking = false;

    private static isInDefaultErrorHandler = false;

    // eslint-disable-next-line
    private static defaultErrorHandler: ErrorHandlerCallback = (_error: any, _isFatal?: boolean) => { }

    // eslint-disable-next-line
    private static defaultConsoleError = (..._params: unknown[]) => { }

    /**
     * Starts tracking errors and sends a RUM Error event every time an error is detected.
     */
    static startTracking(): void {
        // extra safety to avoid wrapping the Error handler twice
        if (DdRumErrorTracking.isTracking) {
            InternalLog.log(
                'Datadog SDK is already tracking errors',
                SdkVerbosity.WARN
            );
            return;
        }

        if (ErrorUtils) {
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

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    static onGlobalError(error: any, isFatal?: boolean): void {
        const message = DdRumErrorTracking.getErrorMessage(error);
        const stacktrace = DdRumErrorTracking.getErrorStackTrace(error);
        DdRum.addError(message, TYPE_SOURCE, stacktrace, {
            '_dd.error.is_crash': isFatal,
            '_dd.error.raw': error
        }).then(() => {
            DdRumErrorTracking.isInDefaultErrorHandler = true;
            try {
                DdRumErrorTracking.defaultErrorHandler(error, isFatal);
            } finally {
                DdRumErrorTracking.isInDefaultErrorHandler = false;
            }
        });
    }

    static onConsoleError(...params: unknown[]): void {
        if (DdRumErrorTracking.isInDefaultErrorHandler) {
            return;
        }

        let stack: string = EMPTY_STACK_TRACE;
        for (let i = 0; i < params.length; i += 1) {
            const param = params[i];
            const paramStack = DdRumErrorTracking.getErrorStackTrace(param);
            if (paramStack != undefined && paramStack != EMPTY_STACK_TRACE) {
                stack = paramStack;
                break;
            }
        }

        const message = params
            .map(param => {
                if (typeof param === 'string') {
                    return param;
                } else {
                    return DdRumErrorTracking.getErrorMessage(param);
                }
            })
            .join(' ');

        DdRum.addError(message, TYPE_CONSOLE, stack).then(() => {
            DdRumErrorTracking.defaultConsoleError.apply(console, params);
        });
    }

    private static getErrorMessage(error: any | undefined): string {
        let message = EMPTY_MESSAGE;
        if (error == undefined) {
            message = EMPTY_MESSAGE;
        } else if (typeof error == 'object' && 'message' in error) {
            message = String(error.message);
        } else {
            message = String(error);
        }

        return message;
    }

    private static getErrorStackTrace(error: any | undefined): string {
        let stack = EMPTY_STACK_TRACE;

        if (error == undefined) {
            stack = EMPTY_STACK_TRACE;
        } else if (typeof error === 'string') {
            stack = EMPTY_STACK_TRACE;
        } else if (typeof error === 'object') {
            if ('componentStack' in error) {
                stack = String(error.componentStack);
            } else if ('stacktrace' in error) {
                stack = String(error.stacktrace);
            } else if ('stack' in error) {
                stack = String(error.stack);
            } else if (
                'sourceURL' in error &&
                'line' in error &&
                'column' in error
            ) {
                stack = `at ${error.sourceURL}:${error.line}:${error.column}`;
            }
        }

        return stack;
    }
}
