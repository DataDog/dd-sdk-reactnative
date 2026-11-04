/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { DdSdkNativeConfiguration } from '../config/features/CoreConfigurationNative';
import type { DdNativeSdkType } from '../nativeModulesTypes';
import { getNativeDdSdk } from '../specs/NativeDdSdk';

import type { AttributeEncoder } from './AttributesEncoding/types';

export type DdSdkType = DdNativeSdkType & {
    readonly attributeEncoders: AttributeEncoder<any>[];
};

export class DdSdkWrapper implements DdNativeSdkType {
    get attributeEncoders(): AttributeEncoder<any>[] {
        return this._attributeEncoders;
    }
    private _attributeEncoders: AttributeEncoder<any>[] = [];

    // Resolved on use rather than at import, so importing this module is safe
    // on platforms without the native module (e.g. Vega).
    private get nativeSdk(): DdNativeSdkType {
        return getNativeDdSdk() as DdNativeSdkType;
    }

    initialize(configuration: DdSdkNativeConfiguration): Promise<void> {
        this._attributeEncoders = [...configuration.attributeEncoders];
        return this.nativeSdk.initialize(configuration);
    }

    getConstants() {
        return this.nativeSdk.getConstants();
    }

    setUserInfo(user: object): Promise<object> {
        return this.nativeSdk.setUserInfo(user);
    }

    clearUserInfo(): Promise<void> {
        return this.nativeSdk.clearUserInfo();
    }

    addUserExtraInfo(extraInfo: object): Promise<object> {
        return this.nativeSdk.addUserExtraInfo(extraInfo);
    }

    addAttribute(key: string, value: object): Promise<void> {
        return this.nativeSdk.addAttribute(key, value);
    }
    removeAttribute(key: string): Promise<void> {
        return this.nativeSdk.removeAttribute(key);
    }
    addAttributes(attributes: object): Promise<void> {
        return this.nativeSdk.addAttributes(attributes);
    }
    removeAttributes(keys: string[]): Promise<void> {
        return this.nativeSdk.removeAttributes(keys);
    }
    setAccountInfo(account: object): Promise<object> {
        return this.nativeSdk.setAccountInfo(account);
    }
    clearAccountInfo(): Promise<void> {
        return this.nativeSdk.clearAccountInfo();
    }
    addAccountExtraInfo(extraInfo: object): Promise<object> {
        return this.nativeSdk.addAccountExtraInfo(extraInfo);
    }

    setTrackingConsent(trackingConsent: string): Promise<void> {
        return this.nativeSdk.setTrackingConsent(trackingConsent);
    }

    sendTelemetryLog(
        message: string,
        attributes: object,
        config: object
    ): Promise<void> {
        return this.nativeSdk.sendTelemetryLog(message, attributes, config);
    }

    telemetryDebug(message: string): Promise<void> {
        return this.nativeSdk.telemetryDebug(message);
    }

    telemetryError(
        message: string,
        stack: string,
        kind: string
    ): Promise<void> {
        return this.nativeSdk.telemetryError(message, stack, kind);
    }

    consumeWebviewEvent(message: string): Promise<void> {
        return this.nativeSdk.consumeWebviewEvent(message);
    }

    clearAllData(): Promise<void> {
        return this.nativeSdk.clearAllData();
    }

    addListener(eventType: string): void {
        return this.nativeSdk.addListener(eventType);
    }

    removeListeners(count: number): void {
        return this.nativeSdk.removeListeners(count);
    }

    _setAttributeEncodersForTesting(
        attributeEncoders: AttributeEncoder<any>[]
    ) {
        this._attributeEncoders = [...attributeEncoders];
    }
}
