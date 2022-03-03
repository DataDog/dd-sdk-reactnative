/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */


import {SdkVerbosity} from '../SdkVerbosity'
import {InternalLog} from '../InternalLog'

let baseConsoleDebugCalled = false;
let baseConsoleDebugArg = undefined;
let baseConsoleDebug = (...params: unknown) => {
    baseConsoleDebugCalled = true;
    baseConsoleDebugArg = params;
}
let originalConsoleDebug = undefined

let baseConsoleInfoCalled = false;
let baseConsoleInfoArg = undefined;
let baseConsoleInfo = (...params: unknown) => {
    baseConsoleInfoCalled = true;
    baseConsoleInfoArg = params;
}
let originalConsoleInfo = undefined

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
    baseConsoleDebugCalled = false;
    baseConsoleInfoCalled = false;
    baseConsoleWarnCalled = false;
    baseConsoleErrorCalled = false;

    baseConsoleDebugArg = undefined;
    baseConsoleInfoArg = undefined;
    baseConsoleWarnArg = undefined;
    baseConsoleErrorArg = undefined;

    originalConsoleDebug = console.debug;
    originalConsoleInfo = console.info;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;

    console.debug = baseConsoleDebug;
    console.info = baseConsoleInfo;
    console.warn = baseConsoleWarn;
    console.error = baseConsoleError;
})

afterEach(() => {
    console.debug = originalConsoleDebug
    console.info = originalConsoleInfo
    console.warn = originalConsoleWarn
    console.error = originalConsoleError
})

