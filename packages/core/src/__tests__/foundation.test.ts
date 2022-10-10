/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { DdRum, DdSdk } from '../foundation';

jest.mock('../TimeProvider', () => {
    return {
        TimeProvider: jest.fn().mockImplementation(() => {
            return { now: jest.fn().mockReturnValue(456) };
        })
    };
});

describe('foundation', () => {
    describe('DdRum.stopAction', () => {
        beforeEach(() => {
            jest.clearAllMocks();
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
});
