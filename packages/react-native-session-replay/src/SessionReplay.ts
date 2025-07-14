/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { NativeSessionReplayType } from './nativeModulesTypes';
import json from '../test.json';

export enum SessionReplayPrivacy {
    MASK = 'MASK',
    ALLOW = 'ALLOW',
    MASK_USER_INPUT = 'MASK_USER_INPUT'
}

export enum ImagePrivacyLevel {
    /**
     * Only images that are bundled within the application will be recorded.
     *
     * On Android, all images larger than 100x100 dp will be masked, as we consider them non-bundled images.
     */
    MASK_NON_BUNDLED_ONLY = 'MASK_NON_BUNDLED_ONLY',
    /**
     * No images will be recorded.
     */
    MASK_ALL = 'MASK_ALL',
    /**
     * All images will be recorded, including the ones downloaded from the Internet or generated during the app runtime.
     */
    MASK_NONE = 'MASK_NONE'
}

export enum TouchPrivacyLevel {
    /**
     * Show all user touches.
     */
    SHOW = 'SHOW',
    /**
     * Hide all user touches.
     */
    HIDE = 'HIDE'
}

export enum TextAndInputPrivacyLevel {
    /**
     * Show all texts except sensitive inputs (e.g password fields).
     */
    MASK_SENSITIVE_INPUTS = 'MASK_SENSITIVE_INPUTS',
    /**
     * Mask all input fields (e.g text fields, switches, checkboxes).
     */
    MASK_ALL_INPUTS = 'MASK_ALL_INPUTS',
    /**
     * Mask all texts and inputs (e.g labels).
     */
    MASK_ALL = 'MASK_ALL'
}

/**
 * The Session Replay configuration object.
 */
export interface SessionReplayConfiguration {
    /**
     * The sampling rate for Session Replay.
     * It is applied in addition to the RUM session sample rate.
     * Range `0`-`100`.
     *
     * Default value is `20`.
     */
    replaySampleRate?: number;

    /**
     * Defines the way images should be masked (Default: `MASK_ALL`)
     */
    imagePrivacyLevel?: ImagePrivacyLevel;

    /**
     * Defines the way user touches (e.g tap) should be masked (Default: `HIDE`)
     */
    touchPrivacyLevel?: TouchPrivacyLevel;

    /**
     * Defines the way text and input (e.g text fields, checkboxes) should be masked (Default: `MASK_ALL`)
     */
    textAndInputPrivacyLevel?: TextAndInputPrivacyLevel;

    /**
     * Custom server url for sending replay data.
     */
    customEndpoint?: string;

    /**
     * Whether the recording should start automatically when the feature is enabled.
     * When `true`, the recording starts automatically.
     * when `false` it doesn't, and the recording will need to be started manually.
     * Default: `true`.
     */
    startRecordingImmediately?: boolean;

    /**
     * Defines the way sensitive content (e.g. text) should be masked.
     *
     * Default `SessionReplayPrivacy.MASK`.
     * @deprecated Use {@link imagePrivacyLevel}, {@link touchPrivacyLevel} and {@link textAndInputPrivacyLevel} instead.
     * Note: setting this property (`defaultPrivacyLevel`) will override the individual privacy levels.
     */
    defaultPrivacyLevel?: SessionReplayPrivacy;

    srData?: {
        svgs?: {
            [key: string]: { file: string; width?: string; height?: string };
        };
        styles?: { [key: string]: string };
    };
}

type InternalBaseSessionReplayConfiguration = {
    replaySampleRate: number;
    customEndpoint: string;
    startRecordingImmediately: boolean;
    srData?: {
        svgs?: {
            [key: string]: { file: string; width?: string; height?: string };
        };
        styles?: { [key: string]: string };
    };
};

type InternalPrivacySessionReplayConfiguration = {
    imagePrivacyLevel: ImagePrivacyLevel;
    touchPrivacyLevel: TouchPrivacyLevel;
    textAndInputPrivacyLevel: TextAndInputPrivacyLevel;
};

type InternalSessionReplayConfiguration = InternalBaseSessionReplayConfiguration &
    InternalPrivacySessionReplayConfiguration;

const DEFAULTS: InternalSessionReplayConfiguration & {
    defaultPrivacyLevel: SessionReplayPrivacy;
} = {
    replaySampleRate: 100,
    defaultPrivacyLevel: SessionReplayPrivacy.MASK,
    customEndpoint: '',
    imagePrivacyLevel: ImagePrivacyLevel.MASK_ALL,
    touchPrivacyLevel: TouchPrivacyLevel.HIDE,
    textAndInputPrivacyLevel: TextAndInputPrivacyLevel.MASK_ALL,
    startRecordingImmediately: true,
    srData: {}
};

