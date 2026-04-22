/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { Spec as NativeDdSessionReplay } from './specs/NativeDdSessionReplay';

/**
 * In this file, native modules types extend the specs for TurboModules.
 * As we cannot use enums or classes in the specs, we override methods using them here.
 */

type ImagePrivacyLevel = 'MASK_NON_BUNDLED_ONLY' | 'MASK_ALL' | 'MASK_NONE';
type TouchPrivacyLevel = 'SHOW' | 'HIDE';
type TextAndInputPrivacyLevel =
    | 'MASK_SENSITIVE_INPUTS'
    | 'MASK_ALL_INPUTS'
    | 'MASK_ALL';

/**
 * The entry point to use Datadog's Session Replay feature.
 */
export interface NativeSessionReplayType extends NativeDdSessionReplay {
    /**
     * Enable session replay and start recording session.
     * @param replaySampleRate: The sample rate applied for session replay.
     * @param customEndpoint: Custom server url for sending replay data.
     * @param imagePrivacyLevel: Defines the way images should be masked.
     * @param touchPrivacyLevel: Defines the way user touches should be masked.
     * @param textAndInputPrivacyLevel: Defines the way text and input should be masked.
     * @param startRecordingImmediately: Whether the recording should start automatically when the feature is enabled.
     * When `true`, the recording starts automatically; when `false` it doesn't, and the recording will need
     * to be started manually. Default: `true`.
     */
    enable(
        replaySampleRate: number,
        customEndpoint: string,
        imagePrivacyLevel: ImagePrivacyLevel,
        touchPrivacyLevel: TouchPrivacyLevel,
        textAndInputPrivacyLevel: TextAndInputPrivacyLevel,
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
