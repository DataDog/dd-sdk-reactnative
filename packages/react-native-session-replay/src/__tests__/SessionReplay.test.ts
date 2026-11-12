/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import {
    ImagePrivacyLevel,
    SessionReplay,
    TextAndInputPrivacyLevel,
    TouchPrivacyLevel
} from '../SessionReplay';

function getRandomEnumValue<
    T extends { [s: string]: T[keyof T] } | ArrayLike<T[keyof T]>
>(enumObj: T): T[keyof T] {
    const values = Object.values(enumObj) as T[keyof T][]; // Get all enum values
    const randomIndex = Math.floor(Math.random() * values.length); // Generate a random index
    return values[randomIndex]; // Return the random value
}

function expectNativeEnableConfiguration(expected: {
    replaySampleRate: number;
    customEndpoint: string;
    imagePrivacyLevel: string;
    touchPrivacyLevel: string;
    textAndInputPrivacyLevel: string;
    startRecordingImmediately: boolean;
    enableHeatmaps: boolean;
    enableCompositionTreeRecording: boolean;
    androidAdaptiveCaptureSchedulingEnabled: boolean;
}): void {
    expect(NativeModules.DdSessionReplay.enable).toHaveBeenCalledWith(
        expected.replaySampleRate,
        expected.customEndpoint,
        expected.imagePrivacyLevel,
        expected.touchPrivacyLevel,
        expected.textAndInputPrivacyLevel,
        expected.startRecordingImmediately,
        expected.enableHeatmaps,
        expected.enableCompositionTreeRecording,
        expected.androidAdaptiveCaptureSchedulingEnabled
    );
}

beforeEach(() => {
    NativeModules.DdSessionReplay.enable.mockClear();
});

