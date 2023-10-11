/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import type {
    DdNativeLogsType,
    DdNativeRumType
} from '../../../nativeModulesTypes';
import { DdRumErrorTracking } from '../../../rum/instrumentation/DdRumErrorTracking';
import { BufferSingleton } from '../../../sdk/DatadogProvider/Buffer/BufferSingleton';

jest.mock('../../../utils/jsUtils');

const DdRum = NativeModules.DdRum as DdNativeRumType;
const DdLogs = NativeModules.DdLogs as DdNativeLogsType;

let baseErrorHandlerCalled = false;
const baseErrorHandler = (error: any, isFatal?: boolean) => {
    baseErrorHandlerCalled = true;
};
let originalErrorHandler;

let baseConsoleErrorCalled = false;
const baseConsoleError = (...params: unknown) => {
    baseConsoleErrorCalled = true;
};
let originalConsoleError;

const flushPromises = () =>
    new Promise(jest.requireActual('timers').setImmediate);

beforeEach(() => {
    jest.clearAllMocks();
    BufferSingleton.onInitialization();
    baseErrorHandlerCalled = false;
    originalErrorHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler(baseErrorHandler);
    originalConsoleError = console.error;
    console.error = baseConsoleError;
    jest.setTimeout(20000);
});

afterEach(() => {
    DdRumErrorTracking['isTracking'] = false;
    ErrorUtils.setGlobalHandler(originalErrorHandler);
    console.error = originalConsoleError;
});

it('M intercept and send a RUM event W onGlobalError() {no message}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking();
    const is_fatal = Math.random() < 0.5;
    const error = {
        stack: ['doSomething() at ./path/to/file.js:67:3']
    };

    // WHEN
    DdRumErrorTracking.onGlobalError(error, is_fatal);
    await flushPromises();

    // THEN
    expect(DdRum.addError).toHaveBeenCalledTimes(1);
    expect(DdRum.addError).toHaveBeenCalledWith(
        '[object Object]',
        'SOURCE',
        'doSomething() at ./path/to/file.js:67:3',
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number)
    );
    expect(baseErrorHandlerCalled).toStrictEqual(true);
    expect(DdLogs.errorWithError).toHaveBeenCalledTimes(1);
    expect(DdLogs.errorWithError).toHaveBeenCalledWith(
        '[object Object]',
        'Error',
        '[object Object]',
        'doSomething() at ./path/to/file.js:67:3',
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native',
            '_dd.error_log.is_crash': true
        }
    );
});

it('M intercept and send a RUM event W onGlobalError() {empty stack trace}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking();
    const is_fatal = Math.random() < 0.5;
    const error = {
        message: 'Something bad happened'
    };

    // WHEN
    DdRumErrorTracking.onGlobalError(error, is_fatal);
    await flushPromises();

    // THEN
    expect(DdRum.addError).toHaveBeenCalledTimes(1);
    expect(DdRum.addError).toHaveBeenCalledWith(
        'Something bad happened',
        'SOURCE',
        '',
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number)
    );
    expect(baseErrorHandlerCalled).toStrictEqual(true);
    expect(DdLogs.errorWithError).toHaveBeenCalledTimes(1);
    expect(DdLogs.errorWithError).toHaveBeenCalledWith(
        'Something bad happened',
        'Error',
        'Something bad happened',
        '',
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native',
            '_dd.error_log.is_crash': true
        }
    );
});

it('M intercept and send a RUM event W onGlobalError() {Error object}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking();
    const is_fatal = Math.random() < 0.5;
    const error = new Error('Something bad happened');

    // WHEN
    DdRumErrorTracking.onGlobalError(error, is_fatal);
    await flushPromises();

    // THEN
    expect(DdRum.addError).toHaveBeenCalledTimes(1);
    expect(DdRum.addError).toHaveBeenCalledWith(
        'Something bad happened',
        'SOURCE',
        expect.stringContaining('Error: Something bad happened'),
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number)
    );
    expect(DdRum.addError.mock.calls[0][2]).toContain(
        '/packages/core/src/__tests__/rum/instrumentation/DdRumErrorTracking.test.tsx'
    );
    expect(baseErrorHandlerCalled).toStrictEqual(true);
    expect(DdLogs.errorWithError).toHaveBeenCalledTimes(1);
    expect(DdLogs.errorWithError).toHaveBeenCalledWith(
        'Something bad happened',
        'Error',
        'Something bad happened',
        expect.stringContaining('Error: Something bad happened'),
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native',
            '_dd.error_log.is_crash': true
        }
    );
});

