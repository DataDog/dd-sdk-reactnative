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

type PrivacyLevel = 'MASK' | 'MASK_USER_INPUT' | 'ALLOW';

/**
 * The entry point to use Datadog's Session Replay feature.
 */
export interface NativeSessionReplayType extends NativeDdSessionReplay {
    /**
     * Enable session replay and start recording session.
     * @param replaySampleRate: The sample rate applied for session replay.
     * @param defaultPrivacyLevel: The privacy level used for replay.
     */
    enable(
        replaySampleRate: number,
        defaultPrivacyLevel: PrivacyLevel
    ): Promise<void>;
}