describe('SessionReplay', () => {
    describe('enable', () => {
        it('calls native session replay with default configuration', () => {
            SessionReplay.enable();

            expectNativeEnableConfiguration({
                replaySampleRate: 100,
                customEndpoint: '',
                imagePrivacyLevel: 'MASK_ALL',
                touchPrivacyLevel: 'HIDE',
                textAndInputPrivacyLevel: 'MASK_ALL',
                startRecordingImmediately: true,
                enableHeatmaps: false,
                enableCompositionTreeRecording: false,
                androidAdaptiveCaptureSchedulingEnabled: false
            });
        });

        it('calls native session replay with provided configuration { w custom endpoint }', () => {
            SessionReplay.enable({
                replaySampleRate: 100,
                customEndpoint: 'https://session-replay.example.com'
            });

            expectNativeEnableConfiguration({
                replaySampleRate: 100,
                customEndpoint: 'https://session-replay.example.com',
                imagePrivacyLevel: 'MASK_ALL',
                touchPrivacyLevel: 'HIDE',
                textAndInputPrivacyLevel: 'MASK_ALL',
                startRecordingImmediately: true,
                enableHeatmaps: false,
                enableCompositionTreeRecording: false,
                androidAdaptiveCaptureSchedulingEnabled: false
            });
        });

        it.each([true, false])(
            'forwards Android adaptive capture scheduling configuration (%s) to native',
            androidAdaptiveCaptureSchedulingEnabled => {
                SessionReplay.enable({
                    androidAdaptiveCaptureSchedulingEnabled
                });

                expectNativeEnableConfiguration({
                    replaySampleRate: 100,
                    customEndpoint: '',
                    imagePrivacyLevel: 'MASK_ALL',
                    touchPrivacyLevel: 'HIDE',
                    textAndInputPrivacyLevel: 'MASK_ALL',
                    startRecordingImmediately: true,
                    enableHeatmaps: false,
                    enableCompositionTreeRecording: false,
                    androidAdaptiveCaptureSchedulingEnabled
                });
            }
        );

        it.each([
            undefined,
            {},
            { androidAdaptiveCaptureSchedulingEnabled: undefined }
        ])(
            'does not retain an opt-in when the next configuration omits it (%p)',
            configuration => {
                SessionReplay.enable({
                    androidAdaptiveCaptureSchedulingEnabled: true
                });
                NativeModules.DdSessionReplay.enable.mockClear();

                SessionReplay.enable(configuration);

                expectNativeEnableConfiguration({
                    replaySampleRate: 100,
                    customEndpoint: '',
                    imagePrivacyLevel: 'MASK_ALL',
                    touchPrivacyLevel: 'HIDE',
                    textAndInputPrivacyLevel: 'MASK_ALL',
                    startRecordingImmediately: true,
                    enableHeatmaps: false,
                    enableCompositionTreeRecording: false,
                    androidAdaptiveCaptureSchedulingEnabled: false
                });
            }
        );

        it.each([true, false])(
            'preserves other options with Android adaptive capture scheduling set to %s',
            androidAdaptiveCaptureSchedulingEnabled => {
                SessionReplay.enable({
                    replaySampleRate: 37,
                    customEndpoint: 'https://session-replay.example.com',
                    imagePrivacyLevel: ImagePrivacyLevel.MASK_NONE,
                    touchPrivacyLevel: TouchPrivacyLevel.SHOW,
                    textAndInputPrivacyLevel:
                        TextAndInputPrivacyLevel.MASK_SENSITIVE_INPUTS,
                    startRecordingImmediately: false,
                    enableHeatmaps: true,
                    enableCompositionTreeRecording: true,
                    androidAdaptiveCaptureSchedulingEnabled
                });

                expectNativeEnableConfiguration({
                    replaySampleRate: 37,
                    customEndpoint: 'https://session-replay.example.com',
                    imagePrivacyLevel: 'MASK_NONE',
                    touchPrivacyLevel: 'SHOW',
                    textAndInputPrivacyLevel: 'MASK_SENSITIVE_INPUTS',
                    startRecordingImmediately: false,
                    enableHeatmaps: true,
                    enableCompositionTreeRecording: true,
                    androidAdaptiveCaptureSchedulingEnabled
                });
            }
        );

        it('forwards composition tree recording configuration to native', () => {
            SessionReplay.enable({
                enableCompositionTreeRecording: true
            });

            expectNativeEnableConfiguration({
                replaySampleRate: 100,
                customEndpoint: '',
                imagePrivacyLevel: 'MASK_ALL',
                touchPrivacyLevel: 'HIDE',
                textAndInputPrivacyLevel: 'MASK_ALL',
                startRecordingImmediately: true,
                enableHeatmaps: false,
                enableCompositionTreeRecording: true,
                androidAdaptiveCaptureSchedulingEnabled: false
            });
        });

        it('calls native session replay with provided configuration { w random privacy levels }', () => {
            const TIMES = 20;

            const image = getRandomEnumValue(ImagePrivacyLevel);
            const touch = getRandomEnumValue(TouchPrivacyLevel);
            const textAndInput = getRandomEnumValue(TextAndInputPrivacyLevel);

            for (let i = 0; i < TIMES; ++i) {
                SessionReplay.enable({
                    replaySampleRate: 100,
                    customEndpoint: 'https://session-replay.example.com',
                    imagePrivacyLevel: image,
                    touchPrivacyLevel: touch,
                    textAndInputPrivacyLevel: textAndInput
                });

                expectNativeEnableConfiguration({
                    replaySampleRate: 100,
                    customEndpoint: 'https://session-replay.example.com',
                    imagePrivacyLevel: image,
                    touchPrivacyLevel: touch,
                    textAndInputPrivacyLevel: textAndInput,
                    startRecordingImmediately: true,
                    enableHeatmaps: false,
                    enableCompositionTreeRecording: false,
                    androidAdaptiveCaptureSchedulingEnabled: false
                });
            }
        });

        it('calls native session replay with edge cases in configuration', () => {
            SessionReplay.enable({
                replaySampleRate: 0,
                customEndpoint: ''
            });

            expectNativeEnableConfiguration({
                replaySampleRate: 0,
                customEndpoint: '',
                imagePrivacyLevel: 'MASK_ALL',
                touchPrivacyLevel: 'HIDE',
                textAndInputPrivacyLevel: 'MASK_ALL',
                startRecordingImmediately: true,
                enableHeatmaps: false,
                enableCompositionTreeRecording: false,
                androidAdaptiveCaptureSchedulingEnabled: false
            });
        });
    });
});
