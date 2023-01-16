/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { DdSdk } from '../../foundation';
import { BufferSingleton } from '../../sdk/DatadogProvider/Buffer/BufferSingleton';
import { DdRum } from '../DdRum';

jest.mock('../../TimeProvider', () => {
    return {
        TimeProvider: jest.fn().mockImplementation(() => {
            return { now: jest.fn().mockReturnValue(456) };
        })
    };
});

describe('DdRum', () => {
    describe('DdRum.stopAction', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            BufferSingleton.onInitialization();
        });

        test('calls the native SDK when called with new API', async () => {
            await DdRum.stopAction('scroll', 'page', { user: 'me' }, 123);
            expect(NativeModules.DdRum.stopAction).toHaveBeenCalledWith(
                'scroll',
                'page',
                { user: 'me' },
                123
            );
        });

        test('calls the native SDK when called with new API with default values', async () => {
            await DdRum.stopAction('scroll', 'page');
            expect(NativeModules.DdRum.stopAction).toHaveBeenCalledWith(
                'scroll',
                'page',
                {},
                456
            );
        });

        test('does not call the native SDK when startAction has not been called before and using old API', async () => {
            await DdRum.stopAction({ user: 'me' }, 789);
            expect(NativeModules.DdRum.stopAction).not.toHaveBeenCalled();
            expect(DdSdk.telemetryDebug).not.toHaveBeenCalled();
        });

        test('calls the native SDK when called with old API', async () => {
            await DdRum.startAction('scroll', 'page_old_api');
            await DdRum.stopAction({ user: 'me' }, 789);
            expect(NativeModules.DdRum.stopAction).toHaveBeenCalledWith(
                'scroll',
                'page_old_api',
                { user: 'me' },
                789
            );
            expect(DdSdk.telemetryDebug).toHaveBeenCalledWith(
                'DDdRum.stopAction called with the old signature'
            );
        });

        test('calls the native SDK when called with old API with default values', async () => {
            await DdRum.startAction('scroll', 'page_old_api');
            await DdRum.stopAction();
            expect(NativeModules.DdRum.stopAction).toHaveBeenCalledWith(
                'scroll',
                'page_old_api',
                {},
                456
            );
            expect(DdSdk.telemetryDebug).toHaveBeenCalledWith(
                'DDdRum.stopAction called with the old signature'
            );
        });

        test('cleans the action data when stopAction is called', async () => {
            await DdRum.startAction('scroll', 'page_old_api');
            await DdRum.stopAction();
            await DdRum.stopAction();
            expect(NativeModules.DdRum.stopAction).toHaveBeenCalledTimes(1);
        });
    });

    describe('DdRumWrapper', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            BufferSingleton.onInitialization();
        });

        it('M add error source type W addError()', async () => {
            // Given
            const message = 'Oops I did it again!';
            const source = 'SOURCE';
            const stacktrace = 'doSomething() at ./path/to/file.js:67:3';

            // When
            DdRum.addError(message, source, stacktrace);

            // Then
            expect(NativeModules.DdRum.addError.mock.calls.length).toBe(1);
            expect(NativeModules.DdRum.addError.mock.calls[0][0]).toBe(message);
            expect(NativeModules.DdRum.addError.mock.calls[0][1]).toBe(source);
            expect(NativeModules.DdRum.addError.mock.calls[0][2]).toBe(
                stacktrace
            );
            const context = NativeModules.DdRum.addError.mock.calls[0][3];
            expect(context['_dd.error.source_type']).toStrictEqual(
                'react-native'
            );
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

            // When
            DdRum.addError(message, source, stacktrace, attributes);

            // Then
            expect(NativeModules.DdRum.addError.mock.calls.length).toBe(1);
            expect(NativeModules.DdRum.addError.mock.calls[0][0]).toBe(message);
            expect(NativeModules.DdRum.addError.mock.calls[0][1]).toBe(source);
            expect(NativeModules.DdRum.addError.mock.calls[0][2]).toBe(
                stacktrace
            );
            const context = NativeModules.DdRum.addError.mock.calls[0][3];
            expect(context['_dd.error.source_type']).toStrictEqual(
                'react-native'
            );
            expect(context['foo']).toStrictEqual('bar');
            expect(context['spam']).toStrictEqual(random);
        });
    });
});
