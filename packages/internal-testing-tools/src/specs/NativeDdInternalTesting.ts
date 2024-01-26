/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * Do not import this Spec directly, use NativeInternalTesting instead.
 */
export interface Spec extends TurboModule {
    readonly getConstants: () => {};

    /**
     * Enable internal testing.
     *
     * On iOS, it registers a callback on core initialization to wrap it with the proxy.
     *
     * On Android, it registers a callback on feature initialization to intercept their messages.
     */
    enable(): Promise<void>;

    /**
     * Clears all test data.
     */
    clearData(): Promise<void>;

    /**
     * Get all events for a given feature.
     *
     * @param feature one of:
     * - rum
     * - tracing
     * - session replay
     * - logs (Android) / logging (iOS)
     */
    getAllEvents(feature: string): Promise<any>;
}

export default TurboModuleRegistry.get<Spec>('DdInternalTesting');
