/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { BufferSingleton } from '../DatadogProvider/Buffer/BufferSingleton';
import { DdRum } from '../foundation';

beforeEach(async () => {
    jest.clearAllMocks();
    BufferSingleton.onInitialization();
});

it('M add error source type W addError()', async () => {
    // Given
    const message = 'Oops I did it again!';
    const source = 'SOURCE';
    const stacktrace = 'doSomething() at ./path/to/file.js:67:3';
    const before = Date.now();

    // When
    DdRum.addError(message, source, stacktrace);

    // Then
    const after = Date.now();
    expect(NativeModules.DdRum.addError.mock.calls.length).toBe(1);
    expect(NativeModules.DdRum.addError.mock.calls[0][0]).toBe(message);
    expect(NativeModules.DdRum.addError.mock.calls[0][1]).toBe(source);
    expect(NativeModules.DdRum.addError.mock.calls[0][2]).toBe(stacktrace);
    expect(
        NativeModules.DdRum.addError.mock.calls[0][4]
    ).toBeGreaterThanOrEqual(before);
    expect(NativeModules.DdRum.addError.mock.calls[0][4]).toBeLessThanOrEqual(
        after
    );
    const context = NativeModules.DdRum.addError.mock.calls[0][3];
    expect(context['_dd.error.source_type']).toStrictEqual('react-native');
});

it('M add error source type W addError() {with custom attributes}', async () => {
    // Given
    const message = 'Oops I did it again!';
    const source = 'SOURCE';
    const stacktrace = 'doSomething() at ./path/to/file.js:67:3';
    const random = Math.random();
    const attributes = {
        foo: 'bar',
        spam: random
    };
    const before = Date.now();

    // When
    DdRum.addError(message, source, stacktrace, attributes);

    // Then
    const after = Date.now();
    expect(NativeModules.DdRum.addError.mock.calls.length).toBe(1);
    expect(NativeModules.DdRum.addError.mock.calls[0][0]).toBe(message);
    expect(NativeModules.DdRum.addError.mock.calls[0][1]).toBe(source);
    expect(NativeModules.DdRum.addError.mock.calls[0][2]).toBe(stacktrace);
    expect(
        NativeModules.DdRum.addError.mock.calls[0][4]
    ).toBeGreaterThanOrEqual(before);
    expect(NativeModules.DdRum.addError.mock.calls[0][4]).toBeLessThanOrEqual(
        after
    );
    const context = NativeModules.DdRum.addError.mock.calls[0][3];
    expect(context['_dd.error.source_type']).toStrictEqual('react-native');
    expect(context['foo']).toStrictEqual('bar');
    expect(context['spam']).toStrictEqual(random);
});
