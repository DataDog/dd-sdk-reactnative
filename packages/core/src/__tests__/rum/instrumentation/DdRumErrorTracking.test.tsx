/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRum } from '../../../index';
import { DdRumErrorTracking } from '../../../rum/instrumentation/DdRumErrorTracking';

jest.useFakeTimers();

jest.mock('../../../rum/DdRum', () => {
    return {
        DdRum: {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            addError: jest.fn().mockImplementation(() => {
                return Promise.resolve();
            })
        }
    };
});

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

const flushPromises = () => new Promise(setImmediate);

beforeEach(() => {
    DdRum.addError.mockClear();
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
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe(String(error));
    expect(DdRum.addError.mock.calls[0][1]).toBe('SOURCE');
    expect(DdRum.addError.mock.calls[0][2]).toBe(
        'doSomething() at ./path/to/file.js:67:3'
    );
    const attributes = DdRum.addError.mock.calls[0][3];
    expect(attributes['_dd.error.raw']).toStrictEqual(error);
    expect(attributes['_dd.error.is_crash']).toStrictEqual(is_fatal);
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
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe('Something bad happened');
    expect(DdRum.addError.mock.calls[0][1]).toBe('SOURCE');
    expect(DdRum.addError.mock.calls[0][2]).toBe('');
    const attributes = DdRum.addError.mock.calls[0][3];
    expect(attributes['_dd.error.raw']).toStrictEqual(error);
    expect(attributes['_dd.error.is_crash']).toStrictEqual(is_fatal);
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
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe('Something bad happened');
    expect(DdRum.addError.mock.calls[0][1]).toBe('SOURCE');
    expect(DdRum.addError.mock.calls[0][2]).toContain(
        'Error: Something bad happened'
    );
    expect(DdRum.addError.mock.calls[0][2]).toContain(
        '/packages/core/src/__tests__/rum/instrumentation/DdRumErrorTracking.test.tsx'
    );
    const attributes = DdRum.addError.mock.calls[0][3];
    expect(attributes['_dd.error.raw']).toStrictEqual(error);
    expect(attributes['_dd.error.is_crash']).toStrictEqual(is_fatal);
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
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe('Something bad happened');
    expect(DdRum.addError.mock.calls[0][1]).toBe('SOURCE');
    expect(DdRum.addError.mock.calls[0][2]).toBe(
        'at ./path/to/file.js:1038:57'
    );
    const attributes = DdRum.addError.mock.calls[0][3];
    expect(attributes['_dd.error.raw']).toStrictEqual(error);
    expect(attributes['_dd.error.is_crash']).toStrictEqual(is_fatal);
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
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe('Something bad happened');
    expect(DdRum.addError.mock.calls[0][1]).toBe('SOURCE');
    expect(DdRum.addError.mock.calls[0][2]).toBe(
        'doSomething() at ./path/to/file.js:67:3,nestedCall() at ./path/to/file.js:1064:9,root() at ./path/to/index.js:10:1'
    );
    const attributes = DdRum.addError.mock.calls[0][3];
    expect(attributes['_dd.error.raw']).toStrictEqual(error);
    expect(attributes['_dd.error.is_crash']).toStrictEqual(is_fatal);
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
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe('Something bad happened');
    expect(DdRum.addError.mock.calls[0][1]).toBe('SOURCE');
    expect(DdRum.addError.mock.calls[0][2]).toBe(
        'doSomething() at ./path/to/file.js:67:3,nestedCall() at ./path/to/file.js:1064:9,root() at ./path/to/index.js:10:1'
    );
    const attributes = DdRum.addError.mock.calls[0][3];
    expect(attributes['_dd.error.raw']).toStrictEqual(error);
    expect(attributes['_dd.error.is_crash']).toStrictEqual(is_fatal);
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
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe('Something bad happened');
    expect(DdRum.addError.mock.calls[0][1]).toBe('SOURCE');
    expect(DdRum.addError.mock.calls[0][2]).toBe(
        'doSomething() at ./path/to/file.js:67:3,nestedCall() at ./path/to/file.js:1064:9,root() at ./path/to/index.js:10:1'
    );
    const attributes = DdRum.addError.mock.calls[0][3];
    expect(attributes['_dd.error.raw']).toStrictEqual(error);
    expect(attributes['_dd.error.is_crash']).toStrictEqual(is_fatal);
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
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe('Something bad happened');
    expect(DdRum.addError.mock.calls[0][1]).toBe('SOURCE');
    expect(DdRum.addError.mock.calls[0][2]).toBe(
        'doSomething() at ./path/to/file.js:67:3,nestedCall() at ./path/to/file.js:1064:9,root() at ./path/to/index.js:10:1'
    );
    const attributes = DdRum.addError.mock.calls[0][3];
    expect(attributes['_dd.error.raw']).toStrictEqual(error);
    expect(attributes['_dd.error.is_crash']).toStrictEqual(is_fatal);
    expect(consoleReportingErrorHandler).toBeCalledTimes(1);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
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
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe(
        'Oops I did it again! Something bad happened'
    );
    expect(DdRum.addError.mock.calls[0][1]).toBe('CONSOLE');
    expect(DdRum.addError.mock.calls[0][2]).toBe(
        'at ./path/to/file.js:1038:57'
    );
    expect(DdRum.addError.mock.calls[0][3]).toBeUndefined();
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
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe(
        'Oops I did it again! Something bad happened'
    );
    expect(DdRum.addError.mock.calls[0][1]).toBe('CONSOLE');
    expect(DdRum.addError.mock.calls[0][2]).toBe(
        'doSomething() at ./path/to/file.js:67:3,nestedCall() at ./path/to/file.js:1064:9,root() at ./path/to/index.js:10:1'
    );
    expect(DdRum.addError.mock.calls[0][3]).toBeUndefined();
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
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe(message);
    expect(DdRum.addError.mock.calls[0][1]).toBe('CONSOLE');
    expect(DdRum.addError.mock.calls[0][2]).toBe('');
    expect(DdRum.addError.mock.calls[0][3]).toBeUndefined();
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
        expect(DdRum.addError.mock.calls.length).toBe(1);
        expect(DdRum.addError.mock.calls[0][0]).toBe(
            message === undefined || message === null
                ? 'Unknown Error'
                : String(message)
        );
        expect(DdRum.addError.mock.calls[0][1]).toBe('CONSOLE');
        expect(DdRum.addError.mock.calls[0][2]).toBe('');
        expect(DdRum.addError.mock.calls[0][3]).toBeUndefined();
        expect(baseConsoleErrorCalled).toStrictEqual(true);
    });
});
