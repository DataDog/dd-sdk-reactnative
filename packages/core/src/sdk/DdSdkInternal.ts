/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { DdSdkNativeConfiguration } from '../config/features/CoreConfigurationNative';
import type { DdNativeSdkType } from '../nativeModulesTypes';

import { getNativeDdSdk } from '../specs/NativeDdSdk';
import type { AttributeEncoder } from './AttributesEncoding/types';

let cachedNativeDdSdk: DdNativeSdkType | null | undefined;
const resolveNativeDdSdk = (): DdNativeSdkType | null => {
    if (cachedNativeDdSdk === undefined) {
        cachedNativeDdSdk = getNativeDdSdk() as DdNativeSdkType | null;
    }
    return cachedNativeDdSdk;
};

// Lazily-backed handle. Resolution happens on first property access (runtime),
// never at import — so importing this module is safe on platforms without the
// native module (e.g. Vega). Methods are bound to the resolved module.
const NativeDdSdk: DdNativeSdkType = new Proxy({} as DdNativeSdkType, {
    get: (_target, prop) => {
        const resolved = resolveNativeDdSdk() as Record<string | symbol, unknown> | null;
        const value = resolved ? resolved[prop] : undefined;
        // Return the raw value without binding — TurboModule methods are stateless
        // so `this` is irrelevant, and returning the original function reference
        // preserves Jest mock-tracking in tests.
        return value;
    }
});

export type DdSdkType = {
    readonly attributeEncoders: AttributeEncoder<any>[];

    /**
     * Initializes Datadog's features.
     * @param configuration: The configuration to use.
     */
    initialize(configuration: DdSdkNativeConfiguration): Promise<void>;
};

export class DdSdkWrapper implements DdNativeSdkType {
    get attributeEncoders(): AttributeEncoder<any>[] {
        return this._attributeEncoders;
    }
    private _attributeEncoders: AttributeEncoder<any>[] = [];

    initialize(configuration: DdSdkNativeConfiguration): Promise<void> {
        this._attributeEncoders = [...configuration.attributeEncoders];
        return NativeDdSdk.initialize(configuration);
    }

    getConstants() {
        return NativeDdSdk.getConstants();
    }

    setUserInfo(user: object): Promise<object> {
        return NativeDdSdk.setUserInfo(user);
    }

    clearUserInfo(): Promise<void> {
        return NativeDdSdk.clearUserInfo();
    }

    addUserExtraInfo(extraInfo: object): Promise<object> {
        return NativeDdSdk.addUserExtraInfo(extraInfo);
    }

    addAttribute(key: string, value: object): Promise<void> {
        return NativeDdSdk.addAttribute(key, value);
    }
    removeAttribute(key: string): Promise<void> {
        return NativeDdSdk.removeAttribute(key);
    }
    addAttributes(attributes: object): Promise<void> {
        return NativeDdSdk.addAttributes(attributes);
    }
    removeAttributes(keys: string[]): Promise<void> {
        return NativeDdSdk.removeAttributes(keys);
    }
    setAccountInfo(account: object): Promise<object> {
        return NativeDdSdk.setAccountInfo(account);
    }
    clearAccountInfo(): Promise<void> {
        return NativeDdSdk.clearAccountInfo();
    }
    addAccountExtraInfo(extraInfo: object): Promise<object> {
        return NativeDdSdk.addAccountExtraInfo(extraInfo);
    }

    setTrackingConsent(trackingConsent: string): Promise<void> {
        return NativeDdSdk.setTrackingConsent(trackingConsent);
    }

    sendTelemetryLog(
        message: string,
        attributes: object,
        config: object
    ): Promise<void> {
        return NativeDdSdk.sendTelemetryLog(message, attributes, config);
    }

    telemetryDebug(message: string): Promise<void> {
        return NativeDdSdk.telemetryDebug(message);
    }

    telemetryError(
        message: string,
        stack: string,
        kind: string
    ): Promise<void> {
        return NativeDdSdk.telemetryError(message, stack, kind);
    }

    consumeWebviewEvent(message: string): Promise<void> {
        return NativeDdSdk.consumeWebviewEvent(message);
    }

    clearAllData(): Promise<void> {
        return NativeDdSdk.clearAllData();
    }

    addListener(eventType: string): void {
        return NativeDdSdk.addListener(eventType);
    }

    removeListeners(count: number): void {
        return NativeDdSdk.removeListeners(count);
    }

    _setAttributeEncodersForTesting(
        attributeEncoders: AttributeEncoder<any>[]
    ) {
        this._attributeEncoders = [...attributeEncoders];
    }
}

export { NativeDdSdk };
