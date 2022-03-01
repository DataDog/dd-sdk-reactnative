/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */


import {SdkVerbosity} from '../SdkVerbosity'
import {InternalLog} from '../InternalLog'

let baseConsoleLogCalled = false;
let baseConsoleLogArg = undefined;
let baseConsoleLog = (...params: unknown) => {
    baseConsoleLogCalled = true;
    baseConsoleLogArg = params;
}
let originalConsoleLog = undefined

let baseConsoleWarnCalled = false;
let baseConsoleWarnArg = undefined;
let baseConsoleWarn = (...params: unknown) => {
    baseConsoleWarnCalled = true;
    baseConsoleWarnArg = params;
}
let originalConsoleWarn = undefined

let baseConsoleErrorCalled = false;
let baseConsoleErrorArg = undefined;
let baseConsoleError = (...params: unknown) => {
    baseConsoleErrorCalled = true;
    baseConsoleErrorArg = params;
}
let originalConsoleError = undefined


beforeEach(() => {
    baseConsoleLogCalled = false;
    baseConsoleWarnCalled = false;
    baseConsoleErrorCalled = false;

    baseConsoleLogArg = undefined;
    baseConsoleWarnArg = undefined;
    baseConsoleErrorArg = undefined;

    originalConsoleLog = console.log;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;

    console.log = baseConsoleLog;
    console.warn = baseConsoleWarn;
    console.error = baseConsoleError;

    jest.setTimeout(20000)
})

afterEach(() => {
    console.log = originalConsoleLog
    console.warn = originalConsoleWarn
    console.error = originalConsoleError
})

it('M output debug W log(debug) (DEBUG+ allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = SdkVerbosity.DEBUG

    // WHEN
    await InternalLog.log(message, SdkVerbosity.DEBUG)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(true);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
    expect(baseConsoleLogArg).toStrictEqual(["DATADOG: " + message]);
})

it('M output info W log(info) (DEBUG+ allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = SdkVerbosity.DEBUG

    // WHEN
    await InternalLog.log(message, SdkVerbosity.INFO)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(true);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
    expect(baseConsoleLogArg).toStrictEqual(["DATADOG: " + message]);
})

it('M output warn W log(warn) (DEBUG+ allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = SdkVerbosity.DEBUG

    // WHEN
    await InternalLog.log(message, SdkVerbosity.WARN)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(true);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
    expect(baseConsoleWarnArg).toStrictEqual(["DATADOG: " + message]);
})

it('M output error W log(error) (DEBUG+ allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = SdkVerbosity.DEBUG

    // WHEN
    await InternalLog.log(message, SdkVerbosity.ERROR)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(true);
    expect(baseConsoleErrorArg).toStrictEqual(["DATADOG: " + message]);
})

it('M not output debug W log(debug) (INFO+ allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = SdkVerbosity.INFO

    // WHEN
    await InternalLog.log(message, SdkVerbosity.DEBUG)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})

it('M output info W log(info) (INFO+ allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = SdkVerbosity.INFO

    // WHEN
    await InternalLog.log(message, SdkVerbosity.INFO)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(true);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
    expect(baseConsoleLogArg).toStrictEqual(["DATADOG: " + message]);
})

it('M output warn W log(warn) (INFO+ allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = SdkVerbosity.INFO

    // WHEN
    await InternalLog.log(message, SdkVerbosity.WARN)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(true);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
    expect(baseConsoleWarnArg).toStrictEqual(["DATADOG: " + message]);
})

it('M output error W log(error) (INFO+ allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = SdkVerbosity.INFO

    // WHEN
    await InternalLog.log(message, SdkVerbosity.ERROR)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(true);
    expect(baseConsoleErrorArg).toStrictEqual(["DATADOG: " + message]);
})

it('M not output debug W log(debug) (WARN+ allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = SdkVerbosity.WARN

    // WHEN
    await InternalLog.log(message, SdkVerbosity.DEBUG)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})

it('M not output info W log(info) (WARN+ allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = SdkVerbosity.WARN

    // WHEN
    await InternalLog.log(message, SdkVerbosity.INFO)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})

it('M output warn W log(warn) (WARN+ allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = SdkVerbosity.DEBUG


    // WHEN
    await InternalLog.log(message, SdkVerbosity.WARN)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(true);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
    expect(baseConsoleWarnArg).toStrictEqual(["DATADOG: " + message]);
})

it('M output error W log(error) (WARN+ allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = SdkVerbosity.DEBUG

    // WHEN
    await InternalLog.log(message, SdkVerbosity.ERROR)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(true);
    expect(baseConsoleErrorArg).toStrictEqual(["DATADOG: " + message]);
})

it('M not output debug W log(debug) (ERROR+ allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = SdkVerbosity.ERROR

    // WHEN
    await InternalLog.log(message, SdkVerbosity.DEBUG)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})

it('M not output info W log(info) (ERROR+ allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = SdkVerbosity.ERROR

    // WHEN
    await InternalLog.log(message, SdkVerbosity.INFO)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})

it('M not output warn W log(warn) (ERROR+ allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = SdkVerbosity.ERROR

    // WHEN
    await InternalLog.log(message, SdkVerbosity.WARN)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})

it('M output error W log(error) (ERROR+ allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = SdkVerbosity.ERROR

    // WHEN
    await InternalLog.log(message, SdkVerbosity.ERROR)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(true);
    expect(baseConsoleErrorArg).toStrictEqual(["DATADOG: " + message]);
})

it('M not output debug W log(debug) (none allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = undefined

    // WHEN
    await InternalLog.log(message, SdkVerbosity.DEBUG)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})

it('M not output info W log(info) (ERROR+ allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = undefined

    // WHEN
    await InternalLog.log(message, SdkVerbosity.INFO)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})

it('M not output warn W log(warn) (ERROR+ allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = undefined

    // WHEN
    await InternalLog.log(message, SdkVerbosity.WARN)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})

it('M output error W log(error) (ERROR+ allowed)', async () => {
    // GIVEN
    const message = "Hello world"
    InternalLog.verbosity = undefined

    // WHEN
    await InternalLog.log(message, SdkVerbosity.ERROR)

    // THEN
    expect(baseConsoleLogCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})
