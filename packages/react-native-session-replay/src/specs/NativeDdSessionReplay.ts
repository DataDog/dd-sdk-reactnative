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
     * @param defaultPrivacyLevel: The privacy level used for replay.
     * @param customEndpoint: Custom server url for sending replay data.
     */
    enable(
        replaySampleRate: number,
        defaultPrivacyLevel: string,
        customEndpoint: string
    ): Promise<void>;
}

export default TurboModuleRegistry.get<Spec>('DdSessionReplay');