it('M intercept and send a RUM event W onGlobalError() {CustomError object}', async () => {
    // GIVEN
    class CustomError extends Error {
        name = 'CustomError';
    }

    DdRumErrorTracking.startTracking();
    const is_fatal = Math.random() < 0.5;
    const error = new CustomError('Something bad happened');

    // WHEN
    DdRumErrorTracking.onGlobalError(error, is_fatal);
    await flushPromises();

    // THEN
    expect(DdRum.addError).toHaveBeenCalledTimes(1);
    expect(DdRum.addError).toHaveBeenCalledWith(
        'Something bad happened',
        'SOURCE',
        expect.stringContaining('Error: Something bad happened'),
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number)
    );
    expect(DdRum.addError.mock.calls[0][2]).toContain(
        '/packages/core/src/__tests__/rum/instrumentation/DdRumErrorTracking.test.tsx'
    );
    expect(baseErrorHandlerCalled).toStrictEqual(true);
    expect(DdLogs.errorWithError).toHaveBeenCalledTimes(1);
    expect(DdLogs.errorWithError).toHaveBeenCalledWith(
        'Something bad happened',
        'CustomError',
        'Something bad happened',
        expect.stringContaining('Error: Something bad happened'),
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native',
            '_dd.error_log.is_crash': true
        }
    );
});

it('M intercept and send a RUM event W onGlobalError() {with source file info}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking();
    const is_fatal = Math.random() < 0.5;
    const error = {
        sourceURL: './path/to/file.js',
        line: 1038,
        column: 57,
        message: 'Something bad happened'
    };

    // WHEN
    DdRumErrorTracking.onGlobalError(error, is_fatal);
    await flushPromises();

    // THEN
    expect(DdRum.addError).toHaveBeenCalledTimes(1);
    expect(DdRum.addError).toHaveBeenCalledWith(
        'Something bad happened',
        'SOURCE',
        'at ./path/to/file.js:1038:57',
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number)
    );
    expect(baseErrorHandlerCalled).toStrictEqual(true);
    expect(DdLogs.errorWithError).toHaveBeenCalledTimes(1);
    expect(DdLogs.errorWithError).toHaveBeenCalledWith(
        'Something bad happened',
        'Error',
        'Something bad happened',
        'at ./path/to/file.js:1038:57',
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native',
            '_dd.error_log.is_crash': true
        }
    );
});

it('M intercept and send a RUM event W onGlobalError() {with component stack}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking();
    const is_fatal = Math.random() < 0.5;
    const error = {
        componentStack: [
            'doSomething() at ./path/to/file.js:67:3',
            'nestedCall() at ./path/to/file.js:1064:9',
            'root() at ./path/to/index.js:10:1'
        ],
        message: 'Something bad happened'
    };

    // WHEN
    DdRumErrorTracking.onGlobalError(error, is_fatal);
    await flushPromises();

    // THEN
    expect(DdRum.addError).toHaveBeenCalledTimes(1);
    expect(DdRum.addError).toHaveBeenCalledWith(
        'Something bad happened',
        'SOURCE',
        'doSomething() at ./path/to/file.js:67:3,nestedCall() at ./path/to/file.js:1064:9,root() at ./path/to/index.js:10:1',
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number)
    );
    expect(baseErrorHandlerCalled).toStrictEqual(true);
    expect(DdLogs.errorWithError).toHaveBeenCalledTimes(1);
    expect(DdLogs.errorWithError).toHaveBeenCalledWith(
        'Something bad happened',
        'Error',
        'Something bad happened',
        'doSomething() at ./path/to/file.js:67:3,nestedCall() at ./path/to/file.js:1064:9,root() at ./path/to/index.js:10:1',
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native',
            '_dd.error_log.is_crash': true
        }
    );
});

