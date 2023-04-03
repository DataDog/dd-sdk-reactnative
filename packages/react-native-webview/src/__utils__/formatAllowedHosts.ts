/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { NativeModules } from 'react-native';

export function formatAllowedHosts(allowedHosts?: string[]): string {
    try {
        return `'${JSON.stringify(allowedHosts)}'`;
    } catch (e: any) {
        if (NativeModules.DdSdk && NativeModules.DdSdk.telemetryError) {
            NativeModules.DdSdk.telemetryError(
                getErrorMessage(e),
                getErrorStackTrace(e),
                'AllowedHostsError'
            );
        }
        return "'[]'";
    }
}

/**
 * The next section is copied from packages/core/src/errorUtils
 */

const EMPTY_MESSAGE = 'Unknown Error';
const EMPTY_STACK_TRACE = '';

const getErrorMessage = (error: any | undefined): string => {
    let message = EMPTY_MESSAGE;
    if (error === undefined || error === null) {
        message = EMPTY_MESSAGE;
    } else if (typeof error === 'object' && 'message' in error) {
        message = String(error.message);
    } else {
        message = String(error);
    }

    return message;
};

const getErrorStackTrace = (error: any | undefined): string => {
    let stack = EMPTY_STACK_TRACE;

    try {
        if (error === undefined || error === null) {
            stack = EMPTY_STACK_TRACE;
        } else if (typeof error === 'string') {
            stack = EMPTY_STACK_TRACE;
        } else if (typeof error === 'object') {
            if ('stacktrace' in error) {
                stack = String(error.stacktrace);
            } else if ('stack' in error) {
                stack = String(error.stack);
            } else if ('componentStack' in error) {
                stack = String(error.componentStack);
            } else if (
                'sourceURL' in error &&
                'line' in error &&
                'column' in error
            ) {
                stack = `at ${error.sourceURL}:${error.line}:${error.column}`;
            }
        }
    } catch (e) {
        // Do nothing
    }
    return stack;
};