export class SessionReplayWrapper {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    private nativeSessionReplay: NativeSessionReplayType = require('./specs/NativeDdSessionReplay')
        .default;

    private buildConfiguration = (
        configuration?: SessionReplayConfiguration
    ): InternalSessionReplayConfiguration => {
        if (!configuration) {
            return DEFAULTS;
        }
        const {
            replaySampleRate,
            customEndpoint,
            startRecordingImmediately
        } = configuration;

        const baseConfig: InternalBaseSessionReplayConfiguration = {
            replaySampleRate:
                replaySampleRate !== undefined
                    ? replaySampleRate
                    : DEFAULTS.replaySampleRate,
            customEndpoint:
                customEndpoint !== undefined
                    ? customEndpoint
                    : DEFAULTS.customEndpoint,
            startRecordingImmediately:
                startRecordingImmediately !== undefined
                    ? startRecordingImmediately
                    : DEFAULTS.startRecordingImmediately
        };

        const privacyConfig: InternalPrivacySessionReplayConfiguration = {
            imagePrivacyLevel:
                configuration.imagePrivacyLevel ?? DEFAULTS.imagePrivacyLevel,
            touchPrivacyLevel:
                configuration.touchPrivacyLevel ?? DEFAULTS.touchPrivacyLevel,
            textAndInputPrivacyLevel:
                configuration.textAndInputPrivacyLevel ??
                DEFAULTS.textAndInputPrivacyLevel
        };

        // Legacy Default Privacy Level property handling
        if (configuration.defaultPrivacyLevel) {
            switch (configuration.defaultPrivacyLevel) {
                case SessionReplayPrivacy.MASK:
                    privacyConfig.imagePrivacyLevel =
                        ImagePrivacyLevel.MASK_ALL;
                    privacyConfig.touchPrivacyLevel = TouchPrivacyLevel.HIDE;
                    privacyConfig.textAndInputPrivacyLevel =
                        TextAndInputPrivacyLevel.MASK_ALL;
                    break;
                case SessionReplayPrivacy.MASK_USER_INPUT:
                    privacyConfig.imagePrivacyLevel =
                        ImagePrivacyLevel.MASK_NONE;
                    privacyConfig.touchPrivacyLevel = TouchPrivacyLevel.HIDE;
                    privacyConfig.textAndInputPrivacyLevel =
                        TextAndInputPrivacyLevel.MASK_ALL_INPUTS;
                    break;
                case SessionReplayPrivacy.ALLOW:
                    privacyConfig.imagePrivacyLevel =
                        ImagePrivacyLevel.MASK_NONE;
                    privacyConfig.touchPrivacyLevel = TouchPrivacyLevel.SHOW;
                    privacyConfig.textAndInputPrivacyLevel =
                        TextAndInputPrivacyLevel.MASK_SENSITIVE_INPUTS;
                    break;
            }
        }

        // const safeRequire = (path: string) => {
        //     try {
        //         // @ts-ignore
        //         // return require(path);
        //         return require('./test.json');
        //     } catch (error) {
        //         console.log('Error loadign svg assets file: ', error);
        //         return null;
        //     }
        // };

        baseConfig.srData = {};
        // const json = safeRequire('./test');
        console.log('JSON: ', json);
        if (json) {
            baseConfig.srData.svgs = json as any;
        }

        return { ...baseConfig, ...privacyConfig };
    };

    /**
     * Enable session replay and start recording session.
     * @param configuration: The session replay configuration.
     */
    enable = (configuration?: SessionReplayConfiguration): Promise<void> => {
        const {
            replaySampleRate,
            customEndpoint,
            imagePrivacyLevel,
            touchPrivacyLevel,
            textAndInputPrivacyLevel,
            startRecordingImmediately,
            srData
        } = this.buildConfiguration(configuration);

        return this.nativeSessionReplay.enable(
            replaySampleRate,
            customEndpoint,
            imagePrivacyLevel,
            touchPrivacyLevel,
            textAndInputPrivacyLevel,
            startRecordingImmediately,
            srData
        );
    };

    /**
     * Manually start the recording of the current session.
     */
    startRecording = (): Promise<void> => {
        return this.nativeSessionReplay.startRecording();
    };

    /**
     * Manually stop the recording of the current session.
     */
    stopRecording = (): Promise<void> => {
        return this.nativeSessionReplay.stopRecording();
    };
}

export const SessionReplay = new SessionReplayWrapper();