it('M intercept and send a RUM event W onGlobalError() {with stack}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking();
    const is_fatal = Math.random() < 0.5;
    const error = {
        stack: [
            'doSomething() at ./path/to/file.js:67:3',
            'nestedCall() at ./path/to/file.js:1064:9',
            'root() at ./path/to/index.js:10:1'
        ],
        message: 'Something bad happened'
    };

    // WHEN
    DdRumErrorTracking.onGlobalError(error, is_fatal);
    await flushPromises();

    // THEN
    expect(DdRum.addError).toHaveBeenCalledTimes(1);
    expect(DdRum.addError).toHaveBeenCalledWith(
        'Something bad happened',
        'SOURCE',
        'doSomething() at ./path/to/file.js:67:3,nestedCall() at ./path/to/file.js:1064:9,root() at ./path/to/index.js:10:1',
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number)
    );
    expect(baseErrorHandlerCalled).toStrictEqual(true);
    expect(DdLogs.errorWithError).toHaveBeenCalledTimes(1);
    expect(DdLogs.errorWithError).toHaveBeenCalledWith(
        'Something bad happened',
        'Error',
        'Something bad happened',
        'doSomething() at ./path/to/file.js:67:3,nestedCall() at ./path/to/file.js:1064:9,root() at ./path/to/index.js:10:1',
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native',
            '_dd.error_log.is_crash': true
        }
    );
});

it('M intercept and send a RUM event W onGlobalError() {with stacktrace}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking();
    const is_fatal = Math.random() < 0.5;
    const error = {
        stacktrace: [
            'doSomething() at ./path/to/file.js:67:3',
            'nestedCall() at ./path/to/file.js:1064:9',
            'root() at ./path/to/index.js:10:1'
        ],
        message: 'Something bad happened'
    };

    // WHEN
    DdRumErrorTracking.onGlobalError(error, is_fatal);
    await flushPromises();

    // THEN
    expect(DdRum.addError).toHaveBeenCalledTimes(1);
    expect(DdRum.addError).toHaveBeenCalledWith(
        'Something bad happened',
        'SOURCE',
        'doSomething() at ./path/to/file.js:67:3,nestedCall() at ./path/to/file.js:1064:9,root() at ./path/to/index.js:10:1',
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number)
    );
    expect(baseErrorHandlerCalled).toStrictEqual(true);
    expect(baseErrorHandlerCalled).toStrictEqual(true);
    expect(DdLogs.errorWithError).toHaveBeenCalledTimes(1);
    expect(DdLogs.errorWithError).toHaveBeenCalledWith(
        'Something bad happened',
        'Error',
        'Something bad happened',
        'doSomething() at ./path/to/file.js:67:3,nestedCall() at ./path/to/file.js:1064:9,root() at ./path/to/index.js:10:1',
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native',
            '_dd.error_log.is_crash': true
        }
    );
});

it('M not report error in console handler W onGlobalError() {with console reporting handler}', async () => {
    // GIVEN
    const consoleReportingErrorHandler = jest.fn((error, isFatal) => {
        console.error(error.message);
        baseErrorHandler(error, isFatal);
    });
    ErrorUtils.setGlobalHandler(consoleReportingErrorHandler);
    DdRumErrorTracking.startTracking();
    const is_fatal = Math.random() < 0.5;
    const error = {
        componentStack: [
            'doSomething() at ./path/to/file.js:67:3',
            'nestedCall() at ./path/to/file.js:1064:9',
            'root() at ./path/to/index.js:10:1'
        ],
        message: 'Something bad happened'
    };

    // WHEN
    DdRumErrorTracking.onGlobalError(error, is_fatal);
    await flushPromises();

    // THEN
    expect(DdRum.addError).toHaveBeenCalledTimes(1);
    expect(DdRum.addError).toHaveBeenCalledWith(
        'Something bad happened',
        'SOURCE',
        'doSomething() at ./path/to/file.js:67:3,nestedCall() at ./path/to/file.js:1064:9,root() at ./path/to/index.js:10:1',
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number)
    );
    expect(consoleReportingErrorHandler).toBeCalledTimes(1);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
    expect(baseErrorHandlerCalled).toStrictEqual(true);
    expect(DdLogs.errorWithError).toHaveBeenCalledTimes(1);
    expect(DdLogs.errorWithError).toHaveBeenCalledWith(
        'Something bad happened',
        'Error',
        'Something bad happened',
        'doSomething() at ./path/to/file.js:67:3,nestedCall() at ./path/to/file.js:1064:9,root() at ./path/to/index.js:10:1',
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native',
            '_dd.error_log.is_crash': true
        }
    );
});

