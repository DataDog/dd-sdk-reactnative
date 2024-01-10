/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { NativeSessionReplayType } from './nativeModulesTypes';

export enum SessionReplayPrivacy {
    MASK = 'MASK',
    ALLOW = 'ALLOW',
    MASK_USER_INPUT = 'MASK_USER_INPUT'
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
     * Defines the way sensitive content (e.g. text) should be masked.
     *
     * Default `SessionReplayPrivacy.MASK`.
     */
    defaultPrivacyLevel?: SessionReplayPrivacy;
}

const DEFAULTS = {
    replaySampleRate: 0,
    defaultPrivacyLevel: SessionReplayPrivacy.MASK
};

export class SessionReplayWrapper {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    private nativeSessionReplay: NativeSessionReplayType = require('./specs/NativeDdSessionReplay')
        .default;

    private buildConfiguration = (
        configuration?: SessionReplayConfiguration
    ): {
        replaySampleRate: number;
        defaultPrivacyLevel: SessionReplayPrivacy;
    } => {
        if (!configuration) {
            return DEFAULTS;
        }
        const { replaySampleRate, defaultPrivacyLevel } = configuration;
        return {
            replaySampleRate:
                replaySampleRate !== undefined
                    ? replaySampleRate
                    : DEFAULTS.replaySampleRate,
            defaultPrivacyLevel:
                defaultPrivacyLevel !== undefined
                    ? defaultPrivacyLevel
                    : DEFAULTS.defaultPrivacyLevel
        };
    };

    /**
     * Enable session replay and start recording session.
     * @param configuration: The session replay configuration.
     */
    enable = (configuration?: SessionReplayConfiguration): Promise<void> => {
        const {
            replaySampleRate,
            defaultPrivacyLevel
        } = this.buildConfiguration(configuration);

        return this.nativeSessionReplay.enable(
            replaySampleRate,
            defaultPrivacyLevel
        );
    };
}

export const SessionReplay = new SessionReplayWrapper();
