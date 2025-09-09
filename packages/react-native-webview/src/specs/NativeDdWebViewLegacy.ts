/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
    readonly getConstants: () => {};

    /**
     * Send webview telemetry logs
     * @param message event description
     */
    consumeWebviewEvent(message: string): Promise<void>;
}

export const NativeDdWebViewLegacy = TurboModuleRegistry.get<Spec>(
    'DdWebViewLegacy'
);