it('M intercept and send a RUM event W onConsole() {Error with source file info}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking();
    const message = 'Oops I did it again!';
    const error = {
        sourceURL: './path/to/file.js',
        line: 1038,
        column: 57,
        message: 'Something bad happened'
    };

    // WHEN
    DdRumErrorTracking.onConsoleError(message, error);
    await flushPromises();

    // THEN
    expect(DdRum.addError).toHaveBeenCalledTimes(1);
    expect(DdRum.addError).toHaveBeenCalledWith(
        'Oops I did it again! Something bad happened',
        'CONSOLE',
        'at ./path/to/file.js:1038:57',
        {
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number)
    );
    expect(baseConsoleErrorCalled).toStrictEqual(true);
    expect(DdLogs.errorWithError).toHaveBeenCalledTimes(1);
    expect(DdLogs.errorWithError).toHaveBeenCalledWith(
        'Oops I did it again! Something bad happened',
        'Error',
        'Oops I did it again! Something bad happened',
        'at ./path/to/file.js:1038:57',
        {
            '_dd.error.source_type': 'react-native',
            '_dd.error_log.is_crash': true
        }
    );
});

it('M intercept and send a RUM event W onConsole() {Error with component stack}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking();
    const message = 'Oops I did it again!';
    const error = {
        componentStack: [
            'doSomething() at ./path/to/file.js:67:3',
            'nestedCall() at ./path/to/file.js:1064:9',
            'root() at ./path/to/index.js:10:1'
        ],
        message: 'Something bad happened'
    };

    // WHEN
    DdRumErrorTracking.onConsoleError(message, error);
    await flushPromises();

    // THEN
    expect(DdRum.addError).toHaveBeenCalledTimes(1);
    expect(DdRum.addError).toHaveBeenCalledWith(
        'Oops I did it again! Something bad happened',
        'CONSOLE',
        'doSomething() at ./path/to/file.js:67:3,nestedCall() at ./path/to/file.js:1064:9,root() at ./path/to/index.js:10:1',
        {
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number)
    );
    expect(baseConsoleErrorCalled).toStrictEqual(true);
    expect(DdLogs.errorWithError).toHaveBeenCalledTimes(1);
    expect(DdLogs.errorWithError).toHaveBeenCalledWith(
        'Oops I did it again! Something bad happened',
        'Error',
        'Oops I did it again! Something bad happened',
        'doSomething() at ./path/to/file.js:67:3,nestedCall() at ./path/to/file.js:1064:9,root() at ./path/to/index.js:10:1',
        {
            '_dd.error.source_type': 'react-native',
            '_dd.error_log.is_crash': true
        }
    );
});

it('M intercept and send a RUM event W onConsole() {message only}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking();
    const message = 'Something bad happened';

    // WHEN
    DdRumErrorTracking.onConsoleError(message);
    await flushPromises();

    // THEN
    expect(DdRum.addError).toHaveBeenCalledTimes(1);
    expect(DdRum.addError).toHaveBeenCalledWith(
        message,
        'CONSOLE',
        '',
        {
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number)
    );
    expect(baseConsoleErrorCalled).toStrictEqual(true);
    expect(DdLogs.errorWithError).toHaveBeenCalledTimes(1);
    expect(DdLogs.errorWithError).toHaveBeenCalledWith(
        'Something bad happened',
        'Error',
        'Something bad happened',
        '',
        {
            '_dd.error.source_type': 'react-native',
            '_dd.error_log.is_crash': true
        }
    );
});

it('M intercept and send a RUM event W onConsole() {Error with source file and name}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking();
    const message = 'Oops I did it again!';
    const error = {
        sourceURL: './path/to/file.js',
        line: 1038,
        column: 57,
        message: 'Something bad happened',
        name: 'CustomConsoleError'
    };

    // WHEN
    DdRumErrorTracking.onConsoleError(message, error);
    await flushPromises();

    // THEN
    expect(DdRum.addError).toHaveBeenCalledTimes(1);
    expect(DdRum.addError).toHaveBeenCalledWith(
        'Oops I did it again! Something bad happened',
        'CONSOLE',
        'at ./path/to/file.js:1038:57',
        {
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number)
    );
    expect(baseConsoleErrorCalled).toStrictEqual(true);
    expect(DdLogs.errorWithError).toHaveBeenCalledTimes(1);
    expect(DdLogs.errorWithError).toHaveBeenCalledWith(
        'Oops I did it again! Something bad happened',
        'CustomConsoleError',
        'Oops I did it again! Something bad happened',
        'at ./path/to/file.js:1038:57',
        {
            '_dd.error.source_type': 'react-native',
            '_dd.error_log.is_crash': true
        }
    );
});

