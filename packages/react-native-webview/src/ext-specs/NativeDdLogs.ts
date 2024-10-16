/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * Do not import this Spec directly, use DdNativeLogsType instead.
 */
export interface Spec extends TurboModule {
    readonly getConstants: () => {};
    /**
     * Send a log with ERROR level.
     * @param message: The message to send.
     * @param context: The additional context to send.
     */
    readonly error: (message: string, context: Object) => Promise<void>;
}

// eslint-disable-next-line import/no-default-export
export default TurboModuleRegistry.get<Spec>('DdLogs');
