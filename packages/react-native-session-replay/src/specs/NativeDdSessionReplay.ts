/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * Do not import this Spec directly, use NativeSessionReplayType instead.
 */
export interface Spec extends TurboModule {
    readonly getConstants: () => {};

    /**
     * Enable session replay and start recording session.
     * @param replaySampleRate: The sample rate applied for session replay.
     * @param customEndpoint: Custom server url for sending replay data.
     * @param imagePrivacyLevel: Defines the way images should be masked.
     * @param touchPrivacyLevel: Defines the way user touches should be masked.
     * @param textAndInputPrivacyLevel: Defines the way text and input should be masked.
     * @param startRecordingImmediately: Whether the recording should start automatically when the feature is enabled.
     * When `true`, the recording starts automatically; when `false` it doesn't,
     * and the recording will need to be started manually. Default: `true`.
     */
    enable(
        replaySampleRate: number,
        customEndpoint: string,
        imagePrivacyLevel: string,
        touchPrivacyLevel: string,
        textAndInputPrivacyLevel: string,
        startRecordingImmediately: boolean,
        enableHeatmaps: boolean
    ): Promise<void>;

    /**
     * Manually start the recording of the current session.
     */
    startRecording(): Promise<void>;

    /**
     * Manually stop the recording of the current session.
     */
    stopRecording(): Promise<void>;
}

// eslint-disable-next-line import/no-default-export
export default TurboModuleRegistry.get<Spec>('DdSessionReplay');
