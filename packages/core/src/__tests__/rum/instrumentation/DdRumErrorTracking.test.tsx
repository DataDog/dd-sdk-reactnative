/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import type { DdNativeRumType } from '../../../nativeModulesTypes';
import { DdRumErrorTracking } from '../../../rum/instrumentation/DdRumErrorTracking';
import { BufferSingleton } from '../../../sdk/DatadogProvider/Buffer/BufferSingleton';
import * as jsUtils from '../../../utils/jsUtils';

jest.mock('../../../utils/jsUtils');

const DdRum = NativeModules.DdRum as DdNativeRumType;

let baseErrorHandlerCalled = false;
const baseErrorHandler = (error: any, isFatal?: boolean) => {
    baseErrorHandlerCalled = true;
};
let originalErrorHandler: any;

let baseConsoleErrorCalled = false;
const baseConsoleError = (...params: unknown[]) => {
    baseConsoleErrorCalled = true;
};
let originalConsoleError: any;

const flushPromises = () =>
    new Promise(jest.requireActual('timers').setImmediate);

beforeEach(() => {
    jest.clearAllMocks();
    BufferSingleton.onInitialization();
    baseErrorHandlerCalled = false;
    baseConsoleErrorCalled = false;
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
        'Unknown Error',
        'SOURCE',
        'doSomething() at ./path/to/file.js:67:3',
        {
            '_dd.error.raw': {
                name: 'Error',
                message: 'Unknown Error',
                cause: undefined,
                stack: 'doSomething() at ./path/to/file.js:67:3'
            },
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number),
        ''
    );
    expect(baseErrorHandlerCalled).toStrictEqual(true);
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
            '_dd.error.raw': {
                name: 'Error',
                message: 'Something bad happened',
                cause: undefined,
                stack: ''
            },
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number),
        ''
    );
    expect(baseErrorHandlerCalled).toStrictEqual(true);
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
            '_dd.error.raw': {
                name: error.name,
                message: error.message,
                stack: error.stack,
                cause: undefined
            },
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number),
        ''
    );
    expect((DdRum.addError as any).mock.calls[0][2]).toContain(
        '/packages/core/src/__tests__/rum/instrumentation/DdRumErrorTracking.test.tsx'
    );
    expect(baseErrorHandlerCalled).toStrictEqual(true);
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
            '_dd.error.raw': {
                name: error.name,
                message: error.message,
                stack: error.stack,
                cause: undefined
            },
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number),
        ''
    );
    expect((DdRum.addError as any).mock.calls[0][2]).toContain(
        '/packages/core/src/__tests__/rum/instrumentation/DdRumErrorTracking.test.tsx'
    );
    expect(baseErrorHandlerCalled).toStrictEqual(true);
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
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native',
            '_dd.error.raw': {
                sourceURL: './path/to/file.js',
                line: 1038,
                column: 57,
                message: 'Something bad happened',
                name: 'Error',
                cause: undefined,
                stack: 'at ./path/to/file.js:1038:57'
            }
        },
        expect.any(Number),
        ''
    );
    expect(baseErrorHandlerCalled).toStrictEqual(true);
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
            '_dd.error.raw': {
                message: 'Something bad happened',
                name: 'Error',
                stack: [
                    'doSomething() at ./path/to/file.js:67:3',
                    'nestedCall() at ./path/to/file.js:1064:9',
                    'root() at ./path/to/index.js:10:1'
                ].join(','),
                cause: undefined
            },
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number),
        ''
    );
    expect(baseErrorHandlerCalled).toStrictEqual(true);
});

