/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
 
import { DdRumErrorTracking } from '../../../rum/instrumentation/DdRumErrorTracking'
import { DdRum } from '../../../index';

jest.useFakeTimers()

jest.mock('../../../foundation', () => {
    return {
        DdRum: {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            addError: jest.fn().mockImplementation(() => {
                return new Promise((resolve, reject) => {
                    resolve()
                })
            })
        },
    };
});


let baseErrorHandlerCalled = false;
let baseErrorHandler = (error: any, isFatal?: boolean) => {
    baseErrorHandlerCalled = true
};
let originalErrorHandler = undefined;

let baseConsoleErrorCalled = false;
let baseConsoleError = (...params: unknown) => {
    baseConsoleErrorCalled = true
}
let originalConsoleError = undefined

const flushPromises = () => new Promise(setImmediate);

beforeEach(() => {
    DdRum.addError.mockClear();
    baseErrorHandlerCalled = false;
    originalErrorHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler(baseErrorHandler);
    originalConsoleError = console.error;
    console.error = baseConsoleError;
    jest.setTimeout(20000)
})

afterEach(() => {
    DdRumErrorTracking['isTracking'] = false
    ErrorUtils.setGlobalHandler(originalErrorHandler)
    console.error = originalConsoleError
})


it('M intercept and send a RUM event W onGlobalError() {empty stack trace}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking();
    const is_fatal = Math.random() < 0.5;
    const error = new Error('Something bad happened');

    // WHEN
    DdRumErrorTracking.onGlobalError(error, is_fatal);
    await flushPromises();

    // THEN
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe(String(error));
    expect(DdRum.addError.mock.calls[0][1]).toBe("SOURCE");
    expect(DdRum.addError.mock.calls[0][2]).toBe("");
    const attributes = DdRum.addError.mock.calls[0][4];
    expect(attributes["_dd.error.raw"]).toStrictEqual(error);
    expect(attributes["_dd.error.is_crash"]).toStrictEqual(is_fatal);
    expect(baseErrorHandlerCalled).toStrictEqual(true);
})


it('M intercept and send a RUM event W onGlobalError() {with source file info}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking();
    const is_fatal = Math.random() < 0.5;
    const error = {
      sourceURL: "./path/to/file.js",
      line: 1038,
      column: 57,
      message: "Something bad happened"
    };

    // WHEN
    DdRumErrorTracking.onGlobalError(error, is_fatal);
    await flushPromises();

    // THEN
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe(String(error));
    expect(DdRum.addError.mock.calls[0][1]).toBe("SOURCE");
    expect(DdRum.addError.mock.calls[0][2]).toBe("at ./path/to/file.js:1038:57");
    const attributes = DdRum.addError.mock.calls[0][4];
    expect(attributes["_dd.error.raw"]).toStrictEqual(error);
    expect(attributes["_dd.error.is_crash"]).toStrictEqual(is_fatal);
    expect(baseErrorHandlerCalled).toStrictEqual(true);
})


it('M intercept and send a RUM event W onGlobalError() {with component stack}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking();
    const is_fatal = Math.random() < 0.5;
    const error = {
      componentStack: ["doSomething() at ./path/to/file.js:67:3", "nestedCall() at ./path/to/file.js:1064:9", "root() at ./path/to/index.js:10:1"],
      message: "Something bad happened"
    };

    // WHEN
    DdRumErrorTracking.onGlobalError(error, is_fatal);
    await flushPromises();

    // THEN
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe(String(error));
    expect(DdRum.addError.mock.calls[0][1]).toBe("SOURCE");
    expect(DdRum.addError.mock.calls[0][2]).toBe("doSomething() at ./path/to/file.js:67:3,nestedCall() at ./path/to/file.js:1064:9,root() at ./path/to/index.js:10:1");
    const attributes = DdRum.addError.mock.calls[0][4];
    expect(attributes["_dd.error.raw"]).toStrictEqual(error);
    expect(attributes["_dd.error.is_crash"]).toStrictEqual(is_fatal);
    expect(baseErrorHandlerCalled).toStrictEqual(true);
})

it('M intercept and send a RUM event W onConsole() {Error with source file info}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking();
    const message= "Something bad happened";
    const error = {
      sourceURL: "./path/to/file.js",
      line: 1038,
      column: 57,
      message: message
    };

    // WHEN
    DdRumErrorTracking.onConsoleError(message, error);
    await flushPromises();

    // THEN
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe(message + " " + JSON.stringify(error));
    expect(DdRum.addError.mock.calls[0][1]).toBe("CONSOLE");
    expect(DdRum.addError.mock.calls[0][2]).toBe("at ./path/to/file.js:1038:57");
    expect(DdRum.addError.mock.calls[0][4]).toStrictEqual({})
    expect(baseConsoleErrorCalled).toStrictEqual(true);
})

it('M intercept and send a RUM event W onConsole() {Error with component stack}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking();
    const message= "Something bad happened";
    const error = {
      componentStack: ["doSomething() at ./path/to/file.js:67:3", "nestedCall() at ./path/to/file.js:1064:9", "root() at ./path/to/index.js:10:1"],
      message: "Something bad happened"
    };

    // WHEN
    DdRumErrorTracking.onConsoleError(message, error);
    await flushPromises();

    // THEN
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe(message + " " + JSON.stringify(error));
    expect(DdRum.addError.mock.calls[0][1]).toBe("CONSOLE");
    expect(DdRum.addError.mock.calls[0][2]).toBe("doSomething() at ./path/to/file.js:67:3,nestedCall() at ./path/to/file.js:1064:9,root() at ./path/to/index.js:10:1");
    expect(DdRum.addError.mock.calls[0][4]).toStrictEqual({})
    expect(baseConsoleErrorCalled).toStrictEqual(true);
})

it('M intercept and send a RUM event W onConsole() {message only}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking();
    const message= "Something bad happened";

    // WHEN
    DdRumErrorTracking.onConsoleError(message);
    await flushPromises();

    // THEN
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe(message);
    expect(DdRum.addError.mock.calls[0][1]).toBe("CONSOLE");
    expect(DdRum.addError.mock.calls[0][2]).toBe("");
    expect(DdRum.addError.mock.calls[0][4]).toStrictEqual({})
    expect(baseConsoleErrorCalled).toStrictEqual(true);
})