it('M output debug W log(debug) (DEBUG+ allowed)', async () => {
    // GIVEN
    const message = "log(debug) (DEBUG+ allowed)"
    InternalLog.verbosity = SdkVerbosity.DEBUG

    // WHEN
    InternalLog.log(message, SdkVerbosity.DEBUG)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(true);
    expect(baseConsoleInfoCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
    expect(baseConsoleDebugArg).toStrictEqual(["DATADOG: " + message]);
})

it('M output info W log(info) (DEBUG+ allowed)', async () => {
    // GIVEN
    const message = "log(info) (DEBUG+ allowed)"
    InternalLog.verbosity = SdkVerbosity.DEBUG

    // WHEN
    InternalLog.log(message, SdkVerbosity.INFO)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(false);
    expect(baseConsoleInfoCalled).toStrictEqual(true);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
    expect(baseConsoleInfoArg).toStrictEqual(["DATADOG: " + message]);
})

it('M output warn W log(warn) (DEBUG+ allowed)', async () => {
    // GIVEN
    const message = "log(warn) (DEBUG+ allowed)"
    InternalLog.verbosity = SdkVerbosity.DEBUG

    // WHEN
    InternalLog.log(message, SdkVerbosity.WARN)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(false);
    expect(baseConsoleInfoCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(true);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
    expect(baseConsoleWarnArg).toStrictEqual(["DATADOG: " + message]);
})

it('M output error W log(error) (DEBUG+ allowed)', async () => {
    // GIVEN
    const message = "log(error) (DEBUG+ allowed)"
    InternalLog.verbosity = SdkVerbosity.DEBUG

    // WHEN
    InternalLog.log(message, SdkVerbosity.ERROR)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(false);
    expect(baseConsoleInfoCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(true);
    expect(baseConsoleErrorArg).toStrictEqual(["DATADOG: " + message]);
})

it('M not output debug W log(debug) (INFO+ allowed)', async () => {
    // GIVEN
    const message = "log(debug) (INFO+ allowed)"
    InternalLog.verbosity = SdkVerbosity.INFO

    // WHEN
    InternalLog.log(message, SdkVerbosity.DEBUG)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(false);
    expect(baseConsoleInfoCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})

it('M output info W log(info) (INFO+ allowed)', async () => {
    // GIVEN
    const message = "log(info) (INFO+ allowed)"
    InternalLog.verbosity = SdkVerbosity.INFO

    // WHEN
    InternalLog.log(message, SdkVerbosity.INFO)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(false);
    expect(baseConsoleInfoCalled).toStrictEqual(true);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
    expect(baseConsoleInfoArg).toStrictEqual(["DATADOG: " + message]);
})

it('M output warn W log(warn) (INFO+ allowed)', async () => {
    // GIVEN
    const message = "log(warn) (INFO+ allowed)"
    InternalLog.verbosity = SdkVerbosity.INFO

    // WHEN
    InternalLog.log(message, SdkVerbosity.WARN)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(false);
    expect(baseConsoleInfoCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(true);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
    expect(baseConsoleWarnArg).toStrictEqual(["DATADOG: " + message]);
})

it('M output error W log(error) (INFO+ allowed)', async () => {
    // GIVEN
    const message = "log(error) (INFO+ allowed)"
    InternalLog.verbosity = SdkVerbosity.INFO

    // WHEN
    InternalLog.log(message, SdkVerbosity.ERROR)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(false);
    expect(baseConsoleInfoCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(true);
    expect(baseConsoleErrorArg).toStrictEqual(["DATADOG: " + message]);
})

it('M not output debug W log(debug) (WARN+ allowed)', async () => {
    // GIVEN
    const message = "log(debug) (WARN+ allowed)"
    InternalLog.verbosity = SdkVerbosity.WARN

    // WHEN
    InternalLog.log(message, SdkVerbosity.DEBUG)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(false);
    expect(baseConsoleInfoCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})

it('M not output info W log(info) (WARN+ allowed)', async () => {
    // GIVEN
    const message = "log(info) (WARN+ allowed)"
    InternalLog.verbosity = SdkVerbosity.WARN

    // WHEN
    InternalLog.log(message, SdkVerbosity.INFO)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(false);
    expect(baseConsoleInfoCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})

it('M output warn W log(warn) (WARN+ allowed)', async () => {
    // GIVEN
    const message = "log(warn) (WARN+ allowed)"
    InternalLog.verbosity = SdkVerbosity.WARN


    // WHEN
    InternalLog.log(message, SdkVerbosity.WARN)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(false);
    expect(baseConsoleInfoCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(true);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
    expect(baseConsoleWarnArg).toStrictEqual(["DATADOG: " + message]);
})

it('M output error W log(error) (WARN+ allowed)', async () => {
    // GIVEN
    const message = "log(error) (WARN+ allowed)"
    InternalLog.verbosity = SdkVerbosity.WARN

    // WHEN
    InternalLog.log(message, SdkVerbosity.ERROR)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(false);
    expect(baseConsoleInfoCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(true);
    expect(baseConsoleErrorArg).toStrictEqual(["DATADOG: " + message]);
})

it('M not output debug W log(debug) (ERROR+ allowed)', async () => {
    // GIVEN
    const message = "log(debug) (ERROR+ allowed)"
    InternalLog.verbosity = SdkVerbosity.ERROR

    // WHEN
    InternalLog.log(message, SdkVerbosity.DEBUG)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(false);
    expect(baseConsoleInfoCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})

it('M not output info W log(info) (ERROR+ allowed)', async () => {
    // GIVEN
    const message = "log(info) (ERROR+ allowed)"
    InternalLog.verbosity = SdkVerbosity.ERROR

    // WHEN
    InternalLog.log(message, SdkVerbosity.INFO)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(false);
    expect(baseConsoleInfoCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})

it('M not output warn W log(warn) (ERROR+ allowed)', async () => {
    // GIVEN
    const message = "log(warn) (ERROR+ allowed)"
    InternalLog.verbosity = SdkVerbosity.ERROR

    // WHEN
    InternalLog.log(message, SdkVerbosity.WARN)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(false);
    expect(baseConsoleInfoCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})

it('M output error W log(error) (ERROR+ allowed)', async () => {
    // GIVEN
    const message = "log(error) (ERROR+ allowed)"
    InternalLog.verbosity = SdkVerbosity.ERROR

    // WHEN
    InternalLog.log(message, SdkVerbosity.ERROR)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(false);
    expect(baseConsoleInfoCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(true);
    expect(baseConsoleErrorArg).toStrictEqual(["DATADOG: " + message]);
})

it('M not output debug W log(debug) (none allowed)', async () => {
    // GIVEN
    const message = "log(debug) (none allowed)"
    InternalLog.verbosity = undefined

    // WHEN
    InternalLog.log(message, SdkVerbosity.DEBUG)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(false);
    expect(baseConsoleInfoCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})

it('M not output info W log(info) (none allowed)', async () => {
    // GIVEN
    const message = "log(info) (none allowed)"
    InternalLog.verbosity = undefined

    // WHEN
    InternalLog.log(message, SdkVerbosity.INFO)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(false);
    expect(baseConsoleInfoCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})

it('M not output warn W log(warn) (none allowed)', async () => {
    // GIVEN
    const message = "log(warn) (none allowed)"
    InternalLog.verbosity = undefined

    // WHEN
    InternalLog.log(message, SdkVerbosity.WARN)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(false);
    expect(baseConsoleInfoCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})

it('M not output error W log(error) (none allowed)', async () => {
    // GIVEN
    const message = "log(error) (none allowed)"
    InternalLog.verbosity = undefined

    // WHEN
    InternalLog.log(message, SdkVerbosity.ERROR)

    // THEN
    expect(baseConsoleDebugCalled).toStrictEqual(false);
    expect(baseConsoleInfoCalled).toStrictEqual(false);
    expect(baseConsoleWarnCalled).toStrictEqual(false);
    expect(baseConsoleErrorCalled).toStrictEqual(false);
})
