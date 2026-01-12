/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
export const ERROR_EMPTY_STACKTRACE = '';
export const ERROR_EMPTY_MESSAGE = 'Unknown Error';
export const ERROR_DEFAULT_NAME = 'Error';

/**
 * Will extract the stack from the error, taking the first key found among:
 * `stacktrace`, `stack`, `componentStack` (component tree for component errors,
 * which contains only native components names in production).
 *
 * In last resort and if `sourceURL`, `line` and `column` are present, it will
 * generate a stack from this information.
 */
export const getErrorStackTrace = (error: any | undefined): string => {
    let stack = ERROR_EMPTY_STACKTRACE;

    try {
        if (error === undefined || error === null) {
            stack = ERROR_EMPTY_STACKTRACE;
        } else if (typeof error === 'string') {
            stack = ERROR_EMPTY_STACKTRACE;
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

export const getErrorMessage = (error: any | undefined): string => {
    if (error == null) {
        return ERROR_EMPTY_MESSAGE;
    }

    // If it's an actual Error (or subclass)
    if (error instanceof Error) {
        // Prefer .message if defined, otherwise fallback to .toString()
        return error.message || error.toString() || ERROR_EMPTY_MESSAGE;
    }

    // If it's an object with a message property (not necessarily Error)
    if (
        typeof error === 'object' &&
        'message' in error &&
        typeof (error as any).message === 'string'
    ) {
        return (error as any).message || ERROR_EMPTY_MESSAGE;
    }

    // If it’s a primitive (string, number, boolean, symbol)
    if (
        typeof error === 'string' ||
        typeof error === 'number' ||
        typeof error === 'boolean' ||
        typeof error === 'symbol'
    ) {
        return String(error);
    }

    // If it has its own toString (not the default Object one)
    if (
        typeof error?.toString === 'function' &&
        error.toString !== Object.prototype.toString
    ) {
        return error.toString();
    }

    // Fallback
    return ERROR_EMPTY_MESSAGE;
};

export const getErrorName = (error: unknown): string => {
    try {
        if (typeof error !== 'object' || error === null) {
            return ERROR_DEFAULT_NAME;
        }
        if (typeof (error as any).name === 'string') {
            return (error as any).name;
        }
    } catch (e) {
        // Do nothing
    }
    return ERROR_DEFAULT_NAME;
};