describe.each([
    [undefined],
    [null],
    [true],
    [1],
    ['message'],
    [() => {}],
    [{}],
    [['a']]
])('console calls with different message types', message => {
    it(`M intercept and send a RUM event W onConsole() { message has ${typeof message} type }`, async () => {
        // GIVEN
        DdRumErrorTracking.startTracking();

        // WHEN
        DdRumErrorTracking.onConsoleError(message);
        await flushPromises();

        // THEN
        const errorMessage =
            message === undefined || message === null
                ? 'Unknown Error'
                : String(message);
        expect(DdRum.addError).toHaveBeenCalledTimes(1);
        expect(DdRum.addError).toHaveBeenCalledWith(
            errorMessage,
            'CONSOLE',
            '',
            {
                '_dd.error.source_type': 'react-native'
            },
            expect.any(Number)
        );
        expect(baseConsoleErrorCalled).toStrictEqual(true);
        expect(DdLogs.errorWithError).toHaveBeenCalledTimes(1);
        expect(DdLogs.errorWithError).toHaveBeenCalledWith(
            errorMessage,
            'Error',
            errorMessage,
            '',
            {
                '_dd.error.source_type': 'react-native',
                '_dd.error_log.is_crash': true
            }
        );
    });
});

it('M intercept and send a RUM event W on error() {called from RNErrorHandler}', async () => {
    // GIVEN
    const errorHandlerMock = new RNErrorHandlerMock();
    DdRumErrorTracking.startTracking();
    const is_fatal = Math.random() < 0.5;
    const error = new Error('Something bad happened');

    // WHEN
    errorHandlerMock.onError(error, is_fatal);
    await flushPromises();

    // THEN
    expect(DdRum.addError).toHaveBeenCalledTimes(1);
    expect(DdRum.addError).toHaveBeenCalledWith(
        'Something bad happened',
        'SOURCE',
        expect.stringContaining('Error: Something bad happened'),
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number)
    );
    expect(DdRum.addError.mock.calls[0][2]).toContain(
        '/packages/core/src/__tests__/rum/instrumentation/DdRumErrorTracking.test.tsx'
    );
    expect(baseErrorHandlerCalled).toStrictEqual(true);
    expect(DdLogs.errorWithError).toHaveBeenCalledTimes(1);
    expect(DdLogs.errorWithError).toHaveBeenCalledWith(
        'Something bad happened',
        'Error',
        'Something bad happened',
        expect.stringContaining('Error: Something bad happened'),
        {
            '_dd.error.raw': error,
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native',
            '_dd.error_log.is_crash': true
        }
    );
});

it('M intercept and send a RUM event W onConsole() {called from RNErrorHandler}', async () => {
    // GIVEN
    const errorHandlerMock = new RNErrorHandlerMock();
    DdRumErrorTracking.startTracking();
    const message = 'Oops I did it again!';

    // WHEN
    errorHandlerMock.onConsoleError(message);
    await flushPromises();

    // THEN
    expect(DdRum.addError).toHaveBeenCalledTimes(1);
    expect(DdRum.addError).toHaveBeenCalledWith(
        'Oops I did it again!',
        'CONSOLE',
        '',
        {
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number)
    );
    expect(baseConsoleErrorCalled).toStrictEqual(true);
    expect(DdLogs.errorWithError).toHaveBeenCalledTimes(1);
    expect(DdLogs.errorWithError).toHaveBeenCalledWith(
        'Oops I did it again!',
        'Error',
        'Oops I did it again!',
        '',
        {
            '_dd.error.source_type': 'react-native',
            '_dd.error_log.is_crash': true
        }
    );
});

/**
 * This is a mock of the RN error handler class that will call the ErrorUtils.
 * Testing with this catches bugs around `this` references.
 */
class RNErrorHandlerMock {
    onError = (error: any, isFatal: boolean) => {
        const errorHandler = ErrorUtils.getGlobalHandler();
        errorHandler(error, isFatal);
    };

    onConsoleError = (...params: any) => {
        console.error(...params);
    };
}