it('M intercept and send a RUM event W onGlobalError() {with stack and component stack}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking();
    const is_fatal = Math.random() < 0.5;
    const error = {
        stack: [
            'example() at ./path/to/file.js:77:2',
            'test() at ./path/to/index.js:22:3'
        ],
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
        'example() at ./path/to/file.js:77:2,test() at ./path/to/index.js:22:3',
        {
            '_dd.error.raw': {
                message: 'Something bad happened',
                name: 'Error',
                stack: [
                    'example() at ./path/to/file.js:77:2',
                    'test() at ./path/to/index.js:22:3'
                ].join(','),
                componentStack: [
                    'doSomething() at ./path/to/file.js:67:3',
                    'nestedCall() at ./path/to/file.js:1064:9',
                    'root() at ./path/to/index.js:10:1'
                ],
                cause: undefined
            },
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number),
        ''
    );
    expect(baseErrorHandlerCalled).toStrictEqual(true);
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
            '_dd.error.raw': {
                name: 'Error',
                message: 'Something bad happened',
                cause: undefined,
                stack: [
                    'doSomething() at ./path/to/file.js:67:3',
                    'nestedCall() at ./path/to/file.js:1064:9',
                    'root() at ./path/to/index.js:10:1'
                ].join(',')
            },
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number),
        ''
    );
    expect(baseErrorHandlerCalled).toStrictEqual(true);
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
            '_dd.error.raw': {
                name: 'Error',
                message: 'Something bad happened',
                stack: [
                    'doSomething() at ./path/to/file.js:67:3',
                    'nestedCall() at ./path/to/file.js:1064:9',
                    'root() at ./path/to/index.js:10:1'
                ].join(','),
                cause: undefined
            },
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number),
        ''
    );
    expect(baseErrorHandlerCalled).toStrictEqual(true);
    expect(baseErrorHandlerCalled).toStrictEqual(true);
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
            '_dd.error.raw': {
                name: 'Error',
                cause: undefined,
                message: 'Something bad happened',
                stack: [
                    'doSomething() at ./path/to/file.js:67:3',
                    'nestedCall() at ./path/to/file.js:1064:9',
                    'root() at ./path/to/index.js:10:1'
                ].join(',')
            },
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number),
        ''
    );
    expect(consoleReportingErrorHandler).toBeCalledTimes(1);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
    expect(baseErrorHandlerCalled).toStrictEqual(true);
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
        expect.any(Number),
        ''
    );
    expect(baseConsoleErrorCalled).toStrictEqual(true);
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
        expect.any(Number),
        ''
    );
    expect(baseConsoleErrorCalled).toStrictEqual(true);
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
        expect.any(Number),
        ''
    );
    expect(baseConsoleErrorCalled).toStrictEqual(true);
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
        expect.any(Number),
        ''
    );
    expect(baseConsoleErrorCalled).toStrictEqual(true);
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
                : typeof message?.toString === 'function' &&
                  message.toString !== Object.prototype.toString
                ? String(message)
                : 'Unknown Error';
        expect(DdRum.addError).toHaveBeenCalledTimes(1);
        expect(DdRum.addError).toHaveBeenCalledWith(
            errorMessage,
            'CONSOLE',
            '',
            {
                '_dd.error.source_type': 'react-native'
            },
            expect.any(Number),
            ''
        );
        expect(baseConsoleErrorCalled).toStrictEqual(true);
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
            '_dd.error.raw': {
                name: error.name,
                message: error.message,
                stack: error.stack,
                cause: undefined
            },
            '_dd.error.is_crash': is_fatal,
            '_dd.error.source_type': 'react-native'
        },
        expect.any(Number),
        ''
    );
    expect((DdRum.addError as any).mock.calls[0][2]).toContain(
        '/packages/core/src/__tests__/rum/instrumentation/DdRumErrorTracking.test.tsx'
    );
    expect(baseErrorHandlerCalled).toStrictEqual(true);
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
        expect.any(Number),
        ''
    );
    expect(baseConsoleErrorCalled).toStrictEqual(true);
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

it.each(['throw', 'reject'] as const)(
    'M chain previous handlers W injected reporter %s',
    async failure => {
        const reporter = {
            addError: jest.fn(() =>
                failure === 'throw'
                    ? (() => {
                          throw Error('reporter');
                      })()
                    : Promise.reject(Error('reporter'))
            )
        };
        DdRumErrorTracking.startTracking(reporter);
        DdRumErrorTracking.onGlobalError(Error('app error'), true);
        DdRumErrorTracking.onConsoleError('console error');
        await flushPromises();
        expect(reporter.addError).toHaveBeenCalledTimes(2);
        expect(baseErrorHandlerCalled).toBe(true);
        expect(baseConsoleErrorCalled).toBe(true);
    }
);

