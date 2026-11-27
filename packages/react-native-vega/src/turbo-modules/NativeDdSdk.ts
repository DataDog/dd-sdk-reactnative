/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { KeplerTurboModule } from '@amazon-devices/keplerscript-turbomodule-api';
import { TurboModuleRegistry } from '@amazon-devices/keplerscript-turbomodule-api';

// Kepler codegen requires Object for bridge dictionaries.
/* eslint-disable @typescript-eslint/ban-types */
export interface DdSdk extends KeplerTurboModule {
    initialize(configuration: Object): Promise<boolean>;
    setTrackingConsent(trackingConsent: string): Promise<void>;
    clearAllData(): Promise<void>;
    addAttribute(key: string, value: Object): Promise<void>;
    removeAttribute(key: string): Promise<void>;
    addAttributes(attributes: Object): Promise<void>;
    removeAttributes(keys: string[]): Promise<void>;
    setUserInfo(info: Object): Promise<void>;
    clearUserInfo(): Promise<void>;
    addUserExtraInfo(info: Object): Promise<void>;
    setAccountInfo(info: Object): Promise<void>;
    clearAccountInfo(): Promise<void>;
    addAccountExtraInfo(info: Object): Promise<void>;
    startHttpProxy(): Promise<boolean>;
    // Compatibility no-ops for shared core features unavailable on Vega.
    sendTelemetryLog(
        message: string,
        attributes: Object,
        config: Object
    ): Promise<void>;
    telemetryDebug(message: string): Promise<void>;
    telemetryError(message: string, stack: string, kind: string): Promise<void>;
    consumeWebviewEvent(message: string): Promise<void>;
    stopHttpProxy(): Promise<void>;
    httpResponse(requestId: string, statusCode: number): Promise<void>;
}

export const getNativeDdSdk = (): DdSdk | null =>
    TurboModuleRegistry.get<DdSdk>('DdSdk') ?? null;
