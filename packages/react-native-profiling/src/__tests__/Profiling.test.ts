/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { DdProfiling } from '../Profiling';

beforeEach(() => {
    NativeModules.DdProfiling.enable.mockClear();
});

describe('Profiling', () => {
    describe('enable', () => {
        it('calls native profiling with default configuration', () => {
            DdProfiling.enable();

            expect(NativeModules.DdProfiling.enable).toHaveBeenCalledWith(
                5,
                5,
                ''
            );
        });

        it('calls native profiling with provided configuration', () => {
            DdProfiling.enable({
                applicationLaunchSampleRate: 100,
                continuousSampleRate: 100,
                customEndpoint: 'https://profiling.example.com'
            });

            expect(NativeModules.DdProfiling.enable).toHaveBeenCalledWith(
                100,
                100,
                'https://profiling.example.com'
            );
        });

        it('calls native profiling with edge cases in configuration', () => {
            DdProfiling.enable({
                applicationLaunchSampleRate: 0,
                continuousSampleRate: 0
            });

            expect(NativeModules.DdProfiling.enable).toHaveBeenCalledWith(
                0,
                0,
                ''
            );
        });
    });
});