it('M replace reporter W tracking already started without wrapping handlers twice', async () => {
    const first = { addError: jest.fn(() => Promise.resolve()) };
    const second = { addError: jest.fn(() => Promise.resolve()) };
    DdRumErrorTracking.startTracking(first);
    const handler = ErrorUtils.getGlobalHandler();
    const consoleHandler = console.error;
    DdRumErrorTracking.startTracking(second);
    expect(ErrorUtils.getGlobalHandler()).toBe(handler);
    expect(console.error).toBe(consoleHandler);
    DdRumErrorTracking.onGlobalError(Error('app error'));
    await flushPromises();
    expect(second.addError).toHaveBeenCalledTimes(1);
    expect(first.addError).not.toHaveBeenCalled();
});

it('M remain safe W ErrorUtils is unavailable', () => {
    const previous = global.ErrorUtils;
    try {
        Object.defineProperty(global, 'ErrorUtils', {
            configurable: true,
            value: undefined
        });
        expect(() => DdRumErrorTracking.startTracking()).not.toThrow();
        expect(console.error).toBe(baseConsoleError);
    } finally {
        Object.defineProperty(global, 'ErrorUtils', {
            configurable: true,
            value: previous
        });
    }
});

it('M chain previous handlers W error properties throw during encoding', async () => {
    const error = Object.defineProperty({}, 'message', {
        get: () => {
            throw Error('getter');
        }
    });
    DdRumErrorTracking.startTracking();
    DdRumErrorTracking.onGlobalError(error, true);
    DdRumErrorTracking.onConsoleError(error);
    await flushPromises();
    expect(baseErrorHandlerCalled).toBe(true);
    expect(baseConsoleErrorCalled).toBe(true);
});

describe('error-handler timing with the real crash delay', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(jsUtils, 'executeWithDelay').mockImplementation(
            jest.requireActual('../../../utils/jsUtils').executeWithDelay
        );
    });
    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    it.each(['resolve', 'reject'] as const)(
        'waits for fatal reporting to %s before starting the crash delay',
        async outcome => {
            let settle!: () => void;
            const pending = new Promise<void>((resolve, reject) => {
                settle =
                    outcome === 'resolve'
                        ? resolve
                        : () => reject(Error('native'));
            });
            const reporter = {
                addError: jest.fn().mockResolvedValue(undefined)
            };
            reporter.addError.mockReturnValueOnce(pending);
            DdRumErrorTracking.startTracking(reporter);
            DdRumErrorTracking.onGlobalError(Error('fatal'), true);

            await jest.advanceTimersByTimeAsync(250);
            expect(baseErrorHandlerCalled).toBe(false);
            console.error('while native reporting is pending');
            await jest.advanceTimersByTimeAsync(0);
            expect(baseConsoleErrorCalled).toBe(true);

            baseConsoleErrorCalled = false;
            settle();
            await jest.advanceTimersByTimeAsync(49);
            expect(baseErrorHandlerCalled).toBe(false);
            console.error('during the crash-context delay');
            await jest.advanceTimersByTimeAsync(0);
            expect(baseConsoleErrorCalled).toBe(true);
            await jest.advanceTimersByTimeAsync(1);
            expect(baseErrorHandlerCalled).toBe(true);
            expect(reporter.addError).toHaveBeenCalledTimes(3);
            expect(jest.getTimerCount()).toBe(0);
        }
    );

    it.each([false, undefined])(
        'bounds a stalled non-fatal report and preserves the crash delay: %p',
        async isFatal => {
            DdRumErrorTracking.startTracking({
                addError: () => new Promise(() => undefined)
            });
            DdRumErrorTracking.onGlobalError(Error('non-fatal'), isFatal);
            await jest.advanceTimersByTimeAsync(99);
            expect(baseErrorHandlerCalled).toBe(false);
            await jest.advanceTimersByTimeAsync(1);
            expect(baseErrorHandlerCalled).toBe(true);
            expect(jest.getTimerCount()).toBe(0);
        }
    );

    it('forwards console errors when SDK reporting never resolves', async () => {
        DdRumErrorTracking.startTracking({
            addError: () => new Promise(() => undefined)
        });
        console.error('console error');
        await jest.advanceTimersByTimeAsync(49);
        expect(baseConsoleErrorCalled).toBe(false);
        await jest.advanceTimersByTimeAsync(1);
        expect(baseConsoleErrorCalled).toBe(true);
        expect(jest.getTimerCount()).toBe(0);
    });
});
