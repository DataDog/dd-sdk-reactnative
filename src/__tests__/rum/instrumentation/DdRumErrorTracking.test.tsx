/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
 
import { DdRumErrorTracking } from '../../../rum/instrumentation/DdRumErrorTracking'
import { DdRum } from '../../../index';

jest.useFakeTimers()

jest.mock('../../../index', () => {
    return {
        DdRum: {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            addError: jest.fn().mockImplementation(() => { 
                return new Promise( (resolve, reject) => {
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

const flushPromises = () => new Promise(setImmediate);

beforeEach(() => {
    DdRum.addError.mockClear();
    baseErrorHandlerCalled = false;
    originalErrorHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler(baseErrorHandler);
    jest.setTimeout(20000)
})

afterEach(() => {
    DdRumErrorTracking['isTracking'] = false
    ErrorUtils.setGlobalHandler(originalErrorHandler)
})


it('M intercept and send a RUM event W onError() {empty stack trace}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking()
    const error = new Error('Something bad happened');

    // WHEN
    DdRumErrorTracking.onError(error, false);
    await flushPromises();

    // THEN
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe(String(error));
    expect(DdRum.addError.mock.calls[0][1]).toBe("SOURCE");
    expect(DdRum.addError.mock.calls[0][2]).toBe("");
    expect(DdRum.addError.mock.calls[0][4]).toStrictEqual(error);
    expect(baseErrorHandlerCalled).toStrictEqual(true);
})


it('M intercept and send a RUM event W onError() {with source file info}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking()
    const error = {
      sourceURL: "./path/to/file.js",
      line: 1038,
      column: 57,
      message: "Something bad happened"
    };

    // WHEN
    DdRumErrorTracking.onError(error, false);
    await flushPromises();

    // THEN
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe(String(error));
    expect(DdRum.addError.mock.calls[0][1]).toBe("SOURCE");
    expect(DdRum.addError.mock.calls[0][2]).toBe("at ./path/to/file.js:1038:57");
    expect(DdRum.addError.mock.calls[0][4]).toStrictEqual(error);
    expect(baseErrorHandlerCalled).toStrictEqual(true);
})


it('M intercept and send a RUM event W onError() {with component stack}', async () => {
    // GIVEN
    DdRumErrorTracking.startTracking()
    const error = {
      componentStack: ["doSomething() at ./path/to/file.js:67:3", "nestedCall() at ./path/to/file.js:1064:9", "root() at ./path/to/index.js:10:1"],
      message: "Something bad happened"
    };

    // WHEN
    DdRumErrorTracking.onError(error, false);
    await flushPromises();

    // THEN
    expect(DdRum.addError.mock.calls.length).toBe(1);
    expect(DdRum.addError.mock.calls[0][0]).toBe(String(error));
    expect(DdRum.addError.mock.calls[0][1]).toBe("SOURCE");
    expect(DdRum.addError.mock.calls[0][2]).toBe("doSomething() at ./path/to/file.js:67:3,nestedCall() at ./path/to/file.js:1064:9,root() at ./path/to/index.js:10:1");
    expect(DdRum.addError.mock.calls[0][4]).toStrictEqual(error);
    expect(baseErrorHandlerCalled).toStrictEqual(true);
})

