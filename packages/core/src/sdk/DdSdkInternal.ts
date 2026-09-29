/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { DdSdkNativeConfiguration } from '../config/features/CoreConfigurationNative';
import type { DdNativeSdkType } from '../nativeModulesTypes';

import type { AttributeEncoder } from './AttributesEncoding/types';

// eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
const NativeDdSdkSpec: DdNativeSdkType = require('../specs/NativeDdSdk')
    .default;

export type DdSdkType = DdNativeSdkType & {
    readonly attributeEncoders: AttributeEncoder<any>[];
};

export class DdSdkWrapper implements DdNativeSdkType {
    get attributeEncoders(): AttributeEncoder<any>[] {
        return this._attributeEncoders;
    }
    private _attributeEncoders: AttributeEncoder<any>[] = [];

    initialize(configuration: DdSdkNativeConfiguration): Promise<void> {
        this._attributeEncoders = [...configuration.attributeEncoders];
        return NativeDdSdkSpec.initialize(configuration);
    }

    getConstants() {
        return NativeDdSdkSpec.getConstants();
    }

    setUserInfo(user: object): Promise<object> {
        return NativeDdSdkSpec.setUserInfo(user);
    }

    clearUserInfo(): Promise<void> {
        return NativeDdSdkSpec.clearUserInfo();
    }

    addUserExtraInfo(extraInfo: object): Promise<object> {
        return NativeDdSdkSpec.addUserExtraInfo(extraInfo);
    }

    addAttribute(key: string, value: object): Promise<void> {
        return NativeDdSdkSpec.addAttribute(key, value);
    }
    removeAttribute(key: string): Promise<void> {
        return NativeDdSdkSpec.removeAttribute(key);
    }
    addAttributes(attributes: object): Promise<void> {
        return NativeDdSdkSpec.addAttributes(attributes);
    }
    removeAttributes(keys: string[]): Promise<void> {
        return NativeDdSdkSpec.removeAttributes(keys);
    }
    setAccountInfo(account: object): Promise<object> {
        return NativeDdSdkSpec.setAccountInfo(account);
    }
    clearAccountInfo(): Promise<void> {
        return NativeDdSdkSpec.clearAccountInfo();
    }
    addAccountExtraInfo(extraInfo: object): Promise<object> {
        return NativeDdSdkSpec.addAccountExtraInfo(extraInfo);
    }

    setTrackingConsent(trackingConsent: string): Promise<void> {
        return NativeDdSdkSpec.setTrackingConsent(trackingConsent);
    }

    sendTelemetryLog(
        message: string,
        attributes: object,
        config: object
    ): Promise<void> {
        return NativeDdSdkSpec.sendTelemetryLog(message, attributes, config);
    }

    telemetryDebug(message: string): Promise<void> {
        return NativeDdSdkSpec.telemetryDebug(message);
    }

    telemetryError(
        message: string,
        stack: string,
        kind: string
    ): Promise<void> {
        return NativeDdSdkSpec.telemetryError(message, stack, kind);
    }

    consumeWebviewEvent(message: string): Promise<void> {
        return NativeDdSdkSpec.consumeWebviewEvent(message);
    }

    clearAllData(): Promise<void> {
        return NativeDdSdkSpec.clearAllData();
    }

    addListener(eventType: string): void {
        return NativeDdSdkSpec.addListener(eventType);
    }

    removeListeners(count: number): void {
        return NativeDdSdkSpec.removeListeners(count);
    }

    _setAttributeEncodersForTesting(
        attributeEncoders: AttributeEncoder<any>[]
    ) {
        this._attributeEncoders = [...attributeEncoders];
    }
}
