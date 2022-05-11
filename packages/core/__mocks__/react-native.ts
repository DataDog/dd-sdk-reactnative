/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    DdLogsType,
    DdRumType,
    DdTraceType,
    DdSdkType
} from '../src/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const actualRN = require('react-native');

actualRN.NativeModules.DdSdk = {
    initialize: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdSdkType['initialize']>,
    setUser: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdSdkType['setUser']>,
    setAttributes: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdSdkType['setAttributes']>,
    setTrackingConsent: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdSdkType['setTrackingConsent']>
};

actualRN.NativeModules.DdLogs = {
    debug: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdLogsType['debug']>,
    info: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdLogsType['info']>,
    warn: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdLogsType['warn']>,
    error: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdLogsType['error']>
};

actualRN.NativeModules.DdTrace = {
    startSpan: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdTraceType['startSpan']>,
    finishSpan: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdTraceType['finishSpan']>
};

actualRN.NativeModules.DdRum = {
    startView: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['startView']>,
    stopView: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['stopView']>,
    startAction: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['startAction']>,
    stopAction: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['stopAction']>,
    addAction: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['addAction']>,
    startResource: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['startResource']>,
    stopResource: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['stopResource']>,
    addError: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['addError']>,
    addTiming: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['addTiming']>
};

module.exports = actualRN;
