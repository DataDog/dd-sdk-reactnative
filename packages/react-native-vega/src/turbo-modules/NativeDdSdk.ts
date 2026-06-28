/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { KeplerTurboModule } from '@amazon-devices/keplerscript-turbomodule-api';
import { TurboModuleRegistry } from '@amazon-devices/keplerscript-turbomodule-api';

export interface DdSdk extends KeplerTurboModule {
    initialize(configuration: Object): Promise<void>;
    addAttribute(key: string, value: Object): Promise<void>;
    removeAttribute(key: string): Promise<void>;
    addAttributes(attributes: Object): Promise<void>;
    removeAttributes(keys: string[]): Promise<void>;
    setUserInfo(user: Object): Promise<Object>;
    clearUserInfo(): Promise<void>;
    addUserExtraInfo(extraInfo: Object): Promise<Object>;
    setAccountInfo(account: Object): Promise<Object>;
    clearAccountInfo(): Promise<void>;
    addAccountExtraInfo(extraInfo: Object): Promise<Object>;
    setTrackingConsent(trackingConsent: string): Promise<void>;
    sendTelemetryLog(
        message: string,
        attributes: Object,
        config: Object
    ): Promise<void>;
    telemetryDebug(message: string): Promise<void>;
    telemetryError(
        message: string,
        stack: string,
        kind: string
    ): Promise<void>;
    consumeWebviewEvent(message: string): Promise<void>;
    clearAllData(): Promise<void>;
    httpResponse(requestId: string, statusCode: number): Promise<void>;
}

const module = TurboModuleRegistry.get<DdSdk>('DdSdk');
if (!module) {
    console.warn(
        '[Datadog] DdSdk native module not found. Verify libDatadogVega.so is loaded.'
    );
}
export default module!;
